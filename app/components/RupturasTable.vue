<template>
  <div class="w-full">
    <div v-if="emptyState" class="p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 class="text-sm font-medium text-slate-900">Nenhum produto encontrado</h3>
      <p class="mt-1 text-sm text-slate-500">Ajuste os filtros ou tente buscar por outro termo.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Produto
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Classificação
            </th>
            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
              Depósito (Matriz)
            </th>
            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider bg-red-50/50">
              Loja Assú
            </th>
            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider bg-red-50/50">
              Loja Mossoró
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-200">
          <tr v-for="produto in produtos" :key="produto.codigo_modelo || Math.random().toString()" class="hover:bg-slate-50 transition-colors">
            <!-- Coluna Produto -->
            <td class="px-6 py-4">
              <div class="flex flex-col gap-1">
                <div class="text-sm font-medium text-slate-900 leading-snug whitespace-normal break-words">
                  {{ produto.nome_produto || '-' }}
                </div>
                
                <div class="text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">Cód: {{ produto.codigo_modelo || '-' }}</span>
                  <span v-if="produto.cor && produto.cor.toLowerCase() !== 'padrao'" class="text-xs text-slate-400 capitalize">&bull; Cor: {{ produto.cor }}</span>
                </div>

                <!-- Detalhes de Grade Direto na Tabela -->
                <div v-if="produto.possui_grade === 'Sim'" class="mt-1.5 bg-blue-50 border border-blue-100 rounded p-2 text-xs text-blue-800 whitespace-normal break-words">
                  <span class="font-semibold block mb-0.5">Grades no Depósito:</span>
                  {{ produto.detalhes_grades_disponiveis && produto.detalhes_grades_disponiveis !== 'EMPTY' ? produto.detalhes_grades_disponiveis : 'Nenhuma informação detalhada de grade encontrada.' }}
                </div>
              </div>
            </td>
            
            <!-- Coluna Classificacao -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-slate-900">{{ produto.departamento || '-' }}</div>
              <div class="text-xs text-slate-500">{{ produto.grupo || '-' }} / {{ produto.subgrupo || '-' }}</div>
            </td>

            <!-- Coluna Deposito -->
            <td class="px-6 py-4 whitespace-nowrap text-center">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                {{ formatNumber(produto.qtd_total_deposito) }}
              </span>
            </td>

            <!-- Coluna Assu -->
            <td class="px-6 py-4 whitespace-nowrap text-center border-l border-slate-100">
              <SaldoBadge :saldo="produto.saldo_assu" />
            </td>

            <!-- Coluna Mossoro -->
            <td class="px-6 py-4 whitespace-nowrap text-center border-l border-slate-100">
              <SaldoBadge :saldo="produto.saldo_mossoro" />
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

function formatNumber(val: number | string | null) {
  if (val === null || val === undefined) return '0'
  const num = typeof val === 'string' ? parseFloat(val) : val
  return Number.isInteger(num) ? num.toString() : num.toFixed(2).replace(/\.00$/, '')
}

// Sub-component for rendering the Saldo Badge gracefully
const SaldoBadge = defineComponent({
  props: { saldo: { type: [Number, String], default: 0 } },
  setup(props) {
    return () => {
      const num = typeof props.saldo === 'string' ? parseFloat(props.saldo) : (props.saldo || 0)
      const isRuptura = num <= 0

      if (isRuptura) {
        return h('span', { class: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-bold bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20' }, [
          h('svg', { class: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M6 18L18 6M6 6l12 12'})
          ]),
          '0'
        ])
      } else {
        const displayVal = Number.isInteger(num) ? num.toString() : num.toFixed(2).replace(/\.00$/, '')
        return h('span', { class: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' }, [
          h('svg', { class: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
            h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 13l4 4L19 7'})
          ]),
          displayVal
        ])
      }
    }
  }
})
</script>
