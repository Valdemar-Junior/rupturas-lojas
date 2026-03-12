<template>
  <div class="w-full">
    <div v-if="emptyState" class="p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </div>
      <h3 class="text-sm font-semibold text-slate-900">Nenhum item encontrado</h3>
      <p class="mt-1 text-sm text-slate-500">Ajuste os filtros para visualizar as rupturas de deposito.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-[980px] w-full divide-y divide-slate-200">
        <thead class="bg-slate-50/80">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Classificacao</th>
            <th
              v-if="showCorGradeColumn"
              class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-orange-50/60"
            >
              Cor/Grade em loja
            </th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Assu</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Mossoro</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Deposito</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-200/80">
          <tr
            v-for="produto in produtos"
            :key="produto.id"
            class="transition-colors hover:bg-gradient-to-r hover:from-orange-50/60 hover:to-transparent"
          >
            <td class="px-6 py-4">
              <div class="flex flex-col gap-1.5">
                <div class="text-sm font-semibold text-slate-900 leading-snug break-words">
                  {{ produto.nome_produto || '-' }}
                </div>
                <div class="text-xs text-slate-500">
                  <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">Cod: {{ produto.codigo_modelo }}</span>
                </div>
              </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-slate-900">{{ produto.departamento || '-' }}</div>
              <div class="text-xs text-slate-500">{{ produto.grupo || '-' }} / {{ produto.subgrupo || '-' }}</div>
            </td>

            <td v-if="showCorGradeColumn" class="px-6 py-4">
              <span class="inline-flex items-center rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-800 ring-1 ring-inset ring-orange-200 break-all">
                {{ resolveCorGrade(produto) }}
              </span>
            </td>

            <td class="px-6 py-4 text-center">
              <span :class="saldoClass(produto.saldo_assu)">
                {{ formatNumber(produto.saldo_assu) }}
              </span>
            </td>

            <td class="px-6 py-4 text-center">
              <span :class="saldoClass(produto.saldo_mossoro)">
                {{ formatNumber(produto.saldo_mossoro) }}
              </span>
            </td>

            <td class="px-6 py-4 text-center">
              <span class="inline-flex items-center justify-center min-w-14 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                {{ formatNumber(produto.saldo_deposito) }}
              </span>
            </td>

            <td class="px-6 py-4 text-center">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 ring-1 ring-inset ring-red-300/70 whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
                {{ resolveStatus(produto) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProdutoEstoque } from '~/types/supabase'

const props = defineProps<{
  produtos: ProdutoEstoque[]
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

function saldoClass(value: number | string | null) {
  const hasSaldo = toNumber(value) > 0
  if (hasSaldo) {
    return 'inline-flex items-center justify-center min-w-14 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-300'
  }
  return 'inline-flex items-center justify-center min-w-14 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600'
}

function resolveCorGrade(produto: ProdutoEstoque) {
  const detalhes = produto.detalhes_grades_em_loja?.trim()
  if (detalhes && detalhes.toUpperCase() !== 'EMPTY') return detalhes

  const cor = produto.cor?.trim()
  if (cor) return cor

  return '-'
}

function hasCorGradeValue(produto: ProdutoEstoque) {
  const detalhes = produto.detalhes_grades_em_loja?.trim()
  if (detalhes && detalhes.toUpperCase() !== 'EMPTY') return true

  const cor = produto.cor?.trim()
  return Boolean(cor)
}

const showCorGradeColumn = computed(() => props.produtos.some(hasCorGradeValue))

function resolveStatus(produto: ProdutoEstoque) {
  const assu = toNumber(produto.saldo_assu)
  const mossoro = toNumber(produto.saldo_mossoro)

  if (assu > 0 && mossoro > 0) return 'Assu + Mossoro'
  if (assu > 0) return 'Assu'
  return 'Mossoro'
}
</script>
