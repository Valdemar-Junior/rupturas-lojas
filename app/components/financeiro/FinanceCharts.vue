<template>
  <section class="rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_22px_48px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-slate-500">Analises visuais</p>
        <p class="mt-1 text-sm text-slate-600">Visao consolidada de despesas, pagamentos e concentracoes por origem.</p>
      </div>
    </div>

    <ClientOnly>
      <div class="grid gap-4 xl:grid-cols-2">
        <article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">Despesas por conta caixa/banco</h3>
          <div v-if="chartData.despesasPorConta.length === 0" class="flex h-[280px] items-center justify-center text-sm text-slate-500">Sem dados para o periodo.</div>
          <ApexChart
            v-else
            type="bar"
            height="280"
            :options="contaOptions"
            :series="contaSeries"
          />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">Despesas por historico (top 10)</h3>
          <div v-if="chartData.despesasPorHistorico.length === 0" class="flex h-[280px] items-center justify-center text-sm text-slate-500">Sem dados para o periodo.</div>
          <ApexChart
            v-else
            type="bar"
            height="280"
            :options="historicoOptions"
            :series="historicoSeries"
          />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 xl:col-span-2">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">Pagamentos por dia</h3>
          <div v-if="chartData.pagamentosPorDia.length === 0" class="flex h-[290px] items-center justify-center text-sm text-slate-500">Sem pagamentos no intervalo selecionado.</div>
          <ApexChart
            v-else
            type="area"
            height="290"
            :options="dailyOptions"
            :series="dailySeries"
          />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">Situacao dos titulos</h3>
          <div v-if="chartData.situacao.length === 0" class="flex h-[280px] items-center justify-center text-sm text-slate-500">Sem dados para o periodo.</div>
          <ApexChart
            v-else
            type="donut"
            height="280"
            :options="situacaoOptions"
            :series="situacaoSeries"
          />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">Despesas por usuario de baixa</h3>
          <div v-if="chartData.despesasPorUsuario.length === 0" class="flex h-[280px] items-center justify-center text-sm text-slate-500">Sem dados para o periodo.</div>
          <ApexChart
            v-else
            type="bar"
            height="280"
            :options="usuarioOptions"
            :series="usuarioSeries"
          />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">Ranking de fornecedores</h3>
          <div v-if="chartData.rankingFornecedores.length === 0" class="flex h-[280px] items-center justify-center text-sm text-slate-500">Sem dados para o periodo.</div>
          <ApexChart
            v-else
            type="bar"
            height="280"
            :options="fornecedorOptions"
            :series="fornecedorSeries"
          />
        </article>

        <article class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <h3 class="mb-2 text-sm font-semibold text-slate-800">Evolucao mensal</h3>
          <div v-if="chartData.evolucaoMensal.length === 0" class="flex h-[280px] items-center justify-center text-sm text-slate-500">Sem dados para o periodo.</div>
          <ApexChart
            v-else
            type="line"
            height="280"
            :options="mensalOptions"
            :series="mensalSeries"
          />
        </article>
      </div>

      <template #fallback>
        <div class="grid gap-4 xl:grid-cols-2">
          <div v-for="idx in 6" :key="idx" class="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"></div>
        </div>
      </template>
    </ClientOnly>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FinanceChartPoint, FinanceDailyPoint, FinanceMonthlyPoint } from '~/composables/useTitulosFinanceiros'

type ChartPayload = {
  despesasPorConta: FinanceChartPoint[]
  despesasPorHistorico: FinanceChartPoint[]
  pagamentosPorDia: FinanceDailyPoint[]
  situacao: FinanceChartPoint[]
  despesasPorUsuario: FinanceChartPoint[]
  rankingFornecedores: FinanceChartPoint[]
  evolucaoMensal: FinanceMonthlyPoint[]
}

const props = defineProps<{
  chartData: ChartPayload
}>()

function currency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const baseGrid = {
  borderColor: '#e2e8f0',
  strokeDashArray: 3
}

