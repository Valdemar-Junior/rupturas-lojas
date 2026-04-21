import { createError } from 'h3'
import type { RuntimeMailConfigInput } from './report-email'
import { getFinanceiroSupabaseServiceClient } from './supabase-service'

const DEFAULT_EMAIL_CONFIG_TABLE = 'relatorio_email_configuracoes'

interface EmailConfigRow {
  id: number
  smtp_host: string | null
  smtp_port: number | null
  smtp_secure: boolean | null
  smtp_user: string | null
  smtp_pass: string | null
  email_from: string | null
  email_to: string | null
  email_cc: string | null
  subject_prefix: string | null
  updated_at: string | null
  created_at: string | null
}

export interface EmailConfigFormInput {
  smtpHost?: string
  smtpPort?: number | string
  smtpSecure?: boolean
  smtpUser?: string
  smtpPass?: string
  emailFrom?: string
  emailTo?: string
  emailCc?: string
  subjectPrefix?: string
}

export interface EmailConfigUiData {
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

interface RuntimeSeed {
  host?: string
  port?: number
  secure?: boolean
  user?: string
  pass?: string
  from?: string
  toText?: string
  ccText?: string
  subjectPrefix?: string
}

function getEmailConfigTableName(): string {
  return process.env.RELATORIO_EMAIL_CONFIG_TABLE?.trim() || DEFAULT_EMAIL_CONFIG_TABLE
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const typed = error as { code?: string; message?: string; details?: string }
  const code = (typed.code || '').trim().toUpperCase()
  if (code === '42P01' || code === 'PGRST205') return true

  const message = `${typed.message || ''} ${typed.details || ''}`.toLowerCase()
  return message.includes('could not find the table') || message.includes('schema cache')
}

function mapSupabaseError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const generic = error as { message?: string; details?: string; hint?: string }
  const message = generic.message?.trim()
  const details = generic.details?.trim()

  if (message && details) return `${message} ${details}`
  if (message) return message
  return fallback
}

function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinRecipients(list: string[]): string {
  return list.join(', ')
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parsePort(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

async function loadEmailConfigRow(options?: { throwOnMissingTable?: boolean }): Promise<EmailConfigRow | null> {
  const supabase = getFinanceiroSupabaseServiceClient()
  const table = getEmailConfigTableName()
  const throwOnMissingTable = options?.throwOnMissingTable ?? false

  const { data, error } = await supabase
    .from(table)
    .select('id,smtp_host,smtp_port,smtp_secure,smtp_user,smtp_pass,email_from,email_to,email_cc,subject_prefix,updated_at,created_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(1)

  if (error) {
    if (isMissingTableError(error) && !throwOnMissingTable) {
      return null
    }

    if (isMissingTableError(error) && throwOnMissingTable) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${table}" nao encontrada. Crie a tabela de configuracao de e-mail antes de salvar.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: mapSupabaseError(error, 'Erro ao consultar configuracao de e-mail.')
    })
  }

  const rows = (data as EmailConfigRow[]) || []
  return rows[0] || null
}

function getEnvSeed(): RuntimeSeed {
  const host = process.env.SMTP_HOST?.trim() || undefined
  const port = parsePort(process.env.SMTP_PORT?.trim())
  const secureByEnv =
    (process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true'
      ? true
      : typeof port === 'number'
        ? port === 465
        : undefined
  const user = process.env.SMTP_USER?.trim() || undefined
  const pass = process.env.SMTP_PASS?.trim() || undefined
  const from = (process.env.REPORT_EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || '').trim() || undefined
  const toText = process.env.REPORT_EMAIL_TO?.trim() || undefined
  const ccText = process.env.REPORT_EMAIL_CC?.trim() || undefined
  const subjectPrefix = process.env.REPORT_EMAIL_SUBJECT_PREFIX?.trim() || undefined

  return {
    host,
    port: port || undefined,
    secure: secureByEnv,
    user,
    pass,
    from,
    toText,
    ccText,
    subjectPrefix
  }
}

function getRowSeed(row: EmailConfigRow | null): RuntimeSeed {
  if (!row) return {}

  return {
    host: row.smtp_host?.trim() || undefined,
    port: parsePort(row.smtp_port) || undefined,
    secure: typeof row.smtp_secure === 'boolean' ? row.smtp_secure : undefined,
    user: row.smtp_user?.trim() || undefined,
    pass: row.smtp_pass?.trim() || undefined,
    from: row.email_from?.trim() || undefined,
    toText: row.email_to?.trim() || undefined,
    ccText: row.email_cc?.trim() || undefined,
    subjectPrefix: row.subject_prefix?.trim() || undefined
  }
}

function resolveRequired(
  label: string,
  inputValue: unknown,
  fallbackValue: string | undefined
): string {
  const fromInput = cleanText(inputValue)
  if (fromInput) return fromInput
  if (fallbackValue) return fallbackValue

  throw createError({
    statusCode: 400,
    statusMessage: `Campo obrigatorio nao informado: ${label}.`
  })
}

function resolveOptionalText(inputValue: unknown, fallbackValue: string | undefined): string | undefined {
  if (typeof inputValue === 'string') {
    const trimmed = inputValue.trim()
    return trimmed || undefined
  }
  return fallbackValue
}

function resolvePort(inputValue: unknown, fallbackValue: number | undefined): number {
  const parsedInput = parsePort(inputValue)
  if (parsedInput) return parsedInput
  if (fallbackValue) return fallbackValue

  throw createError({
    statusCode: 400,
    statusMessage: 'Campo obrigatorio nao informado: smtpPort.'
  })
}

function resolveSecure(inputValue: unknown, fallbackValue: boolean | undefined, port: number): boolean {
  if (typeof inputValue === 'boolean') return inputValue
  if (fallbackValue !== undefined) return fallbackValue
  return port === 465
}

function buildRuntimeConfig(input: EmailConfigFormInput, seed?: RuntimeSeed): RuntimeMailConfigInput {
  const host = resolveRequired('smtpHost', input.smtpHost, seed?.host)
  const port = resolvePort(input.smtpPort, seed?.port)
  const user = resolveRequired('smtpUser', input.smtpUser, seed?.user)
  const pass = resolveRequired('smtpPass', input.smtpPass, seed?.pass)
  const from = resolveRequired('emailFrom', input.emailFrom, seed?.from)
  const emailToText = resolveRequired('emailTo', input.emailTo, seed?.toText)
  const to = parseRecipients(emailToText)

  if (to.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe ao menos um destinatario em emailTo.'
    })
  }

  const ccText = resolveOptionalText(input.emailCc, seed?.ccText)
  const cc = parseRecipients(ccText)
  const subjectPrefix = resolveOptionalText(input.subjectPrefix, seed?.subjectPrefix)
  const secure = resolveSecure(input.smtpSecure, seed?.secure, port)

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    to,
    cc,
    subjectPrefix
  }
}

