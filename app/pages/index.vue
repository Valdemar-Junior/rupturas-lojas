<template>
  <div class="space-y-6 print-report-root">
    <div class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside class="print-hide rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-[0_24px_60px_-34px_rgba(15,23,42,0.45)] p-5 xl:sticky xl:top-24 h-fit">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Painel de risco</p>
        <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          Controle de Ruptura
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Escolha o cenario para acompanhar itens que exigem acao imediata.
        </p>

        <div class="mt-6 space-y-2">
          <button
            v-for="item in scenarioItems"
            :key="item.key"
            @click="activeMode = item.key"
            :class="[
              'w-full text-left rounded-2xl p-3 transition border',
              activeMode === item.key
                ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            ]"
          >
            <p class="text-sm font-semibold">{{ item.title }}</p>
            <p
              :class="[
                'text-xs mt-1',
                activeMode === item.key ? 'text-slate-300' : 'text-slate-500'
              ]"
            >
              {{ item.description }}
            </p>
          </button>
        </div>

        <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Ultima atualizacao</p>
            <p class="mt-1 text-sm font-semibold text-slate-700">{{ updatedAtLabel }}</p>
          </div>
          <button
            @click="refreshData"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            :disabled="pending"
          >
            <svg :class="{ 'animate-spin': pending }" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12a9 9 0 101.76-5.36M3 4v4h4" />
            </svg>
            Atualizar dados
          </button>
        </div>
      </aside>

      <main class="space-y-6 min-w-0">
        <section class="print-hide relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white px-6 py-7 sm:px-8">
          <div class="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-cyan-400/25 blur-2xl"></div>
          <div class="absolute -left-16 -bottom-14 h-44 w-44 rounded-full bg-orange-300/20 blur-3xl"></div>

          <div class="relative">
            <p class="text-xs uppercase tracking-[0.22em] text-cyan-100/90">{{ activeScenario.title }}</p>
            <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {{ activeScenario.heading }}
            </h2>
            <p class="mt-2 text-cyan-50/90 text-sm sm:text-base">
              {{ activeScenario.rule }}
            </p>
            <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {{ activeVisibleCount }} itens exibidos apos filtros
            </div>
          </div>
        </section>

        <div
          v-if="error"
          class="print-hide rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm"
        >
          <p class="font-semibold text-sm">Erro ao carregar dados</p>
          <p class="text-sm mt-1">{{ error.message }}</p>
        </div>

        <section class="print-hide grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          <DashboardKpiCard
            v-for="card in activeCards"
            :key="card.title"
            :title="card.title"
            :value="card.value"
            :description="card.description"
            :icon="card.icon"
            :color="card.color"
            :loading="pending"
          />
        </section>

        <FilterBar
          v-model="filters"
          :mode="activeMode"
          :departamentos="availableDepartments"
          :loading="pending"
          class="print-hide"
        />

        <div class="print-hide flex justify-end">
          <button
            @click="exportCompactPdf"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="pending || activeVisibleCount === 0"
          >
            Gerar PDF tabela simples
          </button>
        </div>

        <section class="rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-[0_20px_55px_-32px_rgba(15,23,42,0.45)] overflow-hidden">
          <div class="print-only border-b border-slate-200 px-4 py-3">
            <h3 class="text-sm font-bold text-slate-900">{{ activeScenario.heading }}</h3>
            <p class="mt-1 text-xs text-slate-600">
              Gerado em {{ printGeneratedAtLabel }} | {{ activeVisibleCount }} itens
            </p>
            <p class="mt-1 text-xs text-slate-600">
              Filtros: {{ activeFilterSummary }}
            </p>
          </div>

          <div v-if="pending && !hasAnyData" class="p-12 flex flex-col items-center justify-center text-slate-500">
            <svg class="animate-spin h-8 w-8 text-cyan-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.97 7.97 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"></path>
            </svg>
            <p>Buscando informacoes no Supabase...</p>
          </div>

          <RupturasTable
            v-else-if="activeMode === 'ruptura-loja'"
            :produtos="filteredRupturas"
            :empty-state="filteredRupturas.length === 0"
          />

          <PecaUnicaTable
            v-else
            :produtos="filteredRupturaDeposito"
            :empty-state="filteredRupturaDeposito.length === 0"
          />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRupturas } from '~/composables/useRupturas'
