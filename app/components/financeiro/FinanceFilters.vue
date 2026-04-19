<template>
  <section class="rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-5">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-slate-500">Painel de filtros</p>
          <p class="mt-1 text-sm text-slate-600">Refine rapidamente o recorte gerencial dos titulos financeiros.</p>
        </div>
        <p class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {{ filteredCount }} titulos no recorte
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in quickPeriodOptions"
          :key="option.value"
          type="button"
          :class="[
            'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
            internalValue.quickPeriod === option.value
              ? 'bg-slate-900 text-white shadow'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          ]"
          :disabled="loading"
          @click="internalValue.quickPeriod = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label class="md:col-span-2 xl:col-span-2">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Busca geral</span>
          <input
            v-model="internalValue.search"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            placeholder="Numero, fornecedor, historico, usuario, conta..."
            :disabled="loading"
          >
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Campo de data</span>
          <select
            v-model="internalValue.dateField"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="data_emissao">Data de emissao</option>
            <option value="data_vencimento">Data de vencimento</option>
            <option value="data_baixa">Data de baixa</option>
            <option value="data_ultimo_pagamento">Data do ultimo pagamento</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Situacao</span>
          <select
            v-model="internalValue.situacao"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todas</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
            <option value="parcial">Parcial</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Data inicial</span>
          <input
            v-model="internalValue.startDate"
            type="date"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading || internalValue.quickPeriod === 'todos'"
          >
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Data final</span>
          <input
            v-model="internalValue.endDate"
            type="date"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading || internalValue.quickPeriod === 'todos'"
          >
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Fornecedor</span>
          <select
            v-model="internalValue.fornecedor"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todos os fornecedores</option>
            <option v-for="item in options.fornecedores" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Historico</span>
          <select
            v-model="internalValue.historico"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todos os historicos</option>
            <option v-for="item in options.historicos" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Usuario de baixa</span>
          <select
            v-model="internalValue.usuarioNome"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todos os usuarios</option>
            <option v-for="item in options.usuariosNome" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Login de baixa</span>
          <select
            v-model="internalValue.usuarioLogin"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todos os logins</option>
            <option v-for="item in options.usuariosLogin" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Conta caixa/banco</span>
          <select
            v-model="internalValue.contaCaixa"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todas as contas</option>
            <option v-for="item in options.contasCaixa" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tipo de conta</span>
          <select
            v-model="internalValue.tipoConta"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todos os tipos</option>
            <option v-for="item in options.tiposConta" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Forma de pagamento</span>
          <select
            v-model="internalValue.formaPagamento"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todas as formas</option>
            <option v-for="item in options.formasPagamento" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tipo de movimento</span>
          <select
            v-model="internalValue.tipoMovimento"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
            :disabled="loading"
          >
            <option value="todos">Todos os movimentos</option>
            <option v-for="item in options.tiposMovimento" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="$emit('clear')"
        >
          Limpar filtros
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="$emit('refresh')"
        >
          <svg :class="{ 'animate-spin': loading }" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12a9 9 0 101.76-5.36M3 4v4h4" />
          </svg>
          Atualizar dados
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FinanceFilterOptions, FinanceFiltersState, FinanceQuickPeriod } from '~/composables/useTitulosFinanceiros'

defineProps<{
  options: FinanceFilterOptions
  loading?: boolean
  filteredCount: number
}>()

const modelValue = defineModel<FinanceFiltersState>({ required: true })

defineEmits<{
  clear: []
  refresh: []
}>()

const quickPeriodOptions: Array<{ value: FinanceQuickPeriod; label: string }> = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: 'ultimos_7_dias', label: 'Ultimos 7 dias' },
  { value: 'mes_atual', label: 'Mes atual' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: 'ano_atual', label: 'Ano atual' },
  { value: 'personalizado', label: 'Personalizado' },
  { value: 'todos', label: 'Todos' }
]

const internalValue = computed({
  get: () => modelValue.value,
  set: (next) => {
    modelValue.value = next
  }
})
</script>
