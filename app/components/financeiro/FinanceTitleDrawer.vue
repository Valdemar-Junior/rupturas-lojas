<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-slate-950/45"
        @click="emit('close')"
      ></div>
    </Transition>

    <Transition name="slide">
      <aside
        v-if="open && title"
        class="fixed inset-y-0 right-0 z-[60] w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-[0_24px_54px_-30px_rgba(15,23,42,0.65)] sm:p-6"
      >
        <header class="mb-4 flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Detalhes do titulo</p>
            <h2 class="mt-1 text-lg font-extrabold tracking-tight text-slate-900">{{ title.numero_titulo || '--' }}</h2>
            <p class="mt-1 text-xs text-slate-600">Status: {{ title.status_label }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            @click="emit('close')"
          >
            Fechar
          </button>
        </header>

        <div class="space-y-5">
          <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 class="text-sm font-semibold text-slate-800">Identificacao</h3>
            <dl class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">ID registro</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.id }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">ID titulo</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.titulo_id }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">ID baixa</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.baixa_id ?? '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Chave unica</dt>
                <dd class="mt-1 break-all text-sm font-semibold text-slate-900">{{ title.chave_unica }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Sufixo</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.sufixo ?? '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Situacao original</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.situacao_titulo || '--' }}</dd>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 class="text-sm font-semibold text-slate-800">Valores</h3>
            <dl class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor nominal</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrencyBRL(title.valor_nominal) }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor pago</dt>
                <dd class="mt-1 text-sm font-semibold text-emerald-700">{{ formatCurrencyBRL(title.valor_pago) }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor pendente</dt>
                <dd class="mt-1 text-sm font-semibold text-amber-700">{{ formatCurrencyBRL(title.valor_pendente) }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Valor baixa</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatCurrencyBRL(title.valor_baixa) }}</dd>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 class="text-sm font-semibold text-slate-800">Datas</h3>
            <dl class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Data emissao</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatDateBR(title.data_emissao) }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Data vencimento</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatDateBR(title.data_vencimento) }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Data ultimo pagamento</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatDateBR(title.data_ultimo_pagamento) }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Data baixa</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ formatDateBR(title.data_baixa) }}</dd>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 class="text-sm font-semibold text-slate-800">Classificacoes e responsavel</h3>
            <dl class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Fornecedor</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.fornecedor || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Historico</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.historico || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tipo titulo</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.tipo_titulo || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Forma pagamento</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.forma_pagamento || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Conta caixa</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.conta_caixa || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tipo conta</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.tipo_conta || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Usuario nome</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.usuario_nome || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Usuario login</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.usuario_login || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tipo movimento</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.tipo_movimento || '--' }}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Origem lancamento</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-900">{{ title.origem_lancamento || '--' }}</dd>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 class="text-sm font-semibold text-slate-800">Complemento completo</h3>
            <p class="mt-2 whitespace-pre-wrap text-sm text-slate-700">{{ title.complemento || '--' }}</p>
          </section>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { TituloFinanceiroView } from '~/composables/useTitulosFinanceiros'
import { formatCurrencyBRL, formatDateBR } from '~/composables/useTitulosFinanceiros'

defineProps<{
  open: boolean
  title: TituloFinanceiroView | null
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0.75;
}
</style>
