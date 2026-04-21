<template>
  <div class="space-y-6">
    <FinanceiroNavTabs />

    <section class="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-900 px-6 py-7 text-white sm:px-8">
      <div class="absolute -right-14 -top-10 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl"></div>
      <div class="absolute -left-10 -bottom-14 h-44 w-44 rounded-full bg-orange-200/20 blur-3xl"></div>

      <div class="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.22em] text-cyan-100/90">Financeiro Diario</p>
          <h1 class="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Relatorio automatico de receita e pagamentos</h1>
          <p class="mt-2 text-sm text-cyan-50 sm:text-base">
            Consolidado diario com creditos do extrato, titulos pagos e carteira pendente. Disparo automatico previsto para 17:00 (America/Fortaleza) via cron da Vercel.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <label class="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs">
            <span class="mr-2 font-semibold">Data</span>
            <input
              v-model="selectedDate"
              type="date"
              class="rounded-md border border-white/30 bg-transparent px-2 py-1 text-xs text-white outline-none"
            >
          </label>
          <button
            type="button"
            class="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/20"
            :disabled="pending"
            @click="loadReport"
          >
            {{ pending ? 'Atualizando...' : 'Atualizar dados' }}
          </button>
          <button
            type="button"
            class="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
            @click="openPreview"
          >
            Preview HTML
          </button>
          <button
            type="button"
            class="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-cyan-200"
            @click="openPdf"
          >
            Gerar PDF manual
          </button>
          <button
            type="button"
            class="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="emailManualSendPending || pending || emailConfigPending"
            @click="sendManualReportEmail"
          >
            {{ emailManualSendPending ? 'Enviando e-mail...' : 'Enviar e-mail agora' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="emailMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {{ emailMessage }}
    </section>

    <section v-if="emailError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ emailError }}
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Extrato bancario</p>
          <h2 class="mt-1 text-base font-bold text-slate-900">Upload do PDF do dia</h2>
          <p class="mt-1 text-sm text-slate-600">
            Selecione o extrato em PDF para extrair os creditos e alimentar o relatorio automaticamente.
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
            Selecionar PDF
          </button>

          <button
            type="button"
            class="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="uploadPending || !selectedFile"
            @click="uploadExtrato"
          >
            {{ uploadPending ? 'Enviando...' : 'Enviar extrato' }}
          </button>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <label class="block">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Data de referencia</span>
          <input
            v-model="selectedDate"
            type="date"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
          >
        </label>

        <label class="block">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Banco/conta</span>
          <input
            v-model="uploadBank"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
            placeholder="Sicredi"
          >
        </label>

        <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <input v-model="replaceExisting" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500">
          <span class="text-sm text-slate-700">Substituir lancamentos do dia</span>
        </label>
      </div>

      <p class="mt-3 text-sm text-slate-600">
        Arquivo selecionado:
        <span class="font-semibold text-slate-900">{{ selectedFile ? selectedFile.name : 'nenhum arquivo' }}</span>
      </p>

      <p v-if="persistedExtratoInfo" class="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
        PDF salvo no banco para {{ formatDate(persistedExtratoInfo.dataReferencia) }}:
        <strong>{{ persistedExtratoInfo.fileName }}</strong> ({{ formatBytes(persistedExtratoInfo.sizeBytes) }})
      </p>

      <p v-if="uploadMessage" class="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        {{ uploadMessage }}
      </p>

      <p v-if="uploadError" class="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ uploadError }}
      </p>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Configuracao de e-mail</p>
          <h2 class="mt-1 text-base font-bold text-slate-900">SMTP para envio do relatorio</h2>
          <p class="mt-1 text-sm text-slate-600">
            Configure remetente e destinatarios e use o envio de teste para validar antes do disparo automatico.
          </p>
          <p class="mt-1 text-xs font-semibold text-slate-500">
            Origem atual: {{ emailSourceLabel }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="emailConfigPending"
            @click="loadEmailConfig"
          >
            {{ emailConfigPending ? 'Carregando...' : 'Recarregar config' }}
          </button>

          <button
            type="button"
            class="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="emailSavePending || emailTestPending || emailManualSendPending"
            @click="saveEmailSettings"
          >
            {{ emailSavePending ? 'Salvando...' : 'Salvar configuracao' }}
          </button>

          <button
            type="button"
            class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="emailSavePending || emailTestPending || emailManualSendPending"
            @click="sendEmailTest"
          >
            {{ emailTestPending ? 'Enviando teste...' : 'Enviar e-mail de teste' }}
          </button>

        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">SMTP host</span>
          <input
            v-model="emailConfig.smtpHost"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
            placeholder="smtp.gmail.com"
          >
        </label>

        <label class="block">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">SMTP porta</span>
          <input
            v-model.number="emailConfig.smtpPort"
            type="number"
            min="1"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
          >
        </label>

        <label class="block">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">SMTP usuario</span>
          <input
            v-model="emailConfig.smtpUser"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
            placeholder="usuario@dominio.com"
          >
        </label>

        <label class="block">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">SMTP senha</span>
          <input
            v-model="emailConfig.smtpPass"
            type="password"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
            placeholder="Digite somente para alterar"
          >
        </label>

        <label class="block md:col-span-2">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Remetente (from)</span>
          <input
            v-model="emailConfig.emailFrom"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
            placeholder="Financeiro <financeiro@empresa.com>"
          >
        </label>

        <label class="block md:col-span-2">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Destinatarios (to)</span>
          <input
            v-model="emailConfig.emailTo"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
            placeholder="financeiro@empresa.com, diretoria@empresa.com"
          >
        </label>

        <label class="block md:col-span-2">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">CC (opcional)</span>
          <input
            v-model="emailConfig.emailCc"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
            placeholder="controladoria@empresa.com"
          >
        </label>

        <label class="block md:col-span-2">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Prefixo do assunto (opcional)</span>
          <input
            v-model="emailConfig.subjectPrefix"
            type="text"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
            placeholder="[Lojao]"
          >
        </label>
      </div>

      <label class="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <input
          v-model="emailConfig.smtpSecure"
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        >
        <span class="text-sm text-slate-700">Conexao segura (SSL/TLS)</span>
      </label>

      <p v-if="smtpConfigHint" class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {{ smtpConfigHint }}
      </p>

      <p class="mt-3 text-xs text-slate-500">
        Se a senha ja estiver salva, deixe o campo de senha em branco para manter a atual.
      </p>

      <p class="mt-1 text-xs font-semibold text-slate-500">
        Senha SMTP cadastrada: {{ emailHasPassword ? 'sim' : 'nao' }}
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
        <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Pendentes ate hoje</p>
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
              <th class="px-3 py-2">Fornecedor</th>
              <th class="px-3 py-2">Historico</th>
              <th class="px-3 py-2">Complemento</th>
              <th class="px-3 py-2">Conta caixa/banco</th>
              <th class="px-3 py-2">Forma pgto</th>
              <th class="px-3 py-2">Data baixa</th>
              <th class="px-3 py-2 text-right">Valor pago</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="item in report?.titulosPagosNoDia || []" :key="`${item.numeroTitulo}-${item.valorPago}-${item.dataBaixa}`">
              <td class="px-3 py-2">{{ item.numeroTitulo }}</td>
              <td class="px-3 py-2">{{ item.fornecedor }}</td>
              <td class="px-3 py-2">{{ item.historico }}</td>
              <td class="px-3 py-2">{{ item.complemento }}</td>
              <td class="px-3 py-2">{{ item.contaCaixaBanco }}</td>
              <td class="px-3 py-2">{{ item.formaPagamento }}</td>
              <td class="px-3 py-2">{{ formatDate(item.dataBaixa) }}</td>
              <td class="px-3 py-2 text-right font-semibold text-rose-700">{{ formatCurrency(item.valorPago) }}</td>
            </tr>
            <tr v-if="!report || report.titulosPagosNoDia.length === 0">
              <td colspan="8" class="px-3 py-8 text-center text-sm text-slate-500">Nenhum titulo pago encontrado.</td>
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
import { computed, onMounted, reactive, ref } from 'vue'
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
  fornecedor: string
  historico: string
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

type EmailConfigSource = 'database' | 'env' | 'none'

type EmailConfigPayload = {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPass: string
  emailFrom: string
  emailTo: string
  emailCc: string
  subjectPrefix: string
}

const selectedDate = ref(getTodayInputDate())
const pending = ref(false)
const errorMessage = ref('')
const report = ref<ReportPayload | null>(null)
const uploadPending = ref(false)
const selectedFile = ref<File | null>(null)
const uploadBank = ref('Conta principal')
const replaceExisting = ref(true)
const uploadMessage = ref('')
const uploadError = ref('')
const persistedExtratoInfo = ref<{ fileName: string; sizeBytes: number; dataReferencia: string } | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const emailConfig = reactive<EmailConfigPayload>({
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  emailFrom: '',
  emailTo: '',
  emailCc: '',
  subjectPrefix: ''
})
const emailConfigSource = ref<EmailConfigSource>('none')
const emailHasPassword = ref(false)
const emailConfigPending = ref(false)
const emailSavePending = ref(false)
const emailTestPending = ref(false)
const emailManualSendPending = ref(false)
const emailMessage = ref('')
const emailError = ref('')

const saldoClass = computed(() => {
  const value = report.value?.saldoDoDia || 0
  return value >= 0 ? 'text-emerald-700' : 'text-rose-700'
})

const emailSourceLabel = computed(() => {
  if (emailConfigSource.value === 'database') return 'Banco de dados (customizada)'
  if (emailConfigSource.value === 'env') return 'Variaveis de ambiente'
  return 'Nao configurada'
})

const smtpConfigHint = computed(() => {
  const host = (emailConfig.smtpHost || '').trim().toLowerCase()
  const port = Number(emailConfig.smtpPort)
  if (!host.includes('gmail')) return ''

  if (emailConfig.smtpSecure && port === 587) {
    return 'Gmail: com SSL/TLS marcado use porta 465. Para porta 587, desmarque SSL/TLS.'
  }

  if (!emailConfig.smtpSecure && port === 465) {
    return 'Gmail: com porta 465 marque SSL/TLS.'
  }

  return 'Gmail recomendado: SMTP usuario completo, senha de app (16 caracteres), from como e-mail valido.'
})

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
        data: selectedDate.value
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

  try {
    const fileResponse = await $fetch<{
      success: boolean
      dataReferencia: string
      exists: boolean
      fileName: string | null
      sizeBytes: number
    }>('/api/financeiro/relatorio/extrato-arquivo', {
      query: {
        data: selectedDate.value
      }
    })

    if (fileResponse.exists && fileResponse.fileName) {
      persistedExtratoInfo.value = {
        fileName: fileResponse.fileName,
        sizeBytes: Number(fileResponse.sizeBytes || 0),
        dataReferencia: fileResponse.dataReferencia
      }
    } else {
      persistedExtratoInfo.value = null
    }
  } catch {
    persistedExtratoInfo.value = null
  }
}

function openPreview() {
  window.open(`/api/financeiro/relatorio/preview?data=${selectedDate.value}`, '_blank')
}

function openPdf() {
  window.open(`/api/financeiro/relatorio/pdf?data=${selectedDate.value}`, '_blank')
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
  persistedExtratoInfo.value = null
}

function clearEmailFeedback() {
  emailMessage.value = ''
  emailError.value = ''
}

function buildEmailConfigPayload() {
  return {
    smtpHost: emailConfig.smtpHost,
    smtpPort: emailConfig.smtpPort,
    smtpSecure: emailConfig.smtpSecure,
    smtpUser: emailConfig.smtpUser,
    smtpPass: emailConfig.smtpPass,
    emailFrom: emailConfig.emailFrom,
    emailTo: emailConfig.emailTo,
    emailCc: emailConfig.emailCc,
    subjectPrefix: emailConfig.subjectPrefix
  }
}

async function loadEmailConfig() {
  emailConfigPending.value = true
  clearEmailFeedback()

  try {
    const response = await $fetch<{
      success: boolean
      configured: boolean
      hasPassword: boolean
      source: EmailConfigSource
      data: EmailConfigPayload
    }>('/api/financeiro/relatorio/email-config')

    emailConfig.smtpHost = response.data.smtpHost || ''
    emailConfig.smtpPort = Number(response.data.smtpPort) || 587
    emailConfig.smtpSecure = !!response.data.smtpSecure
    emailConfig.smtpUser = response.data.smtpUser || ''
    emailConfig.smtpPass = ''
    emailConfig.emailFrom = response.data.emailFrom || ''
    emailConfig.emailTo = response.data.emailTo || ''
    emailConfig.emailCc = response.data.emailCc || ''
    emailConfig.subjectPrefix = response.data.subjectPrefix || ''

    emailConfigSource.value = response.source
    emailHasPassword.value = response.hasPassword
  } catch (error: any) {
    console.error(error)
    emailError.value = error?.data?.statusMessage || error?.message || 'Falha ao carregar configuracao de e-mail.'
  } finally {
    emailConfigPending.value = false
  }
}

async function saveEmailSettings() {
  emailSavePending.value = true
  clearEmailFeedback()

  try {
    const response = await $fetch<{
      success: boolean
      message: string
      hasPassword: boolean
      source: EmailConfigSource
      data: EmailConfigPayload
    }>('/api/financeiro/relatorio/email-config', {
      method: 'POST',
      body: buildEmailConfigPayload()
    })

    emailConfig.smtpHost = response.data.smtpHost || ''
    emailConfig.smtpPort = Number(response.data.smtpPort) || 587
    emailConfig.smtpSecure = !!response.data.smtpSecure
    emailConfig.smtpUser = response.data.smtpUser || ''
    emailConfig.smtpPass = ''
    emailConfig.emailFrom = response.data.emailFrom || ''
    emailConfig.emailTo = response.data.emailTo || ''
    emailConfig.emailCc = response.data.emailCc || ''
    emailConfig.subjectPrefix = response.data.subjectPrefix || ''

    emailConfigSource.value = response.source
    emailHasPassword.value = response.hasPassword
    emailMessage.value = response.message || 'Configuracao de e-mail salva com sucesso.'
  } catch (error: any) {
    console.error(error)
    emailError.value = error?.data?.statusMessage || error?.message || 'Falha ao salvar configuracao de e-mail.'
  } finally {
    emailSavePending.value = false
  }
}

async function sendEmailTest() {
  emailTestPending.value = true
  clearEmailFeedback()

  try {
    const response = await $fetch<{
      success: boolean
      message: string
      destinatarios: string[]
      dataReferencia: string
    }>('/api/financeiro/relatorio/email-test', {
      method: 'POST',
      body: {
        ...buildEmailConfigPayload(),
        data: selectedDate.value
      }
    })

    emailConfig.smtpPass = ''
    emailHasPassword.value = true
    emailMessage.value = `${response.message} Destinatarios: ${response.destinatarios.join(', ')}`
  } catch (error: any) {
    console.error(error)
    emailError.value = error?.data?.statusMessage || error?.message || 'Falha ao enviar e-mail de teste.'
  } finally {
    emailTestPending.value = false
  }
}

async function sendManualReportEmail() {
  if (!isValidIsoDate(selectedDate.value)) {
    emailError.value = 'Data invalida para envio. Selecione uma data valida.'
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
        exigir_credito: true
      }
    })

    const destinatarios = response.destinatarios?.length
      ? response.destinatarios.join(', ')
      : 'destinatarios nao informados'

    const extratoNome = response.anexoExtrato?.fileName || 'extrato.pdf'
    const extratoSize = Number(response.anexoExtrato?.sizeBytes || 0)
    const extratoSizeKb = extratoSize > 0 ? `${(extratoSize / 1024).toFixed(1)} KB` : '--'

    emailMessage.value = `Relatorio enviado com sucesso (${response.dataReferencia}). Destinatarios: ${destinatarios}. Extrato anexado: ${extratoNome} (${extratoSizeKb}).`
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
    formData.append('banco', uploadBank.value || 'Conta principal')
    formData.append('substituir', String(replaceExisting.value))

    const response = await $fetch<{
      success: boolean
      dataReferencia: string
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

    uploadMessage.value = `Extrato enviado com sucesso. ${response.registrosInseridos} creditos inseridos para ${response.dataReferencia}. PDF salvo: ${extratoNome} (${formatBytes(extratoSize)}).`
    persistedExtratoInfo.value = {
      fileName: extratoNome,
      sizeBytes: extratoSize,
      dataReferencia: response.dataReferencia
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

onMounted(() => {
  void loadReport()
  void loadEmailConfig()
})
</script>