const tooltip = {
  y: {
    formatter: (value: number) => currency(value)
  }
}

const contaSeries = computed(() => [
  {
    name: 'Valor',
    data: props.chartData.despesasPorConta.map((item) => item.total)
  }
])

const contaOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sora, sans-serif' },
  plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: props.chartData.despesasPorConta.map((item) => item.label),
    labels: {
      formatter: (value: string) => currency(Number(value))
    }
  },
  colors: ['#0891b2'],
  grid: baseGrid,
  tooltip
}))

const historicoSeries = computed(() => [
  {
    name: 'Valor',
    data: props.chartData.despesasPorHistorico.map((item) => item.total)
  }
])

const historicoOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sora, sans-serif' },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '58%' } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: props.chartData.despesasPorHistorico.map((item) => item.label),
    labels: { rotate: -35, trim: true, hideOverlappingLabels: true }
  },
  yaxis: {
    labels: {
      formatter: (value: number) => currency(value)
    }
  },
  colors: ['#0f766e'],
  grid: baseGrid,
  tooltip
}))

const dailySeries = computed(() => [
  {
    name: 'Pagamentos',
    data: props.chartData.pagamentosPorDia.map((item) => item.total)
  }
])

const dailyOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sora, sans-serif' },
  stroke: { curve: 'smooth', width: 3 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.32,
      opacityTo: 0.03
    }
  },
  xaxis: {
    categories: props.chartData.pagamentosPorDia.map((item) => item.date),
    labels: { rotate: -30, hideOverlappingLabels: true }
  },
  yaxis: {
    labels: {
      formatter: (value: number) => currency(value)
    }
  },
  colors: ['#2563eb'],
  dataLabels: { enabled: false },
  grid: baseGrid,
  tooltip
}))

const situacaoSeries = computed(() => props.chartData.situacao.map((item) => item.total))
const situacaoOptions = computed(() => ({
  chart: { fontFamily: 'Sora, sans-serif' },
  labels: props.chartData.situacao.map((item) => item.label),
  dataLabels: { enabled: true },
  legend: { position: 'bottom' },
  colors: ['#16a34a', '#f59e0b']
}))

const usuarioSeries = computed(() => [
  {
    name: 'Valor',
    data: props.chartData.despesasPorUsuario.map((item) => item.total)
  }
])

const usuarioOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sora, sans-serif' },
  plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: props.chartData.despesasPorUsuario.map((item) => item.label),
    labels: { formatter: (value: string) => currency(Number(value)) }
  },
  colors: ['#7c3aed'],
  grid: baseGrid,
  tooltip
}))

const fornecedorSeries = computed(() => [
  {
    name: 'Valor',
    data: props.chartData.rankingFornecedores.map((item) => item.total)
  }
])

const fornecedorOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sora, sans-serif' },
  plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: props.chartData.rankingFornecedores.map((item) => item.label),
    labels: { formatter: (value: string) => currency(Number(value)) }
  },
  colors: ['#f97316'],
  grid: baseGrid,
  tooltip
}))

const mensalSeries = computed(() => [
  {
    name: 'Pago',
    data: props.chartData.evolucaoMensal.map((item) => item.pago)
  },
  {
    name: 'Pendente',
    data: props.chartData.evolucaoMensal.map((item) => item.pendente)
  },
  {
    name: 'Nominal',
    data: props.chartData.evolucaoMensal.map((item) => item.nominal)
  }
])

const mensalOptions = computed(() => ({
  chart: { toolbar: { show: false }, fontFamily: 'Sora, sans-serif' },
  stroke: { curve: 'smooth', width: [3, 3, 3] },
  dataLabels: { enabled: false },
  xaxis: {
    categories: props.chartData.evolucaoMensal.map((item) => item.month)
  },
  yaxis: {
    labels: { formatter: (value: number) => currency(value) }
  },
  colors: ['#16a34a', '#ef4444', '#334155'],
  grid: baseGrid,
  tooltip
}))
</script>
