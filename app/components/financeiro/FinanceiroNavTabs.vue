<template>
  <section class="rounded-2xl border border-slate-200/70 bg-white/90 p-2 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
    <nav class="flex flex-wrap items-center gap-1">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        :class="[
          'rounded-xl px-3 py-2 text-xs font-semibold transition',
          isActive(tab.to)
            ? 'bg-slate-900 text-white shadow'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        ]"
      >
        {{ tab.label }}
      </NuxtLink>
    </nav>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()

const tabs = [
  {
    to: '/financeiro/titulos',
    label: 'Titulos financeiros'
  },
  {
    to: '/financeiro/relatorio-diario',
    label: 'Relatorio diario'
  },
  {
    to: '/financeiro/configuracoes',
    label: 'Configuracoes'
  }
]

function isActive(path: string) {
  return route.path.startsWith(path)
}
</script>
