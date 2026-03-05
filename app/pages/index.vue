<template>
  <div class="space-y-6">
    <!-- Top Header / Title -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Dashboard de Rupturas</h2>
        <p class="text-slate-500 mt-1">Visão geral de produtos com saldo na matriz e zerados nas filiais.</p>
      </div>
      <button 
        @click="refreshData" 
        class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        :disabled="pending"
      >
        <svg :class="{'animate-spin': pending}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        <span>Atualizar</span>
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 border border-red-200 shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div>
        <h3 class="font-semibold">Erro ao carregar dados</h3>
        <p class="text-sm mt-1">{{ error.message }}</p>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DashboardKpiCard 
        title="Total de Produtos em Ruptura" 
        :value="stats.total" 
        description="Em pelo menos uma das lojas"
        icon="alert-circle"
        color="blue"
        :loading="pending"
      />
      <DashboardKpiCard 
        title="Falta Total (Ambas as Lojas)" 
        :value="stats.ambas" 
        description="Sem estoque em Assú nem Mossoró"
        icon="alert-triangle"
        color="red"
        :loading="pending"
      />
      <DashboardKpiCard 
        title="Falta Parcial" 
        :value="stats.parcial" 
        description="Sem estoque apenas em uma filial"
        icon="info"
        color="amber"
        :loading="pending"
      />
    </div>

    <!-- Controles & Filtros -->
    <FilterBar v-model="filters" :loading="pending" />

    <!-- Tabela de Dados -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <!-- Loading State -->
      <div v-if="pending && !produtos.length" class="p-12 flex flex-col items-center justify-center text-slate-500">
        <svg class="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>Carregando dados das rupturas...</p>
      </div>
      
      <!-- Table -->
      <RupturasTable 
        v-else 
        :produtos="filteredProdutos" 
        :empty-state="produtos.length === 0" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRupturas } from '~/composables/useRupturas'

const { 
  produtos, 
  stats, 
  pending, 
  error, 
  fetchData 
} = useRupturas()

// Initial state filter
export type RupturaFilter = {
  search: string;
  departamento: string;
  localFalta: 'todos' | 'ambas' | 'assu' | 'mossoro';
}

const filters = ref<RupturaFilter>({
  search: '',
  departamento: 'Todos',
  localFalta: 'todos'
})

// Filtragem no Client-Side para UX instantânea (já que são ~200 itens)
const filteredProdutos = computed(() => {
  let result = produtos.value

  // Filtro por termo de busca
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter(p => 
      p.nome_produto?.toLowerCase().includes(searchLower) || 
      p.codigo_modelo?.toLowerCase().includes(searchLower)
    )
  }

  // Filtro por Departamento
  if (filters.value.departamento && filters.value.departamento !== 'Todos') {
    result = result.filter(p => p.departamento === filters.value.departamento)
  }

  // Filtro por Local de Falta
  if (filters.value.localFalta !== 'todos') {
    if (filters.value.localFalta === 'ambas') {
      result = result.filter(p => (p.saldo_assu || 0) <= 0 && (p.saldo_mossoro || 0) <= 0)
    } else if (filters.value.localFalta === 'assu') {
      result = result.filter(p => (p.saldo_assu || 0) <= 0 && (p.saldo_mossoro || 0) > 0)
    } else if (filters.value.localFalta === 'mossoro') {
      result = result.filter(p => (p.saldo_mossoro || 0) <= 0 && (p.saldo_assu || 0) > 0)
    }
  }

  return result
})

async function refreshData() {
  await fetchData()
}

// Auto-fetch on mount is handled inside composable `useAsyncData`, 
// but we just call refresh in case user clicks button
</script>
