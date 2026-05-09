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

function sanitizeContaInput(value: unknown): string | undefined {
  const raw = String(value || '').trim()
  return raw || undefined
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function normalizeAccountKey(value: string | null | undefined): string {
  return normalizeText(value, '').trim().toLowerCase()
}

function isBancoAccountType(value: string | null | undefined): boolean {
  return normalizeAccountKey(value) === 'banco'
}

function resolveContaCaixaBanco(row: TituloFinanceiroResumo): string {
  return row.conta_caixa?.trim() || row.tipo_conta?.trim() || '--'
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
  const contaCaixaBanco = resolveContaCaixaBanco(row)
  const historico = row.historico?.trim() || row.origem_lancamento?.trim() || '--'

  return {
    numeroTitulo: normalizeText(row.numero_titulo),
    parcela: normalizeText(row.sufixo === null || row.sufixo === undefined ? null : String(row.sufixo)),
    fornecedor: normalizeText(row.fornecedor),
    historico,
    usuarioLogin: normalizeText(row.usuario_login),
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
  contaCaixaBanco?: string
  agruparPagosPorFornecedor?: boolean
}

function aggregatePaidTitlesBySupplier(rows: TituloPagoView[]): TituloPagoView[] {
  const grouped = new Map<string, TituloPagoView>()

  for (const row of rows) {
    const key = row.fornecedor.trim().toLowerCase()
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, {
        numeroTitulo: 'Agrupado',
        parcela: 'Total',
        fornecedor: row.fornecedor,
        historico: 'Agrupado por fornecedor',
        usuarioLogin: 'Diversos',
        complemento: '--',
        formaPagamento: row.formaPagamento,
        contaCaixaBanco: row.contaCaixaBanco,
        dataBaixa: row.dataBaixa,
        valorPago: row.valorPago
      })
      continue
    }

    existing.valorPago += row.valorPago
    if (existing.formaPagamento !== row.formaPagamento) {
      existing.formaPagamento = 'Diversos'
    }
    if (existing.contaCaixaBanco !== row.contaCaixaBanco) {
      existing.contaCaixaBanco = 'Diversas'
    }
    if (existing.usuarioLogin !== row.usuarioLogin) {
      existing.usuarioLogin = 'Diversos'
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.valorPago - a.valorPago)
}

export async function buildDailyFinanceReportData(options: BuildDailyFinanceReportDataOptions = {}): Promise<DailyFinanceReportData> {
  const dataReferencia = sanitizeDateInput(options.dataReferencia)
  const contaSelecionada = sanitizeContaInput(options.contaCaixaBanco)
  const agruparPagosPorFornecedor = !!options.agruparPagosPorFornecedor
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
    .select('id,numero_titulo,sufixo,fornecedor,historico,origem_lancamento,complemento,forma_pagamento,conta_caixa,tipo_conta,situacao_titulo,data_baixa,data_ultimo_pagamento,data_vencimento,valor_pago,valor_baixa,valor_pendente,usuario_login')
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
  const contaSelecionadaKey = normalizeAccountKey(contaSelecionada)

  const availableContas = Array.from(
    new Set(
      titulosRows
        .filter((row) => isBancoAccountType(row.tipo_conta))
        .map((row) => resolveContaCaixaBanco(row))
        .map((value) => value.trim())
        .filter((value) => value && value !== '--')
    )
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const filteredExtratoRows = contaSelecionadaKey
    ? extratoRows.filter((row) => normalizeAccountKey(row.banco) === contaSelecionadaKey)
    : extratoRows

  const filteredTitulosRows = contaSelecionadaKey
    ? titulosRows.filter((row) => normalizeAccountKey(resolveContaCaixaBanco(row)) === contaSelecionadaKey)
    : titulosRows

  const titulosPagosBase = filteredTitulosRows
    .map(mapTituloPago)
    .filter((row) => {
      if (row.valorPago <= 0) return false
      const dataBaixa = parseDate(row.dataBaixa)
      if (!dataBaixa) return false
      return isSameDateInLocal(dataBaixa, referenceDate)
    })
    .sort((a, b) => b.valorPago - a.valorPago)

  const titulosPagosNoDia = agruparPagosPorFornecedor
    ? aggregatePaidTitlesBySupplier(titulosPagosBase)
    : titulosPagosBase

  const titulosPendentesAteHoje = filteredTitulosRows
    .map(mapTituloPendente)
    .filter((row) => {
      if (row.valorPendente <= 0) return false
      const dataVencimento = parseDate(row.dataVencimento)
      if (!dataVencimento) return true
      return dataVencimento.getTime() <= referenceDateEnd.getTime()
    })
    .sort((a, b) => b.valorPendente - a.valorPendente)

  const creditosExtrato = filteredExtratoRows
    .map(mapCreditoExtrato)
    .filter((row) => row.valor > 0)

  const totalCreditosExtrato = creditosExtrato.reduce((sum, row) => sum + row.valor, 0)
  const totalTitulosPagosNoDia = titulosPagosNoDia.reduce((sum, row) => sum + row.valorPago, 0)
  const totalTitulosPendentesAteHoje = titulosPendentesAteHoje.reduce((sum, row) => sum + row.valorPendente, 0)
  const saldoDoDia = totalCreditosExtrato - totalTitulosPagosNoDia

  if (creditosExtrato.length === 0) {
    avisos.push(
      contaSelecionada
        ? `Nenhum credito de extrato encontrado para a data de referencia na conta ${contaSelecionada}.`
        : 'Nenhum credito de extrato encontrado para a data de referencia.'
    )
  }

  if (titulosPagosNoDia.length === 0) {
    avisos.push(
      contaSelecionada
        ? `Nenhum titulo pago encontrado para a data de referencia na conta ${contaSelecionada}.`
        : 'Nenhum titulo pago encontrado para a data de referencia.'
    )
  }

  return {
    dataReferencia,
    contaSelecionada: contaSelecionada || null,
    availableContas,
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
