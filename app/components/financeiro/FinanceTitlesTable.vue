<template>
  <section class="rounded-3xl border border-slate-200/70 bg-white/90 shadow-[0_24px_55px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Tabela inteligente</p>
        <p class="mt-1 text-sm text-slate-600">Ordenacao por coluna, paginacao e leitura detalhada de cada titulo.</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-500">
          Linhas
          <select
            class="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
            :value="pageSize"
            @change="emit('page-size-change', Number(($event.target as HTMLSelectElement).value))"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="loading" class="p-10">
      <div class="space-y-3">
        <div v-for="idx in 7" :key="idx" class="h-9 animate-pulse rounded-lg bg-slate-100"></div>
      </div>
    </div>

    <div v-else-if="rows.length === 0" class="p-12 text-center">
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2a4 4 0 114 0v2m-7 0h10a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-sm font-semibold text-slate-900">Nenhum titulo encontrado</h3>
      <p class="mt-1 text-sm text-slate-500">Ajuste os filtros para visualizar resultados.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-[1720px] divide-y divide-slate-200">
        <thead class="bg-slate-50/80">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :class="[
                'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500',
                column.align === 'right' ? 'text-right' : ''
              ]"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1 hover:text-slate-700"
                @click="emit('sort', column.key)"
              >
                {{ column.label }}
                <span
                  v-if="sort.key === column.key"
                  class="text-cyan-600"
                >
                  {{ sort.order === 'asc' ? '▲' : '▼' }}
                </span>
              </button>
            </th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Acoes</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          <tr
            v-for="row in rows"
            :key="row.id"
            :class="rowClass(row)"
          >
            <td class="px-3 py-2.5 text-xs">
              <span :class="['rounded-full px-2 py-1 text-[10px] font-semibold uppercase', statusClass(row.status_resolvido)]">
                {{ row.status_label }}
              </span>
            </td>
            <td class="px-3 py-2.5 text-sm font-semibold text-slate-800">{{ row.numero_titulo || '--' }}</td>
            <td class="px-3 py-2.5 text-xs text-slate-700">{{ row.sufixo ?? '--' }}</td>
            <td class="max-w-[220px] truncate px-3 py-2.5 text-xs text-slate-700" :title="row.fornecedor || '--'">{{ row.fornecedor || '--' }}</td>
            <td class="max-w-[220px] truncate px-3 py-2.5 text-xs text-slate-700" :title="row.historico || '--'">{{ row.historico || '--' }}</td>
            <td class="max-w-[220px] truncate px-3 py-2.5 text-xs text-slate-700" :title="row.complemento || '--'">{{ row.complemento || '--' }}</td>
            <td class="px-3 py-2.5 text-right text-xs font-semibold text-slate-800">{{ formatCurrencyBRL(row.valor_nominal) }}</td>
            <td class="px-3 py-2.5 text-right text-xs font-semibold text-emerald-700">{{ formatCurrencyBRL(row.valor_pago) }}</td>
            <td class="px-3 py-2.5 text-right text-xs font-semibold text-amber-700">{{ formatCurrencyBRL(row.valor_pendente) }}</td>
            <td class="px-3 py-2.5 text-xs text-slate-700">{{ formatDateBR(row.data_emissao) }}</td>
            <td class="px-3 py-2.5 text-xs text-slate-700">{{ formatDateBR(row.data_vencimento) }}</td>
            <td class="px-3 py-2.5 text-xs text-slate-700">{{ formatDateBR(row.data_ultimo_pagamento) }}</td>
            <td class="px-3 py-2.5 text-xs text-slate-700">{{ formatDateBR(row.data_baixa) }}</td>
            <td class="px-3 py-2.5 text-xs">
              <span class="rounded-lg bg-cyan-50 px-2 py-1 font-semibold text-cyan-700">{{ row.forma_pagamento || '--' }}</span>
            </td>
            <td class="px-3 py-2.5 text-xs">
              <span class="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-700">{{ row.conta_caixa || '--' }}</span>
            </td>
            <td class="px-3 py-2.5 text-xs">
              <span class="rounded-lg bg-violet-50 px-2 py-1 font-semibold text-violet-700">{{ row.tipo_conta || '--' }}</span>
            </td>
            <td class="px-3 py-2.5 text-xs text-slate-700">{{ row.usuario_baixa }}</td>
            <td class="px-3 py-2.5 text-xs">
              <span class="rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-700">{{ row.tipo_movimento || '--' }}</span>
            </td>
            <td class="max-w-[180px] truncate px-3 py-2.5 text-xs text-slate-700" :title="row.origem_lancamento || '--'">{{ row.origem_lancamento || '--' }}</td>
            <td class="px-3 py-2.5 text-xs">
              <button
                type="button"
                class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100"
                @click="emit('open', row)"
              >
                Ver detalhes
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="rows.length > 0"
      class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 sm:px-5"
    >
      <p>
        Exibindo {{ startItem }} - {{ endItem }} de {{ totalRows }} titulos
      </p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="page <= 1"
          @click="emit('page-change', page - 1)"
        >
          Anterior
        </button>
        <span class="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold">Pagina {{ page }} de {{ totalPages }}</span>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="page >= totalPages"
          @click="emit('page-change', page + 1)"
        >
          Proxima
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FinanceSortKey, FinanceSortState, FinanceStatus, TituloFinanceiroView } from '~/composables/useTitulosFinanceiros'
import { formatCurrencyBRL, formatDateBR } from '~/composables/useTitulosFinanceiros'

