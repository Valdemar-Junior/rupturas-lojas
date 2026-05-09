<template>
  <div class="space-y-6">
    <FinanceiroNavTabs />

    <section class="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-7 text-white sm:px-8">
      <div class="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-300/15 blur-3xl"></div>

      <div class="relative max-w-3xl">
        <p class="text-xs uppercase tracking-[0.22em] text-cyan-100/90">Financeiro</p>
        <h1 class="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Configuracoes do relatorio diario</h1>
        <p class="mt-2 text-sm text-cyan-50 sm:text-base">
          Area reservada para e-mail e parametros tecnicos. A operacao do dia continua enxuta na aba de relatorio.
        </p>
      </div>
    </section>

    <FinanceiroEmailSettingsPanel />
  </div>
</template>

<script setup lang="ts">
import FinanceiroEmailSettingsPanel from '~/components/financeiro/FinanceiroEmailSettingsPanel.vue'
import FinanceiroNavTabs from '~/components/financeiro/FinanceiroNavTabs.vue'
</script>
