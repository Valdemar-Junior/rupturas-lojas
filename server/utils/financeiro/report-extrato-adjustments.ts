import { createHash } from 'node:crypto'
import { createError } from 'h3'
import type { ExtratoCreditoDiario } from './report-types'
import { getFinanceiroSupabaseServiceClient } from './supabase-service'

const DEFAULT_EXTRATO_ADJUSTMENTS_TABLE = 'relatorio_extrato_ajustes'
const SUPABASE_PAGE_SIZE = 1000

export interface ExtratoAdjustmentRecord {
  adjustmentKey: string
  assinatura: string
  valorOriginal: number
  valorEditado: number | null
  excluido: boolean
}

export interface ExtratoAdjustmentInput {
  dataReferencia: string
  banco: string
  dataMovimento?: string | null
  descricao?: string | null
  documento?: string | null
  valorOriginal: number
  ocorrenciaIndex?: number
}

function getExtratoAdjustmentsTableName(): string {
  return process.env.RELATORIO_EXTRATO_AJUSTES_TABLE?.trim() || DEFAULT_EXTRATO_ADJUSTMENTS_TABLE
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const generic = error as { code?: string; message?: string; details?: string }
  const code = (generic.code || '').trim().toUpperCase()
  if (code === '42P01' || code === 'PGRST205') return true

  const message = `${generic.message || ''} ${generic.details || ''}`.toLowerCase()
  return message.includes('could not find the table') || message.includes('schema cache')
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback

  const generic = error as { message?: string; details?: string }
  const message = generic.message?.trim()
  const details = generic.details?.trim()

  if (message && details) return `${message} ${details}`
  if (message) return message
  return fallback
}

