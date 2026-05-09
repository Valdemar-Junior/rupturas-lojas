export interface ExtratoCreditoDiario {
  id: number
  data_referencia: string
  data_movimento: string | null
  descricao: string | null
  documento: string | null
  valor: number | string | null
  banco: string | null
  created_at: string | null
}

export interface TituloFinanceiroResumo {
  id: number
  numero_titulo: string | null
  sufixo: string | number | null
  fornecedor: string | null
  historico: string | null
  origem_lancamento: string | null
  complemento: string | null
  forma_pagamento: string | null
  conta_caixa: string | null
  tipo_conta: string | null
  situacao_titulo: string | null
  data_baixa: string | null
  data_ultimo_pagamento: string | null
  data_vencimento: string | null
  valor_pago: number | string | null
  valor_baixa: number | string | null
  valor_pendente: number | string | null
  usuario_login: string | null
}

export interface CreditoExtratoView {
  dataMovimento: string | null
  descricao: string
  documento: string
  banco: string
  valor: number
}

export interface TituloPagoView {
  id: number
  numeroTitulo: string
  parcela: string
  fornecedor: string
  historico: string
  usuarioLogin: string
  complemento: string
  formaPagamento: string
  contaCaixaBanco: string
  dataBaixa: string | null
  valorPago: number
}

export interface TituloPendenteView {
  id: number
  numeroTitulo: string
  fornecedor: string
  situacao: string
  dataVencimento: string | null
  valorPendente: number
}

export interface DailyFinanceReportData {
  dataReferencia: string
  periodoTitulosInicio: string
  periodoTitulosFim: string
  contaSelecionada: string | null
  availableContas: string[]
  geradoEmIso: string
  creditosExtrato: CreditoExtratoView[]
  titulosPagosNoDia: TituloPagoView[]
  titulosPendentesAteHoje: TituloPendenteView[]
  totalCreditosExtrato: number
  totalTitulosPagosNoDia: number
  totalTitulosPendentesAteHoje: number
  saldoDoDia: number
  avisos: string[]
}

export interface DailyFinanceReportRunResult {
  data: DailyFinanceReportData
  html: string
  pdfBuffer: Buffer
  emailMessageId: string
  destinatarios: string[]
  extratoOriginalFileName: string
  extratoOriginalSizeBytes: number
}

export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' && value.trim() !== '') {
    const raw = value.trim()
    const hasDot = raw.includes('.')
    const hasComma = raw.includes(',')

    let normalized = raw
    if (hasDot && hasComma) {
      if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
        normalized = raw.replace(/\./g, '').replace(',', '.')
      } else {
        normalized = raw.replace(/,/g, '')
      }
    } else if (hasComma) {
      normalized = raw.replace(',', '.')
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const source = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  const parsed = new Date(source)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatDateBR(value: string | null | undefined): string {
  const parsed = parseDate(value)
  if (!parsed) return '--'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed)
}

export function formatDateRangeBR(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return '--'
  const startLabel = formatDateBR(start)
  const endLabel = formatDateBR(end)
  if (start && end && start === end) return startLabel
  return `${startLabel} a ${endLabel}`
}

export function normalizeText(value: string | null | undefined, fallback = '--'): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

export function getDateInFortaleza(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  return formatter.format(date)
}

export function isSameDateInLocal(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}
