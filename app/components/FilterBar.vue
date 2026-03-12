<template>
  <div class="rounded-3xl border border-slate-200/60 bg-white/80 backdrop-blur-xl p-4 sm:p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)]">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.18em] text-slate-500">Filtros inteligentes</p>
        <p class="text-sm text-slate-600 mt-1">
          {{ mode === 'ruptura-loja' ? 'Ruptura na loja com estoque no deposito.' : 'Ruptura em deposito com estoque em loja.' }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto">
        <label class="relative block md:col-span-2 min-w-[260px]">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
          </span>
          <input
            v-model="internalValue.search"
            type="text"
            placeholder="Buscar por codigo ou nome..."
            class="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50/80 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-white transition"
            :disabled="loading"
          />
        </label>

        <select
          v-model="internalValue.departamento"
          class="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50/80 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-white transition"
          :disabled="loading"
        >
          <option value="Todos">Todos os departamentos</option>
          <option v-for="dept in departamentos" :key="dept" :value="dept">
            {{ dept }}
          </option>
        </select>

        <select
          v-model="internalValue.localFalta"
          class="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50/80 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:bg-white transition"
          :disabled="loading"
        >
          <option v-for="option in localOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RupturaFilter } from '~/pages/index.vue'

type DashboardMode = 'ruptura-loja' | 'ruptura-deposito'

const props = defineProps<{
  modelValue: RupturaFilter
  mode: DashboardMode
  departamentos: string[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RupturaFilter]
}>()

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const localOptions = computed(() => {
  if (props.mode === 'ruptura-loja') {
    return [
      { value: 'todos', label: 'Todas as rupturas' },
      { value: 'ambas', label: 'Falta em Assu e Mossoro' },
      { value: 'assu', label: 'Faltando apenas em Assu' },
      { value: 'mossoro', label: 'Faltando apenas em Mossoro' }
    ]
  }

  return [
    { value: 'todos', label: 'Todas as rupturas de deposito' },
    { value: 'assu', label: 'Com estoque em Assu' },
    { value: 'mossoro', label: 'Com estoque em Mossoro' }
  ]
})
</script>
