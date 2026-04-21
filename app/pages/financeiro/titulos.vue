<template>
  <div class="space-y-7">
    <FinanceiroNavTabs class="print-hide" />

    <section class="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 px-6 py-7 text-white sm:px-8">
      <div class="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/25 blur-3xl"></div>
      <div class="absolute -left-8 -bottom-16 h-44 w-44 rounded-full bg-orange-300/20 blur-3xl"></div>

      <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.2em] text-cyan-100">Control Tower Financeiro</p>
          <h1 class="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Titulos Financeiros e Fluxo de Pagamentos</h1>
          <p class="mt-2 text-sm text-cyan-50 sm:text-base">
            Painel gerencial com leitura executiva de pendencias, desembolsos, concentracao por conta/fornecedor e performance operacional.
          </p>
          <div class="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
            {{ filteredRows.length }} titulos apos filtros
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs text-cyan-100">
            Atualizado em {{ updatedAtLabel }}
          </div>
          <button
            type="button"
            class="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
            :disabled="sortedRows.length === 0"
            @click="exportCsv"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            class="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
            :disabled="sortedRows.length === 0"
            @click="preparePdfExport"
          >
            Preparar PDF
          </button>
        </div>
      </div>

      <div class="relative mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-2xl border border-white/20 bg-white/10 p-3">
          <p class="text-[10px] uppercase tracking-[0.14em] text-cyan-100">Recorte ativo</p>
          <p class="mt-1 text-sm font-bold text-white">{{ recorteLabel }}</p>
        </article>
        <article class="rounded-2xl border border-white/20 bg-white/10 p-3">
          <p class="text-[10px] uppercase tracking-[0.14em] text-cyan-100">Status dominante</p>
          <p class="mt-1 text-sm font-bold text-white">{{ dominantStatusLabel }}</p>
        </article>
        <article class="rounded-2xl border border-white/20 bg-white/10 p-3">
          <p class="text-[10px] uppercase tracking-[0.14em] text-cyan-100">Fornecedor lider</p>
          <p class="mt-1 truncate text-sm font-bold text-white" :title="topSupplierLabel">{{ topSupplierLabel }}</p>
        </article>
        <article class="rounded-2xl border border-white/20 bg-white/10 p-3">
          <p class="text-[10px] uppercase tracking-[0.14em] text-cyan-100">Conta lider</p>
          <p class="mt-1 truncate text-sm font-bold text-white" :title="topAccountLabel">{{ topAccountLabel }}</p>
        </article>
      </div>
    </section>

    <div
      v-if="error"
      class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"
    >
      <p class="text-sm font-semibold">Erro ao carregar titulos financeiros</p>
      <p class="mt-1 text-sm">{{ error.message }}</p>
    </div>

    <FinanceFilters
      v-model="filters"
      :options="filterOptions"
      :loading="pending"
      :filtered-count="filteredRows.length"
      @clear="clearFilters"
      @refresh="refreshData"
    />

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FinanceKpiCard
        v-for="card in kpiCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :description="card.description"
        :tone="card.tone"
        :icon="card.icon"
        :loading="pending"
      />
    </section>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <FinanceInsightCard
        v-for="alert in alertCards"
        :key="`${alert.title}-${alert.value}`"
        :title="alert.title"
        :value="alert.value"
        :description="alert.description"
        :tone="alert.tone"
      />
    </section>

    <section>
      <article class="rounded-3xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
        <div class="mb-4 flex items-center justify-between gap-2">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-slate-500">Insights automaticos</p>
            <p class="mt-1 text-sm text-slate-600">Leituras executivas para suporte a decisao do financeiro.</p>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <article
            v-for="insight in insights"
            :key="insight"
            class="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3"
          >
            <div class="flex items-start gap-2">
              <span class="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-cyan-500"></span>
              <p class="text-sm text-slate-700">{{ insight }}</p>
            </div>
          </article>
        </div>
      </article>
    </section>

    <FinanceCharts :chart-data="chartData" />

    <section class="grid gap-4 xl:grid-cols-4 xl:items-start">
      <article
        v-for="group in rankingCards"
        :key="group.title"
        class="self-start overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4 text-slate-100 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.8)]"
      >
        <h3 class="text-sm font-semibold tracking-wide text-slate-100">{{ group.title }}</h3>
        <ul class="mt-3 space-y-2">
          <li
            v-for="(item, index) in group.items"
            :key="`${group.title}-${item.label}`"
            class="rounded-xl border border-white/10 bg-white/5 p-2.5"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold text-slate-100" :title="item.label">
                  <span class="mr-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">#{{ index + 1 }}</span>
                  {{ item.label }}
                </p>
                <p class="mt-1 text-[11px] text-slate-300">{{ formatPercent(item.percentage) }} do total</p>
              </div>
              <p class="text-[11px] font-semibold text-cyan-200">{{ formatCurrencyBRL(item.total) }}</p>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded bg-white/10">
              <div
                class="h-full rounded bg-cyan-400"
                :style="{ width: `${Math.max(Math.min(item.percentage, 100), 4)}%` }"
              ></div>
            </div>
          </li>
          <li v-if="group.items.length === 0" class="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-slate-300">
            Sem dados para o periodo.
          </li>
        </ul>
      </article>
    </section>

    <FinanceTitlesTable
      :rows="pagedRows"
      :loading="pending"
      :total-rows="filteredRows.length"
      :page="page"
      :total-pages="totalPages"
      :page-size="pageSize"
      :sort="sort"
      :high-value-threshold="highValueThreshold"
      @sort="setSort"
      @page-change="setPage"
      @page-size-change="setPageSize"
      @open="openDrawer"
    />

    <FinanceTitleDrawer
      :open="drawerOpen"
      :title="selectedTitle"
      @close="closeDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatCurrencyBRL, useTitulosFinanceiros } from '~/composables/useTitulosFinanceiros'
