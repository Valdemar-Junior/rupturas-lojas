<template>
  <div class="space-y-6">
    <section v-if="emailMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {{ emailMessage }}
    </section>

    <section v-if="emailError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ emailError }}
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.6)]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Configuracoes</p>
          <h2 class="mt-1 text-lg font-bold text-slate-900">SMTP e destinatarios do relatorio diario</h2>
          <p class="mt-1 text-sm text-slate-600">
            Esta area fica separada da operacao do dia. Ajuste remetente, destinatarios e valide o envio com um e-mail de teste.
          </p>
          <p class="mt-2 text-xs font-semibold text-slate-500">
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
            :disabled="emailSavePending || emailTestPending"
            @click="saveEmailSettings"
          >
            {{ emailSavePending ? 'Salvando...' : 'Salvar configuracao' }}
          </button>

          <button
            type="button"
            class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="emailSavePending || emailTestPending"
            @click="sendEmailTest"
          >
            {{ emailTestPending ? 'Enviando teste...' : 'Enviar e-mail de teste' }}
          </button>
        </div>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

      <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <input
            v-model="emailConfig.smtpSecure"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          >
          <span class="text-sm text-slate-700">Conexao segura (SSL/TLS)</span>
        </label>

        <label class="block">
          <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Data para teste</span>
          <input
            v-model="selectedDate"
            type="date"
            class="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white"
          >
        </label>
      </div>

      <p v-if="smtpConfigHint" class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {{ smtpConfigHint }}
      </p>

      <p class="mt-3 text-xs text-slate-500">
        Se a senha ja estiver salva, deixe o campo de senha em branco para manter a atual.
      </p>

      <p class="mt-1 text-xs font-semibold text-slate-500">
        Senha SMTP cadastrada: {{ emailHasPassword ? 'sim' : 'nao' }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

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
const emailMessage = ref('')
const emailError = ref('')

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

onMounted(() => {
  void loadEmailConfig()
})
</script>