function normalizeTextPart(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function normalizeDatePart(value: string | null | undefined): string {
  return String(value || '').trim() || '--'
}

function normalizeMoney(value: number): string {
  return Number(value || 0).toFixed(2)
}

export function buildExtratoAdjustmentIdentity(input: ExtratoAdjustmentInput) {
  const dataReferencia = normalizeDatePart(input.dataReferencia)
  const banco = normalizeTextPart(input.banco)
  const dataMovimento = normalizeDatePart(input.dataMovimento)
  const descricao = normalizeTextPart(input.descricao)
  const documento = normalizeTextPart(input.documento)
  const valorOriginal = Number(input.valorOriginal || 0)
  const ocorrenciaIndex = Number.isInteger(input.ocorrenciaIndex) && Number(input.ocorrenciaIndex) > 0
    ? Number(input.ocorrenciaIndex)
    : 1

  const assinatura = [
    dataReferencia,
    banco,
    dataMovimento,
    descricao,
    documento,
    normalizeMoney(valorOriginal),
    String(ocorrenciaIndex)
  ].join('|')

  const adjustmentKey = createHash('sha1').update(assinatura).digest('hex')

  return {
    adjustmentKey,
    assinatura,
    ocorrenciaIndex
  }
}

export function annotateExtratoRowsWithAdjustmentKey<T extends Pick<ExtratoCreditoDiario, 'data_referencia' | 'data_movimento' | 'descricao' | 'documento' | 'valor' | 'banco'>>(
  rows: T[]
): Array<T & { adjustmentKey: string; assinatura: string; ocorrenciaIndex: number }> {
  const occurrenceMap = new Map<string, number>()

  return rows.map((row) => {
    const baseIdentity = [
      normalizeDatePart(row.data_referencia),
      normalizeTextPart(row.banco),
      normalizeDatePart(row.data_movimento),
      normalizeTextPart(row.descricao),
      normalizeTextPart(row.documento),
      normalizeMoney(Number(row.valor || 0))
    ].join('|')

    const nextIndex = (occurrenceMap.get(baseIdentity) || 0) + 1
    occurrenceMap.set(baseIdentity, nextIndex)

    const identity = buildExtratoAdjustmentIdentity({
      dataReferencia: row.data_referencia,
      banco: row.banco || '',
      dataMovimento: row.data_movimento,
      descricao: row.descricao,
      documento: row.documento,
      valorOriginal: Number(row.valor || 0),
      ocorrenciaIndex: nextIndex
    })

    return {
      ...row,
      adjustmentKey: identity.adjustmentKey,
      assinatura: identity.assinatura,
      ocorrenciaIndex: nextIndex
    }
  })
}

export async function fetchExtratoAdjustments(): Promise<Map<string, ExtratoAdjustmentRecord>> {
  const supabase = getFinanceiroSupabaseServiceClient()
  const table = getExtratoAdjustmentsTableName()
  const adjustments = new Map<string, ExtratoAdjustmentRecord>()
  let start = 0

  while (true) {
    const end = start + SUPABASE_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from(table)
      .select('adjustment_key,assinatura,valor_original,valor_editado,excluido')
      .order('updated_at', { ascending: false })
      .range(start, end)

    if (error) {
      if (isMissingTableError(error)) return adjustments

      throw createError({
        statusCode: 500,
        statusMessage: toErrorMessage(error, 'Erro ao consultar ajustes manuais do extrato.')
      })
    }

    const rows = (data as Array<{
      adjustment_key?: string | null
      assinatura?: string | null
      valor_original?: number | string | null
      valor_editado?: number | string | null
      excluido?: boolean | null
    }>) || []

    for (const row of rows) {
      const adjustmentKey = String(row.adjustment_key || '').trim()
      if (!adjustmentKey) continue

      const valorOriginal = typeof row.valor_original === 'number'
        ? row.valor_original
        : Number(String(row.valor_original || '').trim().replace(',', '.'))

      const valorEditado = row.valor_editado === null || row.valor_editado === undefined || row.valor_editado === ''
        ? null
        : typeof row.valor_editado === 'number'
          ? row.valor_editado
          : Number(String(row.valor_editado).trim().replace(',', '.'))

      adjustments.set(adjustmentKey, {
        adjustmentKey,
        assinatura: String(row.assinatura || '').trim(),
        valorOriginal: Number.isFinite(valorOriginal) ? valorOriginal : 0,
        valorEditado: Number.isFinite(Number(valorEditado)) ? Number(valorEditado) : null,
        excluido: !!row.excluido
      })
    }

    if (rows.length < SUPABASE_PAGE_SIZE) break
    start += SUPABASE_PAGE_SIZE
  }

  return adjustments
}

export async function saveExtratoAdjustment(input: {
  adjustmentKey: string
  assinatura: string
  dataReferencia: string
  banco: string
  dataMovimento?: string | null
  descricao?: string | null
  documento?: string | null
  valorOriginal: number
  valorEditado?: number | null
  excluido?: boolean
  motivo?: string | null
}) {
  const adjustmentKey = String(input.adjustmentKey || '').trim()
  const assinatura = String(input.assinatura || '').trim()
  const banco = String(input.banco || '').trim()
  const dataReferencia = String(input.dataReferencia || '').trim()

  if (!adjustmentKey || !assinatura || !banco || !dataReferencia) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identificacao do credito do extrato invalida para ajuste manual.'
    })
  }

  const valorOriginal = Number(input.valorOriginal)
  if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valor original do credito invalido para ajuste manual.'
    })
  }

  const valorEditado = input.valorEditado === null || input.valorEditado === undefined
    ? null
    : Number(input.valorEditado)

  if (valorEditado !== null && (!Number.isFinite(valorEditado) || valorEditado <= 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe um valor valido para ajustar o credito do extrato.'
    })
  }

  const supabase = getFinanceiroSupabaseServiceClient()
  const table = getExtratoAdjustmentsTableName()
  const motivo = String(input.motivo || '').trim() || null

  const { error } = await supabase
    .from(table)
    .upsert(
      {
        adjustment_key: adjustmentKey,
        assinatura,
        data_referencia: dataReferencia,
        banco,
        data_movimento: input.dataMovimento || null,
        descricao: input.descricao?.trim() || null,
        documento: input.documento?.trim() || null,
        valor_original: valorOriginal,
        valor_editado: valorEditado,
        excluido: !!input.excluido,
        motivo,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'adjustment_key'
      }
    )

  if (error) {
    if (isMissingTableError(error)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${table}" nao encontrada. Crie a tabela de ajustes do extrato antes de editar ou excluir creditos.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: toErrorMessage(error, 'Falha ao salvar o ajuste manual do extrato.')
    })
  }

  return {
    success: true,
    adjustmentKey
  }
}