function toUiData(config: RuntimeMailConfigInput): EmailConfigUiData {
  return {
    smtpHost: config.host,
    smtpPort: config.port,
    smtpSecure: !!config.secure,
    smtpUser: config.user,
    smtpPass: '',
    emailFrom: config.from,
    emailTo: joinRecipients(config.to),
    emailCc: joinRecipients(config.cc || []),
    subjectPrefix: config.subjectPrefix || ''
  }
}

function tryBuildRuntimeConfigFromRow(row: EmailConfigRow | null): RuntimeMailConfigInput | null {
  if (!row) return null

  try {
    return buildRuntimeConfig({}, getRowSeed(row))
  } catch {
    return null
  }
}

function tryBuildRuntimeConfigFromEnv(): RuntimeMailConfigInput | null {
  try {
    return buildRuntimeConfig({}, getEnvSeed())
  } catch {
    return null
  }
}

export async function getEmailConfigForUi(): Promise<{
  configured: boolean
  hasPassword: boolean
  source: 'database' | 'env' | 'none'
  table: string
  data: EmailConfigUiData
}> {
  const row = await loadEmailConfigRow()
  const table = getEmailConfigTableName()

  if (row) {
    const runtime = tryBuildRuntimeConfigFromRow(row)
    if (runtime) {
      return {
        configured: true,
        hasPassword: !!row.smtp_pass?.trim(),
        source: 'database',
        table,
        data: toUiData(runtime)
      }
    }
  }

  const envRuntime = tryBuildRuntimeConfigFromEnv()
  if (envRuntime) {
    return {
      configured: true,
      hasPassword: !!process.env.SMTP_PASS?.trim(),
      source: 'env',
      table,
      data: toUiData(envRuntime)
    }
  }

  return {
    configured: false,
    hasPassword: false,
    source: 'none',
    table,
    data: {
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      smtpPass: '',
      emailFrom: '',
      emailTo: '',
      emailCc: '',
      subjectPrefix: ''
    }
  }
}

export async function buildRuntimeConfigForEmailTest(input: EmailConfigFormInput): Promise<RuntimeMailConfigInput> {
  const row = await loadEmailConfigRow()
  const rowSeed = getRowSeed(row)
  const envSeed = getEnvSeed()
  const mergedSeed: RuntimeSeed = {
    ...envSeed,
    ...rowSeed
  }

  return buildRuntimeConfig(input, mergedSeed)
}

export async function saveEmailConfig(input: EmailConfigFormInput): Promise<{
  hasPassword: boolean
  source: 'database'
  table: string
  data: EmailConfigUiData
}> {
  const table = getEmailConfigTableName()
  const row = await loadEmailConfigRow({ throwOnMissingTable: true })
  const rowSeed = getRowSeed(row)
  const runtime = buildRuntimeConfig(input, rowSeed)
  const supabase = getFinanceiroSupabaseServiceClient()
  const rowId = row?.id || 1

  const payload = {
    id: rowId,
    smtp_host: runtime.host,
    smtp_port: runtime.port,
    smtp_secure: runtime.secure,
    smtp_user: runtime.user,
    smtp_pass: runtime.pass,
    email_from: runtime.from,
    email_to: joinRecipients(runtime.to),
    email_cc: joinRecipients(runtime.cc || []),
    subject_prefix: runtime.subjectPrefix || null,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    if (isMissingTableError(error)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${table}" nao encontrada. Crie a tabela de configuracao de e-mail antes de salvar.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: mapSupabaseError(error, 'Erro ao salvar configuracao de e-mail.')
    })
  }

  return {
    hasPassword: true,
    source: 'database',
    table,
    data: toUiData(runtime)
  }
}

export async function getStoredEmailConfigForSending(): Promise<RuntimeMailConfigInput | null> {
  const row = await loadEmailConfigRow()
  return tryBuildRuntimeConfigFromRow(row)
}