import type { ProdutoEstoque, ProdutoRuptura } from '~/types/supabase'

type DashboardMode = 'ruptura-loja' | 'ruptura-deposito'

export type RupturaFilter = {
  search: string;
  departamento: string;
  localFalta: 'todos' | 'ambas' | 'assu' | 'mossoro';
}

type KpiCardData = {
  title: string;
  value: number | string;
  description: string;
  icon: 'alert-circle' | 'alert-triangle' | 'info' | 'clock';
  color: 'cyan' | 'red' | 'amber' | 'slate';
}

type PrintableColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
  width?: string;
}

type PrintableReport = {
  title: string;
  columns: PrintableColumn[];
  rows: Array<Record<string, string>>;
}

const { rupturas, rupturaDeposito, stats, pending, error, updatedAt, fetchData } = useRupturas()

const activeMode = ref<DashboardMode>('ruptura-loja')
const printGeneratedAt = ref(new Date())

const filters = ref<RupturaFilter>({
  search: '',
  departamento: 'Todos',
  localFalta: 'todos'
})

const scenarioItems: Array<{ key: DashboardMode; title: string; description: string }> = [
  {
    key: 'ruptura-loja',
    title: 'Ruptura em Loja',
    description: 'Tem no deposito e falta na loja.'
  },
  {
    key: 'ruptura-deposito',
    title: 'Ruptura em Deposito',
    description: 'Tem em loja e falta no deposito.'
  }
]

const activeScenario = computed(() => {
  if (activeMode.value === 'ruptura-loja') {
    return {
      title: 'Cenario 1',
      heading: 'Produtos em ruptura na loja',
      rule: 'Mostra itens com saldo no deposito e falta total ou parcial nas lojas Assu e Mossoro.'
    }
  }

  return {
    title: 'Cenario 2',
    heading: 'Produtos em ruptura de deposito',
    rule: 'Mostra itens com saldo em loja e deposito zerado, com cor/grade quando esse dado estiver disponivel.'
  }
})

const updatedAtLabel = computed(() => {
  if (!updatedAt.value) return '--'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(updatedAt.value))
})

const hasAnyData = computed(() => rupturas.value.length > 0 || rupturaDeposito.value.length > 0)

const availableDepartments = computed(() => {
  const source = activeMode.value === 'ruptura-loja' ? rupturas.value : rupturaDeposito.value
  const unique = new Set<string>()

  source.forEach((item) => {
    if (item.departamento) unique.add(item.departamento)
  })

  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const activeVisibleCount = computed(() => {
  return activeMode.value === 'ruptura-loja'
    ? filteredRupturas.value.length
    : filteredRupturaDeposito.value.length
})

const printGeneratedAtLabel = computed(() => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(printGeneratedAt.value)
})

const localFilterLabel = computed(() => {
  if (filters.value.localFalta === 'todos') return 'Todos os locais'

  if (activeMode.value === 'ruptura-loja') {
    if (filters.value.localFalta === 'ambas') return 'Falta em Assu e Mossoro'
    if (filters.value.localFalta === 'assu') return 'Falta apenas em Assu'
    return 'Falta apenas em Mossoro'
  }

  if (filters.value.localFalta === 'ambas') return 'Cobertura em Assu e Mossoro'
  if (filters.value.localFalta === 'assu') return 'Cobertura em Assu'
  return 'Cobertura em Mossoro'
})

const activeFilterSummary = computed(() => {
  const departmentLabel = filters.value.departamento === 'Todos' ? 'Todos os departamentos' : filters.value.departamento
  const searchTerm = filters.value.search.trim()
  const searchLabel = searchTerm ? `Busca: "${searchTerm}"` : 'Sem busca'

  return `${departmentLabel} | ${localFilterLabel.value} | ${searchLabel}`
})

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return 0
}

function formatPrintNumber(val: number | string | null | undefined) {
  const num = toNumber(val)
  return Number.isInteger(num) ? num.toString() : num.toFixed(2).replace(/\.00$/, '')
}

