import { createError } from 'h3'
import type {
  CreditoExtratoView,
  DailyFinanceReportData,
  ExtratoCreditoDiario,
  TransferenciaSaidaView,
  TransferenciaBancariaResumo,
  TituloFinanceiroResumo,
  TituloPagoView,
  TituloPendenteView
} from './report-types'
import {
  getDateInFortaleza,
  normalizeText,
  parseDate,
  toNumber
} from './report-types'
import { getFinanceiroSupabaseServiceClient } from './supabase-service'

const DEFAULT_EXTRATO_TABLE = 'extrato_creditos_diarios'
const DEFAULT_TITULOS_TABLE = 'titulos_financeiros'
const DEFAULT_TRANSFERENCIAS_TABLE = 'transferencias_bancarias'

function getConfiguredTable(name: 'extrato' | 'titulos' | 'transferencias'): string {
  if (name === 'extrato') {
    return process.env.RELATORIO_EXTRATO_TABLE?.trim() || DEFAULT_EXTRATO_TABLE
  }

  if (name === 'transferencias') {
    return process.env.RELATORIO_TRANSFERENCIAS_TABLE?.trim() || DEFAULT_TRANSFERENCIAS_TABLE
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

function invertIsoDayMonth(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  if (month === day) return null
  const monthNum = Number(month)
  const dayNum = Number(day)
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 12) return null
  return `${year}-${day}-${month}`
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function normalizeAccountKey(value: string | null | undefined): string {
  return normalizeText(value, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\bbanco\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function isBancoAccountType(value: string | null | undefined): boolean {
  return normalizeAccountKey(value) === 'banco'
}

function resolveContaCaixaBanco(row: TituloFinanceiroResumo): string {
  return row.conta_caixa?.trim() || row.tipo_conta?.trim() || '--'
}

function matchesContaSelecionada(selectedKey: string, ...candidates: Array<string | null | undefined>): boolean {
  if (!selectedKey) return true
  return candidates.some((candidate) => {
    const candidateKey = normalizeAccountKey(candidate)
    if (!candidateKey) return false
    return candidateKey === selectedKey || candidateKey.includes(selectedKey) || selectedKey.includes(candidateKey)
  })
}

function buildAvailableContas(...groups: Array<Array<string | null | undefined>>): string[] {
  const entries = new Map<string, string>()

  for (const group of groups) {
    for (const value of group) {
      const label = String(value || '').trim().replace(/\s+/g, ' ')
      const key = normalizeAccountKey(label)
      if (!key || label === '--' || key === 'conta principal') continue

      const current = entries.get(key)
      if (!current || label.length > current.length) {
        entries.set(key, label)
      }
    }
  }

  return Array.from(entries.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
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
    id: row.id,
    numeroTitulo: normalizeText(row.numero_titulo),
    parcela: normalizeText(row.sufixo === null || row.sufixo === undefined ? null : String(row.sufixo)),
    fornecedor: normalizeText(row.fornecedor),
    historico,
    usuarioLogin: normalizeText(row.usuario_login),
    complemento: normalizeText(row.complemento),
    formaPagamento: normalizeText(row.forma_pagamento),
    contaCaixaBanco,
    dataBaixa: row.data_baixa || row.data_ultimo_pagamento,
    valorPago,
    tipoLancamento: 'titulo'
  }
}

function mapTransferenciaSaida(row: TransferenciaBancariaResumo): TransferenciaSaidaView {
  const origem = normalizeText(row.conta_origem)
  const destino = normalizeText(row.conta_destino)
  const observacao = row.observacao?.trim()

  return {
    id: `transferencia-${row.id}`,
    descricao: 'Transferencia entre contas',
    contaOrigem: origem,
    contaDestino: destino,
    observacao: observacao || '--',
    dataMovimento: row.data_movimento,
    valorTransferencia: toNumber(row.valor_transacao)
  }
}

function mapTituloPendente(row: TituloFinanceiroResumo): TituloPendenteView {
  return {
    id: row.id,
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
  periodoTitulosInicio?: string
  periodoTitulosFim?: string
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
        id: row.id,
        numeroTitulo: 'Agrupado',
        parcela: 'Total',
        fornecedor: row.fornecedor,
        historico: 'Agrupado por fornecedor',
        usuarioLogin: 'Diversos',
        complemento: '--',
        formaPagamento: row.formaPagamento,
        contaCaixaBanco: row.contaCaixaBanco,
        dataBaixa: row.dataBaixa,
        valorPago: row.valorPago,
        tipoLancamento: 'titulo'
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
  const periodoTitulosInicio = sanitizeDateInput(options.periodoTitulosInicio || options.dataReferencia)
  const periodoTitulosFim = sanitizeDateInput(options.periodoTitulosFim || options.dataReferencia)
  const contaSelecionada = sanitizeContaInput(options.contaCaixaBanco)
  const agruparPagosPorFornecedor = !!options.agruparPagosPorFornecedor
  const referenceDate = parseDate(dataReferencia)
  const periodStartDate = parseDate(periodoTitulosInicio)
  const periodEndDate = parseDate(periodoTitulosFim)

  if (!referenceDate || !periodStartDate || !periodEndDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Datas informadas sao invalidas.'
    })
  }

  if (periodStartDate.getTime() > periodEndDate.getTime()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A data inicial do periodo nao pode ser maior que a data final.'
    })
  }

  const periodStartTime = periodStartDate.getTime()
  const periodEndTime = endOfDay(periodEndDate).getTime()
  const avisos: string[] = []
  const supabase = getFinanceiroSupabaseServiceClient()

  const extratoTable = getConfiguredTable('extrato')
  const titulosTable = getConfiguredTable('titulos')
  const transferenciasTable = getConfiguredTable('transferencias')
  const loadTransferenciasByExactDate = async (dateValue: string): Promise<TransferenciaBancariaResumo[]> => {
    const {
      data,
      error
    } = await supabase
      .from(transferenciasTable)
      .select('id,data_movimento,conta_origem,conta_destino,valor_transacao,observacao,created_at')
      .eq('data_movimento', dateValue)
      .order('data_movimento', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      if (isMissingTableError(error)) {
        avisos.push(`Tabela "${transferenciasTable}" nao encontrada. Transferencias entre caixas nao serao consideradas no saldo.`)
        return []
      }

      throw createError({
        statusCode: 500,
        statusMessage: mapSupabaseError(error, 'Erro ao consultar transferencias bancarias.')
      })
    }

    return (data as TransferenciaBancariaResumo[]) || []
  }

  let extratoRows: ExtratoCreditoDiario[] = []
  let transferenciasRows: TransferenciaBancariaResumo[] = []
  let extratoContaRows: Array<{ banco: string | null }> = []
  let transferenciasContaRows: Array<{ conta_origem: string | null; conta_destino: string | null }> = []

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
    data: extratoContaData,
    error: extratoContaError
  } = await supabase
    .from(extratoTable)
    .select('banco')
    .limit(10000)

  if (!extratoContaError) {
    extratoContaRows = (extratoContaData as Array<{ banco: string | null }>) || []
  }

  if (periodoTitulosInicio === periodoTitulosFim) {
    transferenciasRows = await loadTransferenciasByExactDate(periodoTitulosInicio)
  } else {
    const {
      data: transferenciasData,
      error: transferenciasError
    } = await supabase
      .from(transferenciasTable)
      .select('id,data_movimento,conta_origem,conta_destino,valor_transacao,observacao,created_at')
      .gte('data_movimento', periodoTitulosInicio)
      .lte('data_movimento', periodoTitulosFim)
      .order('data_movimento', { ascending: true })
      .order('id', { ascending: true })

    if (transferenciasError) {
      if (isMissingTableError(transferenciasError)) {
        avisos.push(`Tabela "${transferenciasTable}" nao encontrada. Transferencias entre caixas nao serao consideradas no saldo.`)
      } else {
        throw createError({
          statusCode: 500,
          statusMessage: mapSupabaseError(transferenciasError, 'Erro ao consultar transferencias bancarias.')
        })
      }
    } else {
      transferenciasRows = (transferenciasData as TransferenciaBancariaResumo[]) || []
    }
  }

  if (transferenciasRows.length === 0 && periodoTitulosInicio === periodoTitulosFim) {
    const swappedDate = invertIsoDayMonth(periodoTitulosInicio)

    if (swappedDate) {
      const swappedRows = await loadTransferenciasByExactDate(swappedDate)
      if (swappedRows.length > 0) {
        transferenciasRows = swappedRows.map((row) => ({
          ...row,
          data_movimento: periodoTitulosInicio
        }))
      }
    }
  }

  const {
    data: transferenciasContaData,
    error: transferenciasContaError
  } = await supabase
    .from(transferenciasTable)
    .select('conta_origem,conta_destino')
    .limit(10000)

  if (!transferenciasContaError) {
    transferenciasContaRows = (transferenciasContaData as Array<{ conta_origem: string | null; conta_destino: string | null }>) || []
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

  const availableContas = buildAvailableContas(
    titulosRows
      .filter((row) => isBancoAccountType(row.tipo_conta))
      .map((row) => resolveContaCaixaBanco(row)),
    extratoContaRows.map((row) => row.banco || ''),
    transferenciasContaRows.map((row) => row.conta_origem || ''),
    contaSelecionada ? [contaSelecionada] : []
  )

  const filteredExtratoRows = contaSelecionadaKey
    ? extratoRows.filter((row) => matchesContaSelecionada(contaSelecionadaKey, row.banco))
    : extratoRows

  const filteredTitulosRows = contaSelecionadaKey
    ? titulosRows.filter((row) => matchesContaSelecionada(contaSelecionadaKey, row.conta_caixa, resolveContaCaixaBanco(row)))
    : titulosRows

  const filteredTransferenciasRows = contaSelecionadaKey
    ? transferenciasRows.filter((row) => matchesContaSelecionada(contaSelecionadaKey, row.conta_origem))
    : transferenciasRows

  let effectiveTransferenciasRows = filteredTransferenciasRows

  if (effectiveTransferenciasRows.length === 0 && periodoTitulosInicio === periodoTitulosFim) {
    const swappedDate = invertIsoDayMonth(periodoTitulosInicio)

    if (swappedDate) {
      const swappedRows = await loadTransferenciasByExactDate(swappedDate)
      const swappedFilteredRows = (contaSelecionadaKey
        ? swappedRows.filter((row) => matchesContaSelecionada(contaSelecionadaKey, row.conta_origem))
        : swappedRows)
        .map((row) => ({
          ...row,
          data_movimento: periodoTitulosInicio
        }))

      if (swappedFilteredRows.length > 0) {
        effectiveTransferenciasRows = swappedFilteredRows
      }
    }
  }

  const titulosPagosBase = filteredTitulosRows
    .map(mapTituloPago)
    .filter((row) => {
      if (row.valorPago <= 0) return false
      const dataBaixa = parseDate(row.dataBaixa)
      if (!dataBaixa) return false
      const time = dataBaixa.getTime()
      return time >= periodStartTime && time <= periodEndTime
    })
  const transferenciasNoPeriodo = effectiveTransferenciasRows
    .map(mapTransferenciaSaida)
    .filter((row) => {
      if (row.valorTransferencia <= 0) return false
      const dataMovimento = parseDate(row.dataMovimento)
      if (!dataMovimento) return false
      const time = dataMovimento.getTime()
      return time >= periodStartTime && time <= periodEndTime
    })
    .sort((a, b) => b.valorTransferencia - a.valorTransferencia)

  const titulosPagosNoDia = agruparPagosPorFornecedor
    ? aggregatePaidTitlesBySupplier(titulosPagosBase)
    : titulosPagosBase.sort((a, b) => b.valorPago - a.valorPago)

  const titulosPendentesAteHoje = filteredTitulosRows
    .map(mapTituloPendente)
    .filter((row) => {
      if (row.valorPendente <= 0) return false
      const dataVencimento = parseDate(row.dataVencimento)
      if (!dataVencimento) return true
      return dataVencimento.getTime() <= periodEndTime
    })
    .sort((a, b) => b.valorPendente - a.valorPendente)

  const creditosExtrato = filteredExtratoRows
    .map(mapCreditoExtrato)
    .filter((row) => row.valor > 0)

  const totalCreditosExtrato = creditosExtrato.reduce((sum, row) => sum + row.valor, 0)
  const totalTitulosPagosNoDia = titulosPagosNoDia.reduce((sum, row) => sum + row.valorPago, 0)
  const totalTransferenciasNoPeriodo = transferenciasNoPeriodo.reduce((sum, row) => sum + row.valorTransferencia, 0)
  const totalTitulosPendentesAteHoje = titulosPendentesAteHoje.reduce((sum, row) => sum + row.valorPendente, 0)
  const saldoDoDia = totalCreditosExtrato - totalTitulosPagosNoDia - totalTransferenciasNoPeriodo

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
        ? `Nenhum titulo pago encontrado no periodo informado para a conta ${contaSelecionada}.`
        : 'Nenhum titulo pago encontrado no periodo informado.'
    )
  }

  if (transferenciasNoPeriodo.length === 0 && contaSelecionada) {
    avisos.push(`Nenhuma transferencia entre contas encontrada no periodo informado para a conta ${contaSelecionada}.`)
  }

  return {
    dataReferencia,
    periodoTitulosInicio,
    periodoTitulosFim,
    contaSelecionada: contaSelecionada || null,
    availableContas,
    geradoEmIso: new Date().toISOString(),
    creditosExtrato,
    titulosPagosNoDia,
    transferenciasNoPeriodo,
    titulosPendentesAteHoje,
    totalCreditosExtrato,
    totalTitulosPagosNoDia,
    totalTransferenciasNoPeriodo,
    totalTitulosPendentesAteHoje,
    saldoDoDia,
    avisos
  }
}
