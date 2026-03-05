<template>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4 flex flex-col md:flex-row items-center justify-between">
    
    <!-- Busca por texto -->
    <div class="relative w-full md:w-96">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
      </div>
      <input
        v-model="internalValue.search"
        type="text"
        placeholder="Buscar por código ou nome..."
        class="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white sm:text-sm transition-colors"
        :disabled="loading"
      />
    </div>

    <div class="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
      <!-- Filtro: Departamento -->
      <div class="flex-shrink-0">
        <select
          v-model="internalValue.departamento"
          class="block w-full pl-3 pr-10 py-2 border border-slate-300 bg-slate-50 text-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm focus:bg-white transition-colors"
          :disabled="loading"
        >
          <option value="Todos">Todos os Departamentos</option>
          <option v-for="dept in DEPARTAMENTOS" :key="dept" :value="dept">
            {{ dept }}
          </option>
        </select>
      </div>

      <!-- Filtro: Local da Falta -->
      <div class="flex-shrink-0">
        <select
          v-model="internalValue.localFalta"
          class="block w-full pl-3 pr-10 py-2 border border-slate-300 bg-slate-50 text-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm focus:bg-white transition-colors"
          :disabled="loading"
        >
          <option value="todos">Todas as Rupturas</option>
          <option value="ambas">Falta em Ambas (Assú e Mossoró)</option>
          <option value="assu">Faltando Apenas em Assú</option>
          <option value="mossoro">Faltando Apenas em Mossoró</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RupturaFilter } from '~/pages/index.vue'

const props = defineProps<{
  modelValue: RupturaFilter
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RupturaFilter]
}>()

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Hardcoded categories based on initial Supabase query for immediate UX
const DEPARTAMENTOS = [
  'DECORACAO',
  'ELETRODOMESTICO',
  'ELETRONICOS',
  'ELETROPORTATEIS',
  'ESPORTE E LAZER',
  'INFORMATICA',
  'MÓVEIS'
]
</script>
