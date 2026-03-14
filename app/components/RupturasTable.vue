<template>
  <div class="w-full">
    <div v-if="emptyState" class="p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 class="text-sm font-semibold text-slate-900">Nenhum produto encontrado</h3>
      <p class="mt-1 text-sm text-slate-500">Ajuste os filtros para visualizar os itens em ruptura.</p>
    </div>

    <div v-else class="overflow-x-auto print-overflow-reset">
      <table class="min-w-full divide-y divide-slate-200 print-report-table">
        <thead class="bg-slate-50/80">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Classificacao</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Deposito</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-red-50/70">Assu</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-red-50/70">Mossoro</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-200/80">
          <tr
            v-for="produto in produtos"
            :key="produto.codigo_modelo || produto.nome_produto || Math.random().toString()"
            class="transition-colors hover:bg-gradient-to-r hover:from-cyan-50/60 hover:to-transparent"
          >
            <td class="px-6 py-4">
              <div class="flex flex-col gap-1.5">
                <div class="text-sm font-semibold text-slate-900 leading-snug break-words">
                  {{ produto.nome_produto || '-' }}
                </div>
                <div class="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                  <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">Cod: {{ produto.codigo_modelo || '-' }}</span>
                  <span v-if="produto.cor" class="text-slate-400">Cor: {{ produto.cor }}</span>
                </div>
                <div
                  v-if="produto.possui_grade === 'Sim' && produto.detalhes_grades_disponiveis"
                  class="text-xs rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-cyan-900 break-words"
                >
                  <span class="font-semibold">Grades no deposito:</span> {{ produto.detalhes_grades_disponiveis }}
                </div>
              </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-slate-900">{{ produto.departamento || '-' }}</div>
              <div class="text-xs text-slate-500">{{ produto.grupo || '-' }} / {{ produto.subgrupo || '-' }}</div>
            </td>

            <td class="px-6 py-4 text-center">
              <span class="inline-flex items-center justify-center min-w-14 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                {{ formatNumber(produto.qtd_total_deposito) }}
              </span>
            </td>

            <td class="px-6 py-4 text-center border-l border-slate-100">
              <SaldoBadge :saldo="produto.saldo_assu" />
            </td>

            <td class="px-6 py-4 text-center border-l border-slate-100">
              <SaldoBadge :saldo="produto.saldo_mossoro" />
            </td>

            <td class="px-6 py-4 text-center">
              <StatusBadge :saldo-assu="produto.saldo_assu" :saldo-mossoro="produto.saldo_mossoro" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h } from 'vue'
import type { ProdutoRuptura } from '~/types/supabase'

defineProps<{
  produtos: ProdutoRuptura[]
  emptyState?: boolean
}>()

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return 0
}

function formatNumber(val: number | string | null) {
  const num = toNumber(val)
  return Number.isInteger(num) ? num.toString() : num.toFixed(2).replace(/\.00$/, '')
}

const SaldoBadge = defineComponent({
  props: { saldo: { type: [Number, String], default: 0 } },
  setup(props) {
    return () => {
      const num = toNumber(props.saldo)
      const isRuptura = num <= 0

      if (isRuptura) {
        return h('span', { class: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-red-100 text-red-700 ring-1 ring-inset ring-red-300' }, [
          h('svg', { class: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M6 18L18 6M6 6l12 12' })
          ]),
          '0'
        ])
      }

      return h('span', { class: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-300' }, [
        h('svg', { class: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 13l4 4L19 7' })
        ]),
        formatNumber(num)
      ])
    }
  }
})

const StatusBadge = defineComponent({
  props: {
    saldoAssu: { type: [Number, String], default: 0 },
    saldoMossoro: { type: [Number, String], default: 0 }
  },
  setup(props) {
    return () => {
      const assu = toNumber(props.saldoAssu)
      const mossoro = toNumber(props.saldoMossoro)
      const critico = assu <= 0 && mossoro <= 0

      if (critico) {
        return h('span', { class: 'inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 ring-1 ring-inset ring-red-300/70' }, [
          h('svg', { class: 'h-3.5 w-3.5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z' })
          ]),
          'Critico'
        ])
      }

      return h('span', { class: 'inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-300/80' }, [
        h('svg', { class: 'h-3.5 w-3.5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.949a1 1 0 00.95.69h4.15c.969 0 1.371 1.24.588 1.81l-3.357 2.439a1 1 0 00-.364 1.118l1.286 3.949c.3.921-.755 1.688-1.538 1.118l-3.357-2.439a1 1 0 00-1.176 0l-3.357 2.439c-.783.57-1.838-.197-1.539-1.118l1.287-3.949a1 1 0 00-.364-1.118L2.98 9.376c-.783-.57-.38-1.81.588-1.81h4.149a1 1 0 00.951-.69l1.286-3.949z' })
        ]),
        'Atencao'
      ])
    }
  }
})
</script>