const props = defineProps<{
  rows: TituloFinanceiroView[]
  loading?: boolean
  totalRows: number
  page: number
  totalPages: number
  pageSize: number
  sort: FinanceSortState
  highValueThreshold: number
}>()

const emit = defineEmits<{
  sort: [key: FinanceSortKey]
  'page-change': [page: number]
  'page-size-change': [size: number]
  open: [row: TituloFinanceiroView]
}>()

const columns: Array<{ key: FinanceSortKey; label: string; align?: 'left' | 'right' }> = [
  { key: 'status_resolvido', label: 'Status' },
  { key: 'numero_titulo', label: 'Numero titulo' },
  { key: 'sufixo', label: 'Sufixo' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'historico', label: 'Historico' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'valor_nominal', label: 'Valor nominal', align: 'right' },
  { key: 'valor_pago', label: 'Valor pago', align: 'right' },
  { key: 'valor_pendente', label: 'Valor pendente', align: 'right' },
  { key: 'data_emissao', label: 'Data emissao' },
  { key: 'data_vencimento', label: 'Data vencimento' },
  { key: 'data_ultimo_pagamento', label: 'Data ultimo pagamento' },
  { key: 'data_baixa', label: 'Data baixa' },
  { key: 'forma_pagamento', label: 'Forma pagamento' },
  { key: 'conta_caixa', label: 'Conta caixa/banco' },
  { key: 'tipo_conta', label: 'Tipo conta' },
  { key: 'usuario_baixa', label: 'Usuario baixa' },
  { key: 'tipo_movimento', label: 'Tipo movimento' },
  { key: 'origem_lancamento', label: 'Origem lancamento' }
]

const startItem = computed(() => {
  if (props.totalRows === 0) return 0
  return (props.page - 1) * props.pageSize + 1
})

const endItem = computed(() => {
  const value = props.page * props.pageSize
  return Math.min(value, props.totalRows)
})

function statusClass(status: FinanceStatus) {
  if (status === 'pago') return 'bg-emerald-100 text-emerald-700'
  if (status === 'parcial') return 'bg-violet-100 text-violet-700'
  if (status === 'vencido') return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-700'
}

function rowClass(row: TituloFinanceiroView) {
  if (row.status_resolvido === 'vencido') return 'bg-rose-50/50 hover:bg-rose-50'
  if (props.highValueThreshold > 0 && row.valor_referencia >= props.highValueThreshold) return 'bg-amber-50/40 hover:bg-amber-50/70'
  return 'hover:bg-slate-50'
}
</script>