import type { TituloFinanceiroView } from '~/composables/useTitulosFinanceiros'
import FinanceFilters from '~/components/financeiro/FinanceFilters.vue'
import FinanceKpiCard from '~/components/financeiro/FinanceKpiCard.vue'
import FinanceInsightCard from '~/components/financeiro/FinanceInsightCard.vue'
import FinanceCharts from '~/components/financeiro/FinanceCharts.vue'
import FinanceTitlesTable from '~/components/financeiro/FinanceTitlesTable.vue'
import FinanceTitleDrawer from '~/components/financeiro/FinanceTitleDrawer.vue'
import FinanceiroNavTabs from '~/components/financeiro/FinanceiroNavTabs.vue'

definePageMeta({
  scrollToTop: true
})

const {
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
} = useTitulosFinanceiros()

const drawerOpen = ref(false)
const selectedTitle = ref<TituloFinanceiroView | null>(null)

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

const kpiCards = computed(() => [
  {
    title: 'Total pago',
    value: formatCurrencyBRL(kpis.value.totalPago),
    description: 'Soma de valor_pago para titulos pagos ou com baixa registrada.',
    tone: 'green' as const,
    icon: 'money' as const
  },
  {
    title: 'Total pendente',
    value: formatCurrencyBRL(kpis.value.totalPendente),
    description: `${kpis.value.titulosPendentes} titulos pendentes no recorte filtrado.`,
    tone: 'amber' as const,
    icon: 'clock' as const
  },
  {
    title: 'Total nominal',
    value: formatCurrencyBRL(kpis.value.totalNominal),
    description: `Media por titulo: ${formatCurrencyBRL(kpis.value.mediaPorTitulo)}.`,
    tone: 'cyan' as const,
    icon: 'chart' as const
  },
  {
    title: 'Quantidade de titulos',
    value: `${kpis.value.quantidadeTitulos}`,
    description: `Pagos: ${kpis.value.titulosPagos} | Maior despesa: ${formatCurrencyBRL(kpis.value.maiorDespesa)}.`,
    tone: 'slate' as const,
    icon: 'list' as const
  }
])

const rankingCards = computed(() => [
  { title: 'Top fornecedores', items: rankings.value.fornecedores },
  { title: 'Top historicos', items: rankings.value.historicos },
  { title: 'Top contas caixa', items: rankings.value.contas },
  { title: 'Top usuarios de baixa', items: rankings.value.usuarios }
])

const recorteLabel = computed(() => {
  const baseMap: Record<string, string> = {
    hoje: 'Hoje',
    ontem: 'Ontem',
    ultimos_7_dias: 'Ultimos 7 dias',
    mes_atual: 'Mes atual',
    mes_anterior: 'Mes anterior',
    ano_atual: 'Ano atual',
    personalizado: 'Personalizado',
    todos: 'Todos os periodos'
  }

  const label = baseMap[filters.quickPeriod] || 'Periodo'

  if (filters.quickPeriod === 'personalizado' && filters.startDate && filters.endDate) {
    const start = new Intl.DateTimeFormat('pt-BR').format(new Date(`${filters.startDate}T00:00:00`))
    const end = new Intl.DateTimeFormat('pt-BR').format(new Date(`${filters.endDate}T00:00:00`))
    return `${label}: ${start} - ${end}`
  }

  return label
})

const dominantStatusLabel = computed(() => {
  if (filteredRows.value.length === 0) return 'Sem dados'

  const map = new Map<string, number>()
  filteredRows.value.forEach((row) => {
    map.set(row.status_label, (map.get(row.status_label) || 0) + 1)
  })

  const top = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]
  if (!top) return 'Sem dados'
  return `${top[0]} (${top[1]})`
})

const topSupplierLabel = computed(() => {
  const top = rankings.value.fornecedores[0]
  if (!top) return 'Sem concentracao'
  return `${top.label} (${formatPercent(top.percentage)})`
})

const topAccountLabel = computed(() => {
  const top = rankings.value.contas[0]
  if (!top) return 'Sem concentracao'
  return `${top.label} (${formatPercent(top.percentage)})`
})

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function openDrawer(row: TituloFinanceiroView) {
  selectedTitle.value = row
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
}

function preparePdfExport() {
  const payload = sortedRows.value.map((row) => ({
    status: row.status_label,
    numero_titulo: row.numero_titulo,
    fornecedor: row.fornecedor,
    valor_nominal: row.valor_nominal,
    valor_pago: row.valor_pago,
    valor_pendente: row.valor_pendente,
    data_vencimento: row.data_vencimento
  }))

  console.info('Payload preparado para futura exportacao PDF:', payload.length)
  if (import.meta.client) {
    window.alert(`Estrutura de exportacao PDF preparada com ${payload.length} registros.`)
  }
}

onMounted(() => {
  void fetchData()
})
</script>
