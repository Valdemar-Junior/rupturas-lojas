import { computed, reactive, ref, watch } from 'vue'
import type { TituloFinanceiro } from '~/types/supabase'

type NumericLike = number | string | null | undefined

export type FinanceStatus = 'pago' | 'pendente' | 'vencido' | 'parcial'

export type FinanceDateField =
  | 'data_emissao'
  | 'data_vencimento'
  | 'data_baixa'
  | 'data_ultimo_pagamento'

export type FinanceQuickPeriod =
  | 'todos'
  | 'hoje'
  | 'ontem'
  | 'ultimos_7_dias'
  | 'mes_atual'
  | 'mes_anterior'
  | 'ano_atual'
  | 'personalizado'

export type FinanceSortKey =
  | 'status_resolvido'
  | 'numero_titulo'
  | 'sufixo'
  | 'fornecedor'
  | 'historico'
  | 'complemento'
  | 'valor_nominal'
  | 'valor_pago'
  | 'valor_pendente'
  | 'data_emissao'
  | 'data_vencimento'
  | 'data_ultimo_pagamento'
  | 'data_baixa'
  | 'forma_pagamento'
  | 'conta_caixa'
  | 'tipo_conta'
  | 'usuario_baixa'
  | 'tipo_movimento'
  | 'origem_lancamento'

export interface FinanceSortState {
  key: FinanceSortKey
  order: 'asc' | 'desc'
}

export interface FinanceFiltersState {
  search: string
  dateField: FinanceDateField
  quickPeriod: FinanceQuickPeriod
  startDate: string | null
  endDate: string | null
  situacao: 'todos' | FinanceStatus
  fornecedor: string
  historico: string
  usuarioNome: string
  usuarioLogin: string
  contaCaixa: string
  tipoConta: string
  formaPagamento: string
  tipoMovimento: string
}

export interface FinanceFilterOptions {
  fornecedores: string[]
  historicos: string[]
  usuariosNome: string[]
  usuariosLogin: string[]
  contasCaixa: string[]
  tiposConta: string[]
  formasPagamento: string[]
  tiposMovimento: string[]
}

export interface TituloFinanceiroView extends TituloFinanceiro {
  status_resolvido: FinanceStatus
  status_label: string
  usuario_baixa: string
  valor_referencia: number
  is_vencido: boolean
}

export interface FinanceKpis {
  totalPago: number
  totalPendente: number
  totalNominal: number
  quantidadeTitulos: number
  titulosPagos: number
  titulosPendentes: number
  maiorDespesa: number
  mediaPorTitulo: number
}

export interface RankingItem {
  label: string
  total: number
  count: number
  percentage: number
}

export interface FinanceAlertCard {
  title: string
  value: string
  description: string
  tone: 'green' | 'amber' | 'red' | 'cyan' | 'slate'
}

export interface FinanceChartPoint {
  label: string
  total: number
}

export interface FinanceDailyPoint {
  date: string
  total: number
}

export interface FinanceMonthlyPoint {
  month: string
  pago: number
  pendente: number
  nominal: number
}

function toNumber(value: NumericLike): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatInputDate(date: Date | null): string | null {
  if (!date) return null
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseInputDate(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const source = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  const parsed = new Date(source)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(date: Date): Date {
  const clone = new Date(date)
  clone.setHours(0, 0, 0, 0)
  return clone
}

function endOfDay(date: Date): Date {
  const clone = new Date(date)
  clone.setHours(23, 59, 59, 999)
  return clone
}

function getPeriodRange(period: FinanceQuickPeriod) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  switch (period) {
    case 'hoje':
      return { start: todayStart, end: todayEnd }
    case 'ontem': {
      const yesterday = new Date(todayStart)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
    }
    case 'ultimos_7_dias': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 6)
      return { start, end: todayEnd }
    }
    case 'mes_atual': {
      const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
      return { start, end: todayEnd }
    }
    case 'mes_anterior': {
      const year = todayStart.getMonth() === 0 ? todayStart.getFullYear() - 1 : todayStart.getFullYear()
      const month = todayStart.getMonth() === 0 ? 11 : todayStart.getMonth() - 1
      const start = new Date(year, month, 1)
      const end = endOfDay(new Date(year, month + 1, 0))
      return { start, end }
    }
    case 'ano_atual': {
      const start = new Date(todayStart.getFullYear(), 0, 1)
      return { start, end: todayEnd }
    }
    default:
      return { start: null as Date | null, end: null as Date | null }
  }
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() || ''
}

