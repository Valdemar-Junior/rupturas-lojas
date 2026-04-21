import { createError } from 'h3'
import { getFinanceiroSupabaseServiceClient } from './supabase-service'

const DEFAULT_EXTRATO_FILE_TABLE = 'extrato_arquivos_diarios'

interface ExtratoFileRow {
  data_referencia: string
  banco: string | null
  arquivo_nome: string | null
  arquivo_mime_type: string | null
  arquivo_base64: string | null
  tamanho_bytes: number | null
  updated_at: string | null
}

export interface StoredExtratoPdf {
  dataReferencia: string
  banco: string | null
  fileName: string
  mimeType: string
  buffer: Buffer
}

export interface StoredExtratoPdfMeta {
  dataReferencia: string
  banco: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  updatedAt: string | null
}

function getExtratoFileTableName(): string {
  return process.env.RELATORIO_EXTRATO_FILE_TABLE?.trim() || DEFAULT_EXTRATO_FILE_TABLE
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const typed = error as { code?: string; message?: string; details?: string }
  const code = (typed.code || '').trim().toUpperCase()
  if (code === '42P01' || code === 'PGRST205') return true

  const message = `${typed.message || ''} ${typed.details || ''}`.toLowerCase()
  return message.includes('could not find the table') || message.includes('schema cache')
}

function mapSupabaseError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const generic = error as { message?: string; details?: string }
  const message = generic.message?.trim()
  const details = generic.details?.trim()

  if (message && details) return `${message} ${details}`
  if (message) return message
  return fallback
}

function sanitizeFileName(value: string | undefined, dataReferencia: string): string {
  const fallback = `extrato_bancario_${dataReferencia.replace(/-/g, '')}.pdf`
  const raw = (value || '').trim()
  if (!raw) return fallback

  const sanitized = raw.replace(/[\\/:*?"<>|]+/g, '_')
  return sanitized || fallback
}

export async function saveExtratoOriginalPdf(options: {
  dataReferencia: string
  banco?: string
  fileName?: string
  mimeType?: string
  fileBuffer: Buffer
}): Promise<void> {
  if (!options.fileBuffer || options.fileBuffer.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Arquivo do extrato vazio para armazenamento.'
    })
  }

  const table = getExtratoFileTableName()
  const supabase = getFinanceiroSupabaseServiceClient()

  const payload = {
    data_referencia: options.dataReferencia,
    banco: options.banco?.trim() || null,
    arquivo_nome: sanitizeFileName(options.fileName, options.dataReferencia),
    arquivo_mime_type: options.mimeType?.trim() || 'application/pdf',
    arquivo_base64: options.fileBuffer.toString('base64'),
    tamanho_bytes: options.fileBuffer.length,
    updated_at: new Date().toISOString()
  }

  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('data_referencia', options.dataReferencia)

  if (deleteError) {
    if (isMissingTableError(deleteError)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${table}" nao encontrada. Rode a migration da tabela de arquivos de extrato.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: mapSupabaseError(deleteError, 'Erro ao limpar PDF antigo do extrato.')
    })
  }

  const { error } = await supabase
    .from(table)
    .insert(payload)

  if (error) {
    if (isMissingTableError(error)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${table}" nao encontrada. Rode a migration da tabela de arquivos de extrato.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: mapSupabaseError(error, 'Erro ao salvar PDF original do extrato.')
    })
  }
}

export async function getExtratoOriginalPdfByDate(dataReferencia: string): Promise<StoredExtratoPdf | null> {
  const table = getExtratoFileTableName()
  const supabase = getFinanceiroSupabaseServiceClient()

  const { data, error } = await supabase
    .from(table)
    .select('data_referencia,banco,arquivo_nome,arquivo_mime_type,arquivo_base64,tamanho_bytes,updated_at')
    .eq('data_referencia', dataReferencia)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)

  if (error) {
    if (isMissingTableError(error)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${table}" nao encontrada. Rode a migration da tabela de arquivos de extrato.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: mapSupabaseError(error, 'Erro ao consultar PDF original do extrato.')
    })
  }

  const row = ((data as ExtratoFileRow[]) || [])[0]
  if (!row?.arquivo_base64) return null

  let buffer: Buffer
  try {
    buffer = Buffer.from(row.arquivo_base64, 'base64')
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Arquivo do extrato salvo com base64 invalido.'
    })
  }

  if (!buffer || buffer.length === 0) return null

  return {
    dataReferencia: row.data_referencia,
    banco: row.banco,
    fileName: sanitizeFileName(row.arquivo_nome || undefined, row.data_referencia),
    mimeType: row.arquivo_mime_type?.trim() || 'application/pdf',
    buffer
  }
}

export async function getLatestExtratoOriginalPdfMeta(): Promise<StoredExtratoPdfMeta | null> {
  const table = getExtratoFileTableName()
  const supabase = getFinanceiroSupabaseServiceClient()

  const { data, error } = await supabase
    .from(table)
    .select('data_referencia,banco,arquivo_nome,arquivo_mime_type,tamanho_bytes,updated_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)

  if (error) {
    if (isMissingTableError(error)) return null
    throw createError({
      statusCode: 500,
      statusMessage: mapSupabaseError(error, 'Erro ao consultar ultimo extrato salvo.')
    })
  }

  const row = ((data as ExtratoFileRow[]) || [])[0]
  if (!row) return null

  return {
    dataReferencia: row.data_referencia,
    banco: row.banco,
    fileName: sanitizeFileName(row.arquivo_nome || undefined, row.data_referencia),
    mimeType: row.arquivo_mime_type?.trim() || 'application/pdf',
    sizeBytes: Number(row.tamanho_bytes || 0),
    updatedAt: row.updated_at || null
  }
}
