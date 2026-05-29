<template>
  <div class="relative min-h-screen bg-slate-100">
    <div class="print-hide pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.14),transparent_40%)]"></div>

    <header class="print-hide sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div class="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-12 items-center justify-center rounded-2xl bg-white/90 px-3 shadow-sm ring-1 ring-slate-200/80">
            <img src="/LOGONEW .png" alt="Logo Lojao" class="h-9 w-auto object-contain" />
          </div>
          <div class="leading-tight">
            <p class="text-sm font-semibold text-slate-900">Painel de Gestao</p>
          </div>
        </div>

        <div class="hidden md:flex items-center">
          <nav class="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-2 py-1 shadow-sm backdrop-blur-sm">
            <NuxtLink
              to="/"
              :class="[
                'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
                isRupturasRoute ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              ]"
            >
              Rupturas
            </NuxtLink>
            <NuxtLink
              to="/tabela-preco"
              :class="[
                'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
                isTabelaPrecoRoute ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              ]"
            >
              Tabela de Preco
            </NuxtLink>
            <NuxtLink
              to="/financeiro/relatorio-diario"
              @click.prevent="handleFinanceiroClick"
              :class="[
                'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
                isFinanceiroRoute ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              ]"
            >
              Financeiro
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>

    <main class="relative mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'

const route = useRoute()
const router = useRouter()
const { isUnlocked, syncFromSession, unlockWithPassword } = useFinanceiroAccess()

const isRupturasRoute = computed(() => route.path === '/')
const isTabelaPrecoRoute = computed(() => route.path.startsWith('/tabela-preco'))
const isFinanceiroRoute = computed(() => route.path.startsWith('/financeiro'))

onMounted(() => {
  syncFromSession()
})

async function handleFinanceiroClick() {
  if (isUnlocked.value) {
    await router.push('/financeiro/relatorio-diario')
    return
  }

  const password = window.prompt('Digite a senha de administrador para acessar o Financeiro:')

  if (password === null) {
    return
  }

  if (!unlockWithPassword(password)) {
    window.alert('Senha incorreta. Acesso ao Financeiro negado.')
    return
  }

  await router.push('/financeiro/relatorio-diario')
}
</script>