function normalizeSearch(value: string | null | undefined): string {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getStatusLabel(status: FinanceStatus): string {
  if (status === 'pago') return 'Pago'
  if (status === 'vencido') return 'Vencido'
  if (status === 'parcial') return 'Parcial'
  return 'Pendente'
}

function getPaymentAmount(row: TituloFinanceiro): number {
  const baixa = toNumber(row.valor_baixa)
  if (baixa > 0) return baixa
  return toNumber(row.valor_pago)
}

function getExpenseAmount(row: TituloFinanceiro): number {
  const payment = getPaymentAmount(row)
  if (payment > 0) return payment
  return toNumber(row.valor_nominal)
}

function resolveFinanceStatus(row: TituloFinanceiro): FinanceStatus {
  const paid = toNumber(row.valor_pago)
  const pending = toNumber(row.valor_pendente)
  const situacao = normalizeSearch(row.situacao_titulo)
  const vencimento = parseDate(row.data_vencimento)
  const today = startOfDay(new Date())

  if (situacao.includes('parcial') || (paid > 0 && pending > 0)) return 'parcial'

  if (pending > 0 || situacao.includes('pend')) {
    if (vencimento && endOfDay(vencimento).getTime() < today.getTime()) return 'vencido'
    return 'pendente'
  }

  if (paid > 0 || situacao.includes('pago') || situacao.includes('baix') || situacao.includes('quit')) {
    return 'pago'
  }

  if (vencimento && endOfDay(vencimento).getTime() < today.getTime()) return 'vencido'
  return 'pendente'
}

function getDateValueByField(row: TituloFinanceiro, field: FinanceDateField): Date | null {
  if (field === 'data_emissao') return parseDate(row.data_emissao)
  if (field === 'data_baixa') return parseDate(row.data_baixa)
  if (field === 'data_ultimo_pagamento') return parseDate(row.data_ultimo_pagamento)
  return parseDate(row.data_vencimento)
}

function aggregateBy(
  rows: TituloFinanceiroView[],
  getLabel: (row: TituloFinanceiroView) => string,
  getValue: (row: TituloFinanceiroView) => number
): RankingItem[] {
  const map = new Map<string, { total: number; count: number }>()

  rows.forEach((row) => {
    const label = normalizeText(getLabel(row)) || 'Nao informado'
    const value = getValue(row)
    if (value <= 0) return

    const current = map.get(label)
    if (!current) {
      map.set(label, { total: value, count: 1 })
      return
    }

    current.total += value
    current.count += 1
  })

  const totalAll = Array.from(map.values()).reduce((sum, current) => sum + current.total, 0)

  return Array.from(map.entries())
    .map(([label, current]) => ({
      label,
      total: current.total,
      count: current.count,
      percentage: totalAll > 0 ? (current.total / totalAll) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total)
}

function toMonthKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `${month}/${year}`
}

function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, '""')
  return `"${escaped}"`
}