function normalizeText(val: string | null | undefined) {
  return val?.trim() || '-'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isAssuOnly(item: ProdutoRuptura | ProdutoEstoque) {
  return toNumber(item.saldo_assu) > 0 && toNumber(item.saldo_mossoro) <= 0
}

function isMossoroOnly(item: ProdutoRuptura | ProdutoEstoque) {
  return toNumber(item.saldo_mossoro) > 0 && toNumber(item.saldo_assu) <= 0
}

function matchesSearch<T extends { nome_produto: string | null; codigo_modelo: string | null }>(item: T, term: string) {
  if (!term) return true
  const searchLower = term.toLowerCase()

  return (
    item.nome_produto?.toLowerCase().includes(searchLower) ||
    item.codigo_modelo?.toLowerCase().includes(searchLower)
  )
}

const filteredRupturas = computed(() => {
  return rupturas.value.filter((item) => {
    if (!matchesSearch(item, filters.value.search)) return false

    if (filters.value.departamento !== 'Todos' && item.departamento !== filters.value.departamento) {
      return false
    }

    const assuZero = toNumber(item.saldo_assu) <= 0
    const mossoroZero = toNumber(item.saldo_mossoro) <= 0

    if (filters.value.localFalta === 'ambas') {
      return assuZero && mossoroZero
    }

    if (filters.value.localFalta === 'assu') {
      return assuZero && !mossoroZero
    }

    if (filters.value.localFalta === 'mossoro') {
      return mossoroZero && !assuZero
    }

    return true
  })
})

const filteredRupturaDeposito = computed(() => {
  return rupturaDeposito.value.filter((item) => {
    if (!matchesSearch(item, filters.value.search)) return false

    if (filters.value.departamento !== 'Todos' && item.departamento !== filters.value.departamento) {
      return false
    }

    if (filters.value.localFalta === 'assu') return isAssuOnly(item)
    if (filters.value.localFalta === 'mossoro') return isMossoroOnly(item)

    return true
  })
})

function resolveRupturaLojaStatus(item: ProdutoRuptura) {
  const assuZero = toNumber(item.saldo_assu) <= 0
  const mossoroZero = toNumber(item.saldo_mossoro) <= 0

  if (assuZero && mossoroZero) return 'Critico'
  if (assuZero) return 'Falta em Assu'
  if (mossoroZero) return 'Falta em Mossoro'
  return 'Atencao'
}

function resolveRupturaDepositoStatus(item: ProdutoEstoque) {
  const assu = toNumber(item.saldo_assu)
  const mossoro = toNumber(item.saldo_mossoro)

  if (assu > 0 && mossoro > 0) return 'Assu e Mossoro'
  if (assu > 0) return 'Assu'
  if (mossoro > 0) return 'Mossoro'
  return '-'
}

const printableReport = computed<PrintableReport>(() => {
  if (activeMode.value === 'ruptura-loja') {
    return {
      title: 'Relatorio de Ruptura em Loja',
      columns: [
        { key: 'codigo', label: 'Codigo', width: '12%' },
        { key: 'produto', label: 'Produto', width: '38%' },
        { key: 'departamento', label: 'Departamento', width: '16%' },
        { key: 'deposito', label: 'Deposito', width: '8%', align: 'right' },
        { key: 'assu', label: 'Assu', width: '8%', align: 'right' },
        { key: 'mossoro', label: 'Mossoro', width: '8%', align: 'right' },
        { key: 'status', label: 'Status', width: '10%' }
      ],
      rows: filteredRupturas.value.map((item) => ({
        codigo: normalizeText(item.codigo_modelo),
        produto: normalizeText(item.nome_produto),
        departamento: normalizeText(item.departamento),
        deposito: formatPrintNumber(item.qtd_total_deposito),
        assu: formatPrintNumber(item.saldo_assu),
        mossoro: formatPrintNumber(item.saldo_mossoro),
        status: resolveRupturaLojaStatus(item)
      }))
    }
  }

  return {
    title: 'Relatorio de Ruptura no Deposito',
    columns: [
      { key: 'codigo', label: 'Codigo', width: '12%' },
      { key: 'produto', label: 'Produto', width: '40%' },
      { key: 'departamento', label: 'Departamento', width: '16%' },
      { key: 'assu', label: 'Assu', width: '8%', align: 'right' },
      { key: 'mossoro', label: 'Mossoro', width: '8%', align: 'right' },
      { key: 'deposito', label: 'Deposito', width: '8%', align: 'right' },
      { key: 'status', label: 'Status', width: '8%' }
    ],
    rows: filteredRupturaDeposito.value.map((item) => ({
      codigo: normalizeText(item.codigo_modelo),
      produto: normalizeText(item.nome_produto),
      departamento: normalizeText(item.departamento),
      assu: formatPrintNumber(item.saldo_assu),
      mossoro: formatPrintNumber(item.saldo_mossoro),
      deposito: formatPrintNumber(item.saldo_deposito),
      status: resolveRupturaDepositoStatus(item)
    }))
  }
})

const activeCards = computed<KpiCardData[]>(() => {
  if (activeMode.value === 'ruptura-loja') {
    return [
      {
        title: 'Rupturas ativas',
        value: stats.value.ruptura.total,
        description: 'Itens com falta em ao menos uma loja.',
        icon: 'alert-circle',
        color: 'cyan'
      },
      {
        title: 'Falta em ambas',
        value: stats.value.ruptura.ambas,
        description: 'Sem estoque em Assu e Mossoro.',
        icon: 'alert-triangle',
        color: 'red'
      },
      {
        title: 'So Assu',
        value: stats.value.ruptura.assu,
        description: 'Falta apenas em Assu.',
        icon: 'info',
        color: 'amber'
      },
      {
        title: 'So Mossoro',
        value: stats.value.ruptura.mossoro,
        description: 'Falta apenas em Mossoro.',
        icon: 'info',
        color: 'slate'
      }
    ]
  }

  return [
    {
      title: 'Rupturas no deposito',
      value: stats.value.rupturaDeposito.total,
      description: 'Itens com estoque em loja e deposito zerado.',
      icon: 'alert-circle',
      color: 'cyan'
    },
    {
      title: 'Cobertura em Assu',
      value: stats.value.rupturaDeposito.assu,
      description: 'Itens com saldo em Assu.',
      icon: 'info',
      color: 'amber'
    },
    {
      title: 'Cobertura em Mossoro',
      value: stats.value.rupturaDeposito.mossoro,
      description: 'Itens com saldo em Mossoro.',
      icon: 'info',
      color: 'slate'
    },
    {
      title: 'Criticos no painel',
      value: stats.value.criticos,
      description: 'Falta total + peca unica sem deposito.',
      icon: 'alert-triangle',
      color: 'red'
    }
  ]
})

watch(activeMode, () => {
  filters.value = {
    search: '',
    departamento: 'Todos',
    localFalta: 'todos'
  }
})

async function refreshData() {
  await fetchData()
}

async function exportCompactPdf() {
  if (!import.meta.client) return

  printGeneratedAt.value = new Date()
  await nextTick()

  const report = printableReport.value
  if (report.rows.length === 0) return

  const colGroupHtml = report.columns
    .map((column) => `<col style="width: ${column.width ?? 'auto'};">`)
    .join('')

  const headerHtml = report.columns
    .map((column) => `<th class="${column.align === 'right' ? 'text-right' : ''}">${escapeHtml(column.label)}</th>`)
    .join('')

  const bodyHtml = report.rows
    .map((row) => {
      const cells = report.columns
        .map((column) => `<td class="${column.align === 'right' ? 'text-right' : ''}">${escapeHtml(row[column.key] ?? '-')}</td>`)
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const styleTagOpen = '<st' + 'yle>'
  const styleTagClose = '</st' + 'yle>'

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  ${styleTagOpen}
    @page { size: A4 landscape; margin: 6mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
    .wrap { width: 100%; }
    h1 { margin: 0 0 3mm; font-size: 14px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #d1d5db; padding: 2px 4px; vertical-align: top; word-break: break-word; line-height: 1.15; }
    th { background: #f3f4f6; text-align: left; font-weight: 700; }
    .text-right { text-align: right; }
    tr { page-break-inside: avoid; break-inside: avoid; }
  ${styleTagClose}
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(report.title)}</h1>
    <table>
      <colgroup>${colGroupHtml}</colgroup>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=1200,height=900')

  if (!printWindow) {
    window.alert('Nao foi possivel abrir a janela de impressao. Libere pop-ups para gerar o PDF em tabela simples.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  const closeOnPrint = () => printWindow.close()
  printWindow.addEventListener('afterprint', closeOnPrint, { once: true })

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 150)
}
</script>
