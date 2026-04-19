<template>
  <div class="relative min-h-screen bg-slate-100">
    <div class="print-hide pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.14),transparent_40%)]"></div>

    <header class="print-hide sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div class="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-11 w-11 rounded-xl bg-slate-900/95 ring-1 ring-slate-800/20 flex items-center justify-center">
            <img src="/LOGONEW .png" alt="Logo Lojao" class="h-8 w-auto" />
          </div>
          <div class="leading-tight">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Supply Intelligence</p>
            <p class="text-sm font-semibold text-slate-900">Rupturas Lojao</p>
          </div>
        </div>

        <div class="hidden md:flex items-center gap-2">
          <nav class="flex items-center gap-1 rounded-full bg-slate-100 p-1">
            <NuxtLink
              to="/"
              :class="[
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                isRupturasRoute ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              ]"
            >
              Rupturas
            </NuxtLink>
            <NuxtLink
              to="/tabela-preco"
              :class="[
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                isTabelaPrecoRoute ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              ]"
            >
              Tabela de Preco
            </NuxtLink>
            <NuxtLink
              to="/financeiro/titulos"
              :class="[
                'rounded-full px-3 py-1 text-xs font-semibold transition',
                isFinanceiroRoute ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              ]"
            >
              Financeiro
            </NuxtLink>
          </nav>

          <div class="hidden lg:flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Deposito Central -> Assu / Mossoro
          </div>
        </div>
      </div>
    </header>

    <main class="relative mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()

const isRupturasRoute = computed(() => route.path === '/')
const isTabelaPrecoRoute = computed(() => route.path.startsWith('/tabela-preco'))
const isFinanceiroRoute = computed(() => route.path.startsWith('/financeiro'))
</script>
