import { createError } from 'h3'
import type {
  CreditoExtratoView,
  DailyFinanceReportData,
  ExtratoCreditoDiario,
  TituloFinanceiroResumo,
  TituloPagoView,
  TituloPendenteView
} from './report-types'
import {
  getDateInFortaleza,
  isSameDateInLocal,
  normalizeText,
  parseDate,
  toNumber
} from './report-types'
import { getFinanceiroSupabaseServiceClient } from './supabase-service'

const DEFAULT_EXTRATO_TABLE = 'extrato_creditos_diarios'
const DEFAULT_TITULOS_TABLE = 'titulos_financeiros'

function getConfiguredTable(name: 'extrato' | 'titulos'): string {
  if (name === 'extrato') {
    return process.env.RELATORIO_EXTRATO_TABLE?.trim() || DEFAULT_EXTRATO_TABLE
  }

  return process.env.RELATORIO_TITULOS_TABLE?.trim() || DEFAULT_TITULOS_TABLE
}

function sanitizeDateInput(value: unknown): string {
  const raw = String(value || '').trim()
  if (!raw) return getDateInFortaleza()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parametro "data" deve estar no formato YYYY-MM-DD.'
    })
  }

  return raw
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function mapCreditoExtrato(row: ExtratoCreditoDiario): CreditoExtratoView {
  return {
    dataMovimento: row.data_movimento,
    descricao: normalizeText(row.descricao),
    documento: normalizeText(row.documento),
    banco: normalizeText(row.banco, 'Conta principal'),
    valor: toNumber(row.valor)
  }
}

function mapTituloPago(row: TituloFinanceiroResumo): TituloPagoView {
  const valorPago = Math.max(toNumber(row.valor_baixa), toNumber(row.valor_pago))
  const contaCaixaBanco = row.conta_caixa?.trim() || row.tipo_conta?.trim() || '--'

  return {
    numeroTitulo: normalizeText(row.numero_titulo),
    fornecedor: normalizeText(row.fornecedor),
    historico: normalizeText(row.historico),
    complemento: normalizeText(row.complemento),
    formaPagamento: normalizeText(row.forma_pagamento),
    contaCaixaBanco,
    dataBaixa: row.data_baixa || row.data_ultimo_pagamento,
    valorPago
  }
}

function mapTituloPendente(row: TituloFinanceiroResumo): TituloPendenteView {
  return {
    numeroTitulo: normalizeText(row.numero_titulo),
    fornecedor: normalizeText(row.fornecedor),
    situacao: normalizeText(row.situacao_titulo, 'Pendente'),
    dataVencimento: row.data_vencimento,
    valorPendente: toNumber(row.valor_pendente)
  }
}

function mapSupabaseError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback

  const generic = error as { message?: string; details?: string; hint?: string; code?: string }
  const message = generic.message?.trim()
  const details = generic.details?.trim()

  if (message && details) return `${message} ${details}`
  if (message) return message
  return fallback
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const generic = error as { code?: string; message?: string; details?: string }
  const code = (generic.code || '').trim().toUpperCase()
  if (code === '42P01' || code === 'PGRST205') return true

  const message = `${generic.message || ''} ${generic.details || ''}`.toLowerCase()
  return message.includes('could not find the table') || message.includes('schema cache')
}

export interface BuildDailyFinanceReportDataOptions {
  dataReferencia?: string
}

export async function buildDailyFinanceReportData(options: BuildDailyFinanceReportDataOptions = {}): Promise<DailyFinanceReportData> {
  const dataReferencia = sanitizeDateInput(options.dataReferencia)
  const referenceDate = parseDate(dataReferencia)

  if (!referenceDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data de referencia invalida.'
    })
  }

  const referenceDateEnd = endOfDay(referenceDate)
  const avisos: string[] = []
  const supabase = getFinanceiroSupabaseServiceClient()

  const extratoTable = getConfiguredTable('extrato')
  const titulosTable = getConfiguredTable('titulos')

  let extratoRows: ExtratoCreditoDiario[] = []

  const {
    data: extratoData,
    error: extratoError
  } = await supabase
    .from(extratoTable)
    .select('id,data_referencia,data_movimento,descricao,documento,valor,banco,created_at')
    .eq('data_referencia', dataReferencia)
    .order('data_movimento', { ascending: true })
    .order('id', { ascending: true })

  if (extratoError) {
    if (isMissingTableError(extratoError)) {
      avisos.push(`Tabela "${extratoTable}" nao encontrada. Configure o armazenamento dos creditos de extrato no Supabase.`)
    } else {
      throw createError({
        statusCode: 500,
        statusMessage: mapSupabaseError(extratoError, 'Erro ao consultar creditos do extrato.')
      })
    }
  } else {
    extratoRows = (extratoData as ExtratoCreditoDiario[]) || []
  }

  const {
    data: titulosData,
    error: titulosError
  } = await supabase
    .from(titulosTable)
    .select('id,numero_titulo,fornecedor,historico,complemento,forma_pagamento,conta_caixa,tipo_conta,situacao_titulo,data_baixa,data_ultimo_pagamento,data_vencimento,valor_pago,valor_baixa,valor_pendente')
    .order('id', { ascending: false })
    .limit(15000)

  if (titulosError) {
    if (isMissingTableError(titulosError)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${titulosTable}" nao encontrada. Configure o armazenamento dos titulos no Supabase.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: mapSupabaseError(titulosError, 'Erro ao consultar titulos financeiros.')
    })
  }

  const titulosRows = (titulosData as TituloFinanceiroResumo[]) || []

  const titulosPagosNoDia = titulosRows
    .map(mapTituloPago)
    .filter((row) => {
      if (row.valorPago <= 0) return false
      const dataBaixa = parseDate(row.dataBaixa)
      if (!dataBaixa) return false
      return isSameDateInLocal(dataBaixa, referenceDate)
    })
    .sort((a, b) => b.valorPago - a.valorPago)

  const titulosPendentesAteHoje = titulosRows
    .map(mapTituloPendente)
    .filter((row) => {
      if (row.valorPendente <= 0) return false
      const dataVencimento = parseDate(row.dataVencimento)
      if (!dataVencimento) return true
      return dataVencimento.getTime() <= referenceDateEnd.getTime()
    })
    .sort((a, b) => b.valorPendente - a.valorPendente)

  const creditosExtrato = extratoRows
    .map(mapCreditoExtrato)
    .filter((row) => row.valor > 0)

  const totalCreditosExtrato = creditosExtrato.reduce((sum, row) => sum + row.valor, 0)
  const totalTitulosPagosNoDia = titulosPagosNoDia.reduce((sum, row) => sum + row.valorPago, 0)
  const totalTitulosPendentesAteHoje = titulosPendentesAteHoje.reduce((sum, row) => sum + row.valorPendente, 0)
  const saldoDoDia = totalCreditosExtrato - totalTitulosPagosNoDia

  if (creditosExtrato.length === 0) {
    avisos.push('Nenhum credito de extrato encontrado para a data de referencia.')
  }

  if (titulosPagosNoDia.length === 0) {
    avisos.push('Nenhum titulo pago encontrado para a data de referencia.')
  }

  return {
    dataReferencia,
    geradoEmIso: new Date().toISOString(),
    creditosExtrato,
    titulosPagosNoDia,
    titulosPendentesAteHoje,
    totalCreditosExtrato,
    totalTitulosPagosNoDia,
    totalTitulosPendentesAteHoje,
    saldoDoDia,
    avisos
  }
}
