<template>
  <div class="space-y-6">
    <FinanceiroNavTabs />

    <section class="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 px-6 py-7 text-white sm:px-8">
      <div class="absolute -right-14 -top-10 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl"></div>
      <div class="absolute -left-10 -bottom-14 h-44 w-44 rounded-full bg-orange-200/20 blur-3xl"></div>

      <div class="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.22em] text-cyan-100/90">Financeiro Diario</p>
          <h1 class="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Relatorio automatico de receita e pagamentos</h1>
          <p class="mt-2 text-sm text-cyan-50 sm:text-base">
            Primeiro escolha a conta caixa/banco do ERP. Depois suba o extrato dessa mesma conta para consolidar creditos, pagos e pendentes.
          </p>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
            <span class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">Data do movimento</span>
            <input
              v-model="selectedDate"
              type="date"
              class="mt-2 w-full rounded-xl border border-white/25 bg-slate-950/20 px-3 py-2 text-sm text-white outline-none"
            >
          </label>

          <label class="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
            <span class="block text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">Conta caixa/banco</span>
            <select
              v-model="selectedConta"
              class="finance-account-select mt-2 w-full rounded-xl border border-white/35 bg-slate-950/70 px-3 py-2 text-sm font-medium text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            >
              <option value="">Selecione a conta</option>
              <option v-for="option in accountOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
        </div>
      </div>
    </section>

    <section class="grid gap-3 lg:grid-cols-4">
      <article
        v-for="step in flowSteps"
        :key="step.title"
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">{{ step.index }}</p>
        <h2 class="mt-2 text-sm font-bold text-slate-900">{{ step.title }}</h2>
        <p class="mt-1 text-sm text-slate-600">{{ step.description }}</p>
      </article>
    </section>

    <section v-if="emailMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {{ emailMessage }}
    </section>

    <section v-if="emailError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ emailError }}
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Operacao do dia</p>
          <h2 class="mt-1 text-lg font-bold text-slate-900">Subir extrato da conta selecionada</h2>
          <p class="mt-1 text-sm text-slate-600">
            A conta escolhida acima define quais titulos pagos e pendentes do ERP entram no consolidado. O upload abaixo apenas envia o extrato dessa conta.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            ref="fileInputRef"
            type="file"
            accept="application/pdf"
            class="hidden"
            @change="onFileChange"
          >

          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            @click="openFilePicker"
          >
            Selecionar extrato PDF
          </button>

          <button
            type="button"
            class="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="uploadPending || !selectedFile || !selectedConta"
            @click="uploadExtrato"
          >
            {{ uploadPending ? 'Processando...' : 'Ler e consolidar extrato' }}
          </button>
        </div>
      </div>

      <div class="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div class="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          <p class="font-semibold">Contexto atual</p>
          <p class="mt-1">Data: {{ formatDate(selectedDate) }}</p>
          <p class="mt-1">Conta ERP: {{ selectedConta || 'nao selecionada' }}</p>
        </div>

        <div class="grid gap-3">
          <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <input v-model="replaceExisting" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
            <span class="text-sm text-slate-700">Substituir creditos ja importados dessa conta nessa data</span>
          </label>

          <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <input v-model="groupPaidBySupplier" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
            <span class="text-sm text-slate-700">Agrupar titulos pagos por fornecedor</span>
          </label>
        </div>

        <NuxtLink
          to="/financeiro/configuracoes"
          class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Configurar e-mail
        </NuxtLink>
      </div>

      <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Arquivo selecionado</p>
        <p class="mt-1 text-sm font-semibold text-slate-900">{{ selectedFile ? selectedFile.name : 'Nenhum arquivo escolhido' }}</p>
      </div>

      <p v-if="persistedExtratoInfo" class="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
        PDF salvo para {{ formatDate(persistedExtratoInfo.dataReferencia) }} em <strong>{{ persistedExtratoInfo.banco }}</strong>:
        <strong>{{ persistedExtratoInfo.fileName }}</strong> ({{ formatBytes(persistedExtratoInfo.sizeBytes) }})
      </p>

      <p v-if="uploadMessage" class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {{ uploadMessage }}
      </p>

      <p v-if="uploadError" class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ uploadError }}
      </p>
    </section>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
        <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Creditos do extrato</p>
        <p class="mt-1 text-xl font-bold text-emerald-700">{{ formatCurrency(report?.totalCreditosExtrato || 0) }}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
        <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Titulos pagos no dia</p>
        <p class="mt-1 text-xl font-bold text-rose-700">{{ formatCurrency(report?.totalTitulosPagosNoDia || 0) }}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
        <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Pendentes ate a data</p>
        <p class="mt-1 text-xl font-bold text-amber-700">{{ formatCurrency(report?.totalTitulosPendentesAteHoje || 0) }}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
        <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Saldo do dia</p>
        <p class="mt-1 text-xl font-bold" :class="saldoClass">{{ formatCurrency(report?.saldoDoDia || 0) }}</p>
      </article>
    </section>

    <section v-if="errorMessage" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ errorMessage }}
    </section>

    <section v-if="report && report.avisos.length" class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 class="text-sm font-semibold text-amber-900">Avisos de consistencia</h2>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
        <li v-for="warning in report.avisos" :key="warning">{{ warning }}</li>
      </ul>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Saida do relatorio</p>
          <h2 class="mt-1 text-base font-bold text-slate-900">Visualizar, gerar PDF ou enviar</h2>
          <p class="mt-1 text-sm text-slate-600">
            O preview, o PDF e o envio consideram a data, a conta e o modo de exibicao selecionados no topo da tela.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            @click="openPreview"
          >
            Preview HTML
          </button>
          <button
            type="button"
            class="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
            @click="openPdf"
          >
            Gerar PDF
          </button>
          <button
            type="button"
            class="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="emailManualSendPending || pending || !selectedConta"
            @click="sendManualReportEmail"
          >
            {{ emailManualSendPending ? 'Enviando e-mail...' : 'Enviar e-mail agora' }}
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
      <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 class="text-sm font-semibold text-slate-800">Creditos extraidos do extrato</h2>
        <span class="text-xs font-semibold text-slate-500">{{ report?.creditosExtrato.length || 0 }} registros</span>
      </header>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2">Data</th>
              <th class="px-3 py-2">Descricao</th>
              <th class="px-3 py-2">Documento</th>
              <th class="px-3 py-2">Banco</th>
              <th class="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="item in report?.creditosExtrato || []" :key="`${item.dataMovimento}-${item.descricao}-${item.valor}`">
              <td class="px-3 py-2">{{ formatDate(item.dataMovimento) }}</td>
              <td class="px-3 py-2">{{ item.descricao }}</td>
              <td class="px-3 py-2">{{ item.documento }}</td>
              <td class="px-3 py-2">{{ item.banco }}</td>
              <td class="px-3 py-2 text-right font-semibold text-emerald-700">{{ formatCurrency(item.valor) }}</td>
            </tr>
            <tr v-if="!report || report.creditosExtrato.length === 0">
              <td colspan="5" class="px-3 py-8 text-center text-sm text-slate-500">Nenhum credito encontrado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
      <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 class="text-sm font-semibold text-slate-800">Titulos pagos no dia</h2>
        <span class="text-xs font-semibold text-slate-500">{{ report?.titulosPagosNoDia.length || 0 }} registros</span>
      </header>
      <div class="max-h-[360px] overflow-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2">Titulo</th>
              <th class="px-3 py-2">Parcela</th>
              <th class="px-3 py-2">Fornecedor</th>
              <th class="px-3 py-2">Historico</th>
              <th class="px-3 py-2">Login baixa</th>
              <th class="px-3 py-2">Complemento</th>
              <th class="px-3 py-2">Conta caixa/banco</th>
              <th class="px-3 py-2">Forma pgto</th>
              <th class="px-3 py-2">Data baixa</th>
              <th class="px-3 py-2 text-right">Valor pago</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="item in report?.titulosPagosNoDia || []" :key="`${item.numeroTitulo}-${item.parcela}-${item.valorPago}-${item.dataBaixa}`">
              <td class="px-3 py-2">{{ item.numeroTitulo }}</td>
              <td class="px-3 py-2">{{ item.parcela }}</td>
              <td class="px-3 py-2">{{ item.fornecedor }}</td>
              <td class="px-3 py-2">{{ item.historico }}</td>
              <td class="px-3 py-2">{{ item.usuarioLogin }}</td>
              <td class="px-3 py-2">{{ item.complemento }}</td>
              <td class="px-3 py-2">{{ item.contaCaixaBanco }}</td>
              <td class="px-3 py-2">{{ item.formaPagamento }}</td>
              <td class="px-3 py-2">{{ formatDate(item.dataBaixa) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-rose-700">{{ formatCurrency(item.valorPago) }}</td>
            </tr>
            <tr v-if="!report || report.titulosPagosNoDia.length === 0">
              <td colspan="10" class="px-3 py-8 text-center text-sm text-slate-500">Nenhum titulo pago encontrado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
      <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 class="text-sm font-semibold text-slate-800">Pendentes ate a data de referencia</h2>
        <span class="text-xs font-semibold text-slate-500">{{ report?.titulosPendentesAteHoje.length || 0 }} registros</span>
      </header>
      <div class="max-h-[360px] overflow-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2">Titulo</th>
              <th class="px-3 py-2">Fornecedor</th>
              <th class="px-3 py-2">Situacao</th>
              <th class="px-3 py-2">Vencimento</th>
              <th class="px-3 py-2 text-right">Valor pendente</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="item in report?.titulosPendentesAteHoje || []" :key="`${item.numeroTitulo}-${item.valorPendente}-${item.dataVencimento}`">
              <td class="px-3 py-2">{{ item.numeroTitulo }}</td>
              <td class="px-3 py-2">{{ item.fornecedor }}</td>
              <td class="px-3 py-2">{{ item.situacao }}</td>
              <td class="px-3 py-2">{{ formatDate(item.dataVencimento) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-amber-700">{{ formatCurrency(item.valorPendente) }}</td>
            </tr>
            <tr v-if="!report || report.titulosPendentesAteHoje.length === 0">
              <td colspan="5" class="px-3 py-8 text-center text-sm text-slate-500">Nenhum titulo pendente encontrado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import FinanceiroNavTabs from '~/components/financeiro/FinanceiroNavTabs.vue'

type Credito = {
  dataMovimento: string | null
  descricao: string
  documento: string
  banco: string
  valor: number
}

type TituloPago = {
  numeroTitulo: string
  parcela: string
  fornecedor: string
  historico: string
  usuarioLogin: string
  complemento: string
  formaPagamento: string
  contaCaixaBanco: string
  dataBaixa: string | null
  valorPago: number
}

type TituloPendente = {
  numeroTitulo: string
  fornecedor: string
  situacao: string
  dataVencimento: string | null
  valorPendente: number
}

type ReportPayload = {
  dataReferencia: string
  contaSelecionada: string | null
  availableContas: string[]
  geradoEmIso: string
  creditosExtrato: Credito[]
  titulosPagosNoDia: TituloPago[]
  titulosPendentesAteHoje: TituloPendente[]
  totalCreditosExtrato: number
  totalTitulosPagosNoDia: number
  totalTitulosPendentesAteHoje: number
  saldoDoDia: number
  avisos: string[]
}

const selectedDate = ref(getTodayInputDate())
const selectedConta = ref('')
const groupPaidBySupplier = ref(false)
const pending = ref(false)
const errorMessage = ref('')
const report = ref<ReportPayload | null>(null)
const uploadPending = ref(false)
const selectedFile = ref<File | null>(null)
const replaceExisting = ref(true)
const uploadMessage = ref('')
const uploadError = ref('')
const persistedExtratoInfo = ref<{ fileName: string; sizeBytes: number; dataReferencia: string; banco: string } | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const emailManualSendPending = ref(false)
const emailMessage = ref('')
const emailError = ref('')

const flowSteps = [
  {
    index: '01',
    title: 'Escolher a data',
    description: 'Defina a data do movimento financeiro que sera consolidada.'
  },
  {
    index: '02',
    title: 'Selecionar a conta',
    description: 'Escolha a conta caixa/banco do ERP para filtrar pagos e pendentes.'
  },
  {
    index: '03',
    title: 'Subir o extrato',
    description: 'Envie o PDF dessa mesma conta para ler apenas os creditos correspondentes.'
  },
  {
    index: '04',
    title: 'Conferir e enviar',
    description: 'Revise creditos, pagos e pendentes da conta selecionada antes de enviar.'
  }
]

const saldoClass = computed(() => {
  const value = report.value?.saldoDoDia || 0
  return value >= 0 ? 'text-emerald-700' : 'text-rose-700'
})

const accountOptions = computed(() => report.value?.availableContas || [])

function getTodayInputDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '--'
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed)
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test((value || '').trim())
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '--'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

async function loadPersistedExtrato() {
  try {
    const fileResponse = await $fetch<{
      success: boolean
      dataReferencia: string
      exists: boolean
      fileName: string | null
      sizeBytes: number
      latest?: {
        banco?: string | null
      }
    }>('/api/financeiro/relatorio/extrato-arquivo', {
      query: {
        data: selectedDate.value,
        conta: selectedConta.value || undefined
      }
    })

    if (fileResponse.exists && fileResponse.fileName && selectedConta.value) {
      persistedExtratoInfo.value = {
        fileName: fileResponse.fileName,
        sizeBytes: Number(fileResponse.sizeBytes || 0),
        dataReferencia: fileResponse.dataReferencia,
        banco: selectedConta.value
      }
    } else {
      persistedExtratoInfo.value = null
    }
  } catch {
    persistedExtratoInfo.value = null
  }
}

async function loadReport() {
  if (!isValidIsoDate(selectedDate.value)) {
    errorMessage.value = 'Data invalida. Use o formato YYYY-MM-DD no seletor de data.'
    return
  }

  pending.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: ReportPayload }>('/api/financeiro/relatorio/dados', {
      query: {
        data: selectedDate.value,
        conta: selectedConta.value || undefined,
        agrupar_fornecedor: groupPaidBySupplier.value ? '1' : '0'
      }
    })

    report.value = response.data
  } catch (error: any) {
    console.error(error)
    report.value = null
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Falha ao carregar dados do relatorio diario.'
  } finally {
    pending.value = false
  }

  await loadPersistedExtrato()
}

function buildReportQuery() {
  const query = new URLSearchParams({ data: selectedDate.value })
  if (selectedConta.value) {
    query.set('conta', selectedConta.value)
  }
  query.set('agrupar_fornecedor', groupPaidBySupplier.value ? '1' : '0')
  return query.toString()
}

function openPreview() {
  window.open(`/api/financeiro/relatorio/preview?${buildReportQuery()}`, '_blank')
}

function openPdf() {
  window.open(`/api/financeiro/relatorio/pdf?${buildReportQuery()}`, '_blank')
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  selectedFile.value = file || null
  uploadMessage.value = ''
  uploadError.value = ''
}

function clearEmailFeedback() {
  emailMessage.value = ''
  emailError.value = ''
}

async function sendManualReportEmail() {
  if (!isValidIsoDate(selectedDate.value)) {
    emailError.value = 'Data invalida para envio. Selecione uma data valida.'
    return
  }

  if (!selectedConta.value) {
    emailError.value = 'Selecione a conta caixa/banco antes de enviar o relatorio.'
    return
  }

  emailManualSendPending.value = true
  clearEmailFeedback()

  try {
    const response = await $fetch<{
      success: boolean
      dataReferencia: string
      destinatarios: string[]
      messageId: string
      anexoExtrato?: {
        fileName: string
        sizeBytes: number
      }
    }>('/api/financeiro/relatorio/disparar-manual', {
      method: 'POST',
      body: {
        data: selectedDate.value,
        conta: selectedConta.value,
        exigir_credito: true,
        agrupar_fornecedor: groupPaidBySupplier.value
      }
    })

    const destinatarios = response.destinatarios?.length
      ? response.destinatarios.join(', ')
      : 'destinatarios nao informados'

    const extratoNome = response.anexoExtrato?.fileName || 'extrato.pdf'
    const extratoSize = Number(response.anexoExtrato?.sizeBytes || 0)
    const extratoSizeKb = extratoSize > 0 ? `${(extratoSize / 1024).toFixed(1)} KB` : '--'

    emailMessage.value = `Relatorio enviado com sucesso (${response.dataReferencia}) para a conta ${selectedConta.value}. Destinatarios: ${destinatarios}. Extrato anexado: ${extratoNome} (${extratoSizeKb}).`
    await loadReport()
  } catch (error: any) {
    console.error(error)
    emailError.value = error?.data?.statusMessage || error?.message || 'Falha ao enviar relatorio manual.'
  } finally {
    emailManualSendPending.value = false
  }
}

async function uploadExtrato() {
  if (!isValidIsoDate(selectedDate.value)) {
    uploadError.value = 'Data de referencia invalida. Selecione uma data valida antes do upload.'
    return
  }

  if (!selectedConta.value) {
    uploadError.value = 'Selecione a conta caixa/banco antes de enviar o extrato.'
    return
  }

  if (!selectedFile.value) {
    uploadError.value = 'Selecione um arquivo PDF para enviar.'
    return
  }

  uploadPending.value = true
  uploadMessage.value = ''
  uploadError.value = ''

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('data_referencia', selectedDate.value)
    formData.append('banco', selectedConta.value)
    formData.append('substituir', String(replaceExisting.value))

    const response = await $fetch<{
      success: boolean
      dataReferencia: string
      banco: string
      registrosInseridos: number
      arquivoExtrato?: {
        fileName: string
        sizeBytes: number
      }
    }>('/api/financeiro/relatorio/upload-extrato', {
      method: 'POST',
      body: formData
    })

    const extratoNome = response.arquivoExtrato?.fileName || selectedFile.value?.name || 'extrato.pdf'
    const extratoSize = Number(response.arquivoExtrato?.sizeBytes || selectedFile.value?.size || 0)

    uploadMessage.value = `Extrato enviado com sucesso para ${response.banco}. ${response.registrosInseridos} creditos inseridos em ${response.dataReferencia}. PDF salvo: ${extratoNome} (${formatBytes(extratoSize)}).`
    persistedExtratoInfo.value = {
      fileName: extratoNome,
      sizeBytes: extratoSize,
      dataReferencia: response.dataReferencia,
      banco: response.banco
    }
    selectedDate.value = response.dataReferencia

    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
    selectedFile.value = null

    await loadReport()
  } catch (error: any) {
    console.error(error)
    uploadError.value = error?.data?.statusMessage || error?.message || 'Falha ao enviar o extrato PDF.'
  } finally {
    uploadPending.value = false
  }
}

watch([selectedDate, selectedConta, groupPaidBySupplier], ([dateValue, contaValue, agruparValue], [previousDate, previousConta, previousAgrupar]) => {
  if ((dateValue === previousDate && contaValue === previousConta && agruparValue === previousAgrupar) || !isValidIsoDate(dateValue)) return
  uploadMessage.value = ''
  uploadError.value = ''
  emailMessage.value = ''
  emailError.value = ''
  void loadReport()
})

onMounted(() => {
  void loadReport()
})
</script>

<style scoped>
.finance-account-select option {
  background: #0f172a;
  color: #f8fafc;
}
</style>