export function formatCurrencyBRL(value: NumericLike): string {
  const numeric = toNumber(value)
  return numeric.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatDateBR(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return '--'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

function buildDefaultFilters(): FinanceFiltersState {
  const range = getPeriodRange('mes_atual')

  return {
    search: '',
    dateField: 'data_vencimento',
    quickPeriod: 'mes_atual',
    startDate: formatInputDate(range.start),
    endDate: formatInputDate(range.end),
    situacao: 'todos',
    fornecedor: 'todos',
    historico: 'todos',
    usuarioNome: 'todos',
    usuarioLogin: 'todos',
    contaCaixa: 'todos',
    tipoConta: 'todos',
    formaPagamento: 'todos',
    tipoMovimento: 'todos'
  }
}

export function useTitulosFinanceiros() {
  const supabase = useSupabaseClient()

  const rows = ref<TituloFinanceiro[]>([])
  const pending = ref(false)
  const error = ref<Error | null>(null)
  const updatedAt = ref<string | null>(null)

  const filters = reactive<FinanceFiltersState>(buildDefaultFilters())
  const page = ref(1)
  const pageSize = ref(25)
  const sort = reactive<FinanceSortState>({
    key: 'data_vencimento',
    order: 'desc'
  })

  const filterOptions = computed<FinanceFilterOptions>(() => {
    const extractUnique = (extractor: (item: TituloFinanceiro) => string | null): string[] => {
      const set = new Set<string>()
      rows.value.forEach((row) => {
        const value = normalizeText(extractor(row))
        if (value) set.add(value)
      })
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    }

    return {
      fornecedores: extractUnique((row) => row.fornecedor),
      historicos: extractUnique((row) => row.historico),
      usuariosNome: extractUnique((row) => row.usuario_nome),
      usuariosLogin: extractUnique((row) => row.usuario_login),
      contasCaixa: extractUnique((row) => row.conta_caixa),
      tiposConta: extractUnique((row) => row.tipo_conta),
      formasPagamento: extractUnique((row) => row.forma_pagamento),
      tiposMovimento: extractUnique((row) => row.tipo_movimento)
    }
  })

  const rowsView = computed<TituloFinanceiroView[]>(() => {
    return rows.value.map((row) => {
      const status = resolveFinanceStatus(row)
      const valueRef = Math.max(toNumber(row.valor_nominal), toNumber(row.valor_pago), toNumber(row.valor_baixa))
      return {
        ...row,
        status_resolvido: status,
        status_label: getStatusLabel(status),
        usuario_baixa: normalizeText(row.usuario_nome) || normalizeText(row.usuario_login) || 'Nao informado',
        valor_referencia: valueRef,
        is_vencido: status === 'vencido'
      }
    })
  })

  const activeDateRange = computed(() => {
    if (filters.quickPeriod !== 'todos' && filters.quickPeriod !== 'personalizado') {
      return getPeriodRange(filters.quickPeriod)
    }

    return {
      start: parseInputDate(filters.startDate),
      end: parseInputDate(filters.endDate)
    }
  })

  const filteredRows = computed<TituloFinanceiroView[]>(() => {
    const searchTerm = normalizeSearch(filters.search)
    const range = activeDateRange.value
    const rangeStart = range.start ? startOfDay(range.start).getTime() : null
    const rangeEnd = range.end ? endOfDay(range.end).getTime() : null

    return rowsView.value.filter((row) => {
      if (searchTerm) {
        const haystack = [
          row.numero_titulo,
          row.fornecedor,
          row.historico,
          row.complemento,
          row.usuario_nome,
          row.usuario_login,
          row.conta_caixa
        ]
          .map((part) => normalizeSearch(part))
          .join(' ')

        if (!haystack.includes(searchTerm)) return false
      }

      if (filters.situacao !== 'todos') {
        if (filters.situacao === 'pendente') {
          if (!(row.status_resolvido === 'pendente' || row.status_resolvido === 'vencido')) return false
        } else if (row.status_resolvido !== filters.situacao) {
          return false
        }
      }

      if (filters.fornecedor !== 'todos' && normalizeText(row.fornecedor) !== filters.fornecedor) return false
      if (filters.historico !== 'todos' && normalizeText(row.historico) !== filters.historico) return false
      if (filters.usuarioNome !== 'todos' && normalizeText(row.usuario_nome) !== filters.usuarioNome) return false
      if (filters.usuarioLogin !== 'todos' && normalizeText(row.usuario_login) !== filters.usuarioLogin) return false
      if (filters.contaCaixa !== 'todos' && normalizeText(row.conta_caixa) !== filters.contaCaixa) return false
      if (filters.tipoConta !== 'todos' && normalizeText(row.tipo_conta) !== filters.tipoConta) return false
      if (filters.formaPagamento !== 'todos' && normalizeText(row.forma_pagamento) !== filters.formaPagamento) return false
      if (filters.tipoMovimento !== 'todos' && normalizeText(row.tipo_movimento) !== filters.tipoMovimento) return false

      if (rangeStart !== null || rangeEnd !== null) {
        const dateValue = getDateValueByField(row, filters.dateField)
        if (!dateValue) return false
        const ts = dateValue.getTime()
        if (rangeStart !== null && ts < rangeStart) return false
        if (rangeEnd !== null && ts > rangeEnd) return false
      }

      return true
    })
  })

  const sortedRows = computed<TituloFinanceiroView[]>(() => {
    const copy = [...filteredRows.value]
    const direction = sort.order === 'asc' ? 1 : -1
    const statusWeight: Record<FinanceStatus, number> = {
      pago: 1,
      parcial: 2,
      pendente: 3,
      vencido: 4
    }

    const getSortValue = (row: TituloFinanceiroView) => {
      if (sort.key === 'status_resolvido') return statusWeight[row.status_resolvido]
      if (sort.key === 'sufixo') return row.sufixo ?? -1
      if (sort.key === 'valor_nominal') return toNumber(row.valor_nominal)
      if (sort.key === 'valor_pago') return toNumber(row.valor_pago)
      if (sort.key === 'valor_pendente') return toNumber(row.valor_pendente)
      if (sort.key === 'data_emissao') return parseDate(row.data_emissao)?.getTime() ?? 0
      if (sort.key === 'data_vencimento') return parseDate(row.data_vencimento)?.getTime() ?? 0
      if (sort.key === 'data_ultimo_pagamento') return parseDate(row.data_ultimo_pagamento)?.getTime() ?? 0
      if (sort.key === 'data_baixa') return parseDate(row.data_baixa)?.getTime() ?? 0
      if (sort.key === 'numero_titulo') return normalizeSearch(row.numero_titulo)
      if (sort.key === 'fornecedor') return normalizeSearch(row.fornecedor)
      if (sort.key === 'historico') return normalizeSearch(row.historico)
      if (sort.key === 'complemento') return normalizeSearch(row.complemento)
      if (sort.key === 'forma_pagamento') return normalizeSearch(row.forma_pagamento)
      if (sort.key === 'conta_caixa') return normalizeSearch(row.conta_caixa)
      if (sort.key === 'tipo_conta') return normalizeSearch(row.tipo_conta)
      if (sort.key === 'usuario_baixa') return normalizeSearch(row.usuario_baixa)
      if (sort.key === 'tipo_movimento') return normalizeSearch(row.tipo_movimento)
      if (sort.key === 'origem_lancamento') return normalizeSearch(row.origem_lancamento)
      return 0
    }

    copy.sort((a, b) => {
      const valueA = getSortValue(a)
      const valueB = getSortValue(b)

      if (valueA < valueB) return -1 * direction
      if (valueA > valueB) return 1 * direction
      return (a.id - b.id) * direction
    })

    return copy
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value)))

  const pagedRows = computed<TituloFinanceiroView[]>(() => {
    const start = (page.value - 1) * pageSize.value
    const end = start + pageSize.value
    return sortedRows.value.slice(start, end)
  })

  const kpis = computed<FinanceKpis>(() => {
    const rowsRef = filteredRows.value
    const totalNominal = rowsRef.reduce((sum, row) => sum + toNumber(row.valor_nominal), 0)
    const totalPago = rowsRef.reduce((sum, row) => {
      if (row.status_resolvido === 'pago' || toNumber(row.valor_pago) > 0) {
        return sum + toNumber(row.valor_pago)
      }
      return sum
    }, 0)
    const totalPendente = rowsRef.reduce((sum, row) => sum + toNumber(row.valor_pendente), 0)
    const titulosPagos = rowsRef.filter((row) => row.status_resolvido === 'pago').length
    const titulosPendentes = rowsRef.filter((row) => row.status_resolvido === 'pendente' || row.status_resolvido === 'vencido').length
    const maiorDespesa = rowsRef.reduce((max, row) => Math.max(max, row.valor_referencia), 0)
    const mediaPorTitulo = rowsRef.length > 0 ? totalNominal / rowsRef.length : 0

    return {
      totalPago,
      totalPendente,
      totalNominal,
      quantidadeTitulos: rowsRef.length,
      titulosPagos,
      titulosPendentes,
      maiorDespesa,
      mediaPorTitulo
    }
  })

  const despesasPorConta = computed(() => aggregateBy(filteredRows.value, (row) => row.conta_caixa || '', (row) => getExpenseAmount(row)).slice(0, 10))
  const despesasPorHistorico = computed(() => aggregateBy(filteredRows.value, (row) => row.historico || '', (row) => getExpenseAmount(row)).slice(0, 10))
  const despesasPorUsuario = computed(() => aggregateBy(filteredRows.value, (row) => row.usuario_baixa, (row) => getPaymentAmount(row)).slice(0, 10))
  const rankingFornecedores = computed(() => aggregateBy(filteredRows.value, (row) => row.fornecedor || '', (row) => getExpenseAmount(row)).slice(0, 10))
  const rankingContas = computed(() => despesasPorConta.value.slice(0, 5))
  const rankingHistoricos = computed(() => despesasPorHistorico.value.slice(0, 5))
  const rankingUsuarios = computed(() => despesasPorUsuario.value.slice(0, 5))

  const pagamentosPorDia = computed<FinanceDailyPoint[]>(() => {
    const grouped = new Map<string, number>()

    filteredRows.value.forEach((row) => {
      const date = parseDate(row.data_baixa) || parseDate(row.data_ultimo_pagamento)
      const value = getPaymentAmount(row)
      if (!date || value <= 0) return

      const key = date.toISOString().slice(0, 10)
      grouped.set(key, (grouped.get(key) || 0) + value)
    })

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-45)
      .map(([key, total]) => ({
        date: formatDateBR(key),
        total
      }))
  })

  const situacaoChart = computed<FinanceChartPoint[]>(() => {
    const paid = filteredRows.value.filter((row) => row.status_resolvido === 'pago').length
    const pending = filteredRows.value.length - paid

    return [
      { label: 'Pago', total: paid },
      { label: 'Pendente', total: pending }
    ]
  })

  const evolucaoMensal = computed<FinanceMonthlyPoint[]>(() => {
    const grouped = new Map<string, { pago: number; pendente: number; nominal: number }>()

    filteredRows.value.forEach((row) => {
      const date = parseDate(row.data_baixa) || parseDate(row.data_vencimento) || parseDate(row.data_emissao)
      if (!date) return

      const key = toMonthKey(date)
      const current = grouped.get(key) || { pago: 0, pendente: 0, nominal: 0 }

      current.pago += getPaymentAmount(row)
      current.pendente += toNumber(row.valor_pendente)
      current.nominal += toNumber(row.valor_nominal)

      grouped.set(key, current)
    })

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-18)
      .map(([month, values]) => ({
        month: monthLabel(month),
        pago: values.pago,
        pendente: values.pendente,
        nominal: values.nominal
      }))
  })

  const overduePendingCount = computed(() => filteredRows.value.filter((row) => row.status_resolvido === 'vencido').length)

  const paymentsToday = computed(() => {
    const start = startOfDay(new Date()).getTime()
    const end = endOfDay(new Date()).getTime()
    let count = 0
    let total = 0

    filteredRows.value.forEach((row) => {
      const date = parseDate(row.data_baixa) || parseDate(row.data_ultimo_pagamento)
      const value = getPaymentAmount(row)
      if (!date || value <= 0) return
      const ts = date.getTime()
      if (ts >= start && ts <= end) {
        count++
        total += value
      }
    })

    return { count, total }
  })

  const paymentsWeek = computed(() => {
    const end = endOfDay(new Date())
    const start = new Date(startOfDay(new Date()))
    start.setDate(start.getDate() - 6)

    let count = 0
    let total = 0

    filteredRows.value.forEach((row) => {
      const date = parseDate(row.data_baixa) || parseDate(row.data_ultimo_pagamento)
      const value = getPaymentAmount(row)
      if (!date || value <= 0) return
      const ts = date.getTime()
      if (ts >= start.getTime() && ts <= end.getTime()) {
        count++
        total += value
      }
    })

    return { count, total }
  })

  const paymentsMonth = computed(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const end = endOfDay(now).getTime()

    let count = 0
    let total = 0

    filteredRows.value.forEach((row) => {
      const date = parseDate(row.data_baixa) || parseDate(row.data_ultimo_pagamento)
      const value = getPaymentAmount(row)
      if (!date || value <= 0) return
      const ts = date.getTime()
      if (ts >= start && ts <= end) {
        count++
        total += value
      }
    })

    return { count, total }
  })

  const alertCards = computed<FinanceAlertCard[]>(() => {
    const topSupplier = rankingFornecedores.value[0]
    const topAccount = despesasPorConta.value[0]
    const topHistory = despesasPorHistorico.value[0]

    return [
      {
        title: 'Titulos vencidos pendentes',
        value: `${overduePendingCount.value}`,
        description: 'Exigem prioridade de regularizacao.',
        tone: overduePendingCount.value > 0 ? 'red' : 'green'
      },
      {
        title: 'Maior fornecedor do periodo',
        value: topSupplier ? topSupplier.label : 'Sem dados',
        description: topSupplier ? formatCurrencyBRL(topSupplier.total) : 'Sem movimentacao no periodo.',
        tone: 'amber'
      },
      {
        title: 'Conta caixa com maior saida',
        value: topAccount ? topAccount.label : 'Sem dados',
        description: topAccount ? formatCurrencyBRL(topAccount.total) : 'Sem movimentacao no periodo.',
        tone: 'cyan'
      },
      {
        title: 'Historico com maior gasto',
        value: topHistory ? topHistory.label : 'Sem dados',
        description: topHistory ? formatCurrencyBRL(topHistory.total) : 'Sem movimentacao no periodo.',
        tone: 'slate'
      },
      {
        title: 'Pagamentos feitos hoje',
        value: `${paymentsToday.value.count}`,
        description: formatCurrencyBRL(paymentsToday.value.total),
        tone: 'green'
      },
      {
        title: 'Pagamentos da semana',
        value: `${paymentsWeek.value.count}`,
        description: formatCurrencyBRL(paymentsWeek.value.total),
        tone: 'cyan'
      },
      {
        title: 'Pagamentos do mes',
        value: `${paymentsMonth.value.count}`,
        description: formatCurrencyBRL(paymentsMonth.value.total),
        tone: 'amber'
      }
    ]
  })

  const insights = computed<string[]>(() => {
    const list: string[] = []
    const totalPayments = filteredRows.value.reduce((sum, row) => sum + getPaymentAmount(row), 0)
    const topAccount = despesasPorConta.value[0]
    const topHistory = despesasPorHistorico.value[0]
    const topSupplier = rankingFornecedores.value[0]

    if (topAccount && totalPayments > 0) {
      list.push(`A conta ${topAccount.label} concentrou ${topAccount.percentage.toFixed(1)}% dos pagamentos do periodo.`)
    }

    if (topHistory) {
      list.push(`O historico ${topHistory.label} representa ${formatCurrencyBRL(topHistory.total)} no periodo filtrado.`)
    }

    list.push(`Existem ${overduePendingCount.value} titulos pendentes vencidos no recorte atual.`)

    const majorPayment = filteredRows.value.reduce<TituloFinanceiroView | null>((max, row) => {
      const value = getPaymentAmount(row)
      if (!max) return value > 0 ? row : null
      return value > getPaymentAmount(max) ? row : max
    }, null)

    if (majorPayment) {
      list.push(
        `O maior pagamento do periodo foi para ${majorPayment.fornecedor || 'Fornecedor nao informado'} no valor de ${formatCurrencyBRL(getPaymentAmount(majorPayment))}.`
      )
    } else if (topSupplier) {
      list.push(`O maior desembolso consolidado foi para ${topSupplier.label} com ${formatCurrencyBRL(topSupplier.total)}.`)
    }

    return list.slice(0, 4)
  })

  const highValueThreshold = computed(() => {
    const values = filteredRows.value
      .map((row) => row.valor_referencia)
      .filter((value) => value > 0)
      .sort((a, b) => a - b)

    if (values.length === 0) return 0
    const index = Math.floor(values.length * 0.9)
    return values[index] ?? values[values.length - 1]
  })

  const chartData = computed(() => ({
    despesasPorConta: despesasPorConta.value.map((item) => ({ label: item.label, total: item.total })),
    despesasPorHistorico: despesasPorHistorico.value.map((item) => ({ label: item.label, total: item.total })),
    pagamentosPorDia: pagamentosPorDia.value,
    situacao: situacaoChart.value,
    despesasPorUsuario: despesasPorUsuario.value.map((item) => ({ label: item.label, total: item.total })),
    rankingFornecedores: rankingFornecedores.value.map((item) => ({ label: item.label, total: item.total })),
    evolucaoMensal: evolucaoMensal.value
  }))

  const rankings = computed(() => ({
    fornecedores: rankingFornecedores.value,
    historicos: rankingHistoricos.value,
    contas: rankingContas.value,
    usuarios: rankingUsuarios.value
  }))

  watch(
    () => filters.quickPeriod,
    (period) => {
      if (period === 'todos') {
        filters.startDate = null
        filters.endDate = null
        return
      }

      if (period === 'personalizado') return

      const range = getPeriodRange(period)
      filters.startDate = formatInputDate(range.start)
      filters.endDate = formatInputDate(range.end)
    }
  )

  watch(
    filters,
    () => {
      page.value = 1
    },
    { deep: true }
  )

  watch([sortedRows, pageSize], () => {
    if (page.value > totalPages.value) page.value = totalPages.value
  })

  async function fetchData() {
    pending.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('titulos_financeiros')
        .select('id,chave_unica,titulo_id,baixa_id,numero_titulo,sufixo,data_emissao,data_vencimento,data_ultimo_pagamento,valor_nominal,valor_pago,valor_pendente,complemento,situacao_titulo,fornecedor,tipo_titulo,forma_pagamento,data_baixa,valor_baixa,usuario_login,usuario_nome,origem_lancamento,tipo_movimento,conta_caixa,tipo_conta,historico,created_at,updated_at')
        .order('data_vencimento', { ascending: false })
        .limit(5000)

      if (queryError) throw queryError

      rows.value = (data as TituloFinanceiro[]) || []
      updatedAt.value = new Date().toISOString()
    } catch (err: any) {
      console.error('Error fetching titulos_financeiros:', err)
      error.value = err
      rows.value = []
    } finally {
      pending.value = false
    }
  }

  function refreshData() {
    return fetchData()
  }

  function clearFilters() {
    const defaults = buildDefaultFilters()
    Object.assign(filters, defaults)
  }

  function setSort(key: FinanceSortKey) {
    if (sort.key === key) {
      sort.order = sort.order === 'asc' ? 'desc' : 'asc'
      return
    }

    sort.key = key
    const defaultDescKeys: FinanceSortKey[] = [
      'valor_nominal',
      'valor_pago',
      'valor_pendente',
      'data_emissao',
      'data_vencimento',
      'data_ultimo_pagamento',
      'data_baixa'
    ]
    sort.order = defaultDescKeys.includes(key) ? 'desc' : 'asc'
  }

  function setPage(nextPage: number) {
    const bounded = Math.min(Math.max(nextPage, 1), totalPages.value)
    page.value = bounded
  }

  function setPageSize(nextSize: number) {
    pageSize.value = nextSize
  }

  function exportCsv() {
    if (!import.meta.client) return
    const exportRows = sortedRows.value
    if (exportRows.length === 0) return

    const headers = [
      'status',
      'numero_titulo',
      'titulo_id',
      'baixa_id',
      'sufixo',
      'fornecedor',
      'historico',
      'complemento',
      'valor_nominal',
      'valor_pago',
      'valor_pendente',
      'data_emissao',
      'data_vencimento',
      'data_ultimo_pagamento',
      'data_baixa',
      'forma_pagamento',
      'conta_caixa',
      'tipo_conta',
      'usuario_nome',
      'usuario_login',
      'tipo_movimento',
      'origem_lancamento',
      'situacao_titulo',
      'chave_unica'
    ]

    const lines = exportRows.map((row) => {
      const values = [
        row.status_label,
        row.numero_titulo || '',
        `${row.titulo_id}`,
        row.baixa_id === null ? '' : `${row.baixa_id}`,
        row.sufixo === null ? '' : `${row.sufixo}`,
        row.fornecedor || '',
        row.historico || '',
        row.complemento || '',
        toNumber(row.valor_nominal).toFixed(2),
        toNumber(row.valor_pago).toFixed(2),
        toNumber(row.valor_pendente).toFixed(2),
        formatDateBR(row.data_emissao),
        formatDateBR(row.data_vencimento),
        formatDateBR(row.data_ultimo_pagamento),
        formatDateBR(row.data_baixa),
        row.forma_pagamento || '',
        row.conta_caixa || '',
        row.tipo_conta || '',
        row.usuario_nome || '',
        row.usuario_login || '',
        row.tipo_movimento || '',
        row.origem_lancamento || '',
        row.situacao_titulo || '',
        row.chave_unica
      ]

      return values.map((value) => csvEscape(value)).join(';')
    })

    const csv = [headers.join(';'), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const now = new Date()
    const stamp = `${now.getFullYear()}${`${now.getMonth() + 1}`.padStart(2, '0')}${`${now.getDate()}`.padStart(2, '0')}_${`${now.getHours()}`.padStart(2, '0')}${`${now.getMinutes()}`.padStart(2, '0')}`
    const filename = `titulos_financeiros_${stamp}.csv`

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return {
    rows,
    pending,
    error,
    updatedAt,
    filters,
    filterOptions,
    page,
    pageSize,
    sort,
    totalPages,
    filteredRows,
    sortedRows,
    pagedRows,
    kpis,
    alertCards,
    insights,
    rankings,
    chartData,
    highValueThreshold,
    fetchData,
    refreshData,
    clearFilters,
    setSort,
    setPage,
    setPageSize,
    exportCsv
  }
}
