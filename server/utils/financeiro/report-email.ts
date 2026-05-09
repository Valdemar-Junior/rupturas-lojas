import { createError } from 'h3'
import nodemailer from 'nodemailer'
import type { DailyFinanceReportData } from './report-types'
import { formatCurrencyBRL, formatDateBR, formatDateRangeBR } from './report-types'

interface MailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  to: string[]
  cc: string[]
  subjectPrefix?: string
}

interface SendDailyFinanceReportEmailInput {
  data: DailyFinanceReportData
  pdfBuffer: Buffer
  extratoPdfBuffer: Buffer
  extratoFileName: string
  extratoMimeType?: string
}

export interface RuntimeMailConfigInput {
  host: string
  port: number
  secure?: boolean
  user: string
  pass: string
  from: string
  to: string[]
  cc?: string[]
  subjectPrefix?: string
}

function parseEmailList(raw: string | undefined): string[] {
  if (!raw) return []

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeRecipients(raw: string[] | undefined): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => item.trim()).filter(Boolean)
}

function isValidEmail(raw: string | undefined): boolean {
  const text = (raw || '').trim()
  if (!text) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
}

function extractMailbox(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null

  const betweenAngles = text.match(/<([^>]+)>/)
  if (betweenAngles?.[1]) {
    const mail = betweenAngles[1].trim()
    return isValidEmail(mail) ? mail.toLowerCase() : null
  }

  return isValidEmail(text) ? text.toLowerCase() : null
}

function normalizeFromAddress(from: string, user: string): string {
  const trimmedFrom = from.trim()
  const fromMailbox = extractMailbox(trimmedFrom)
  if (fromMailbox) return trimmedFrom

  if (!isValidEmail(user)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Campo "SMTP usuario" deve ser um e-mail valido.'
    })
  }

  // Permite usar apenas um nome no campo "from", adotando o e-mail SMTP.
  return `${trimmedFrom} <${user.trim()}>`
}

function assertRecipientsValid(list: string[], label: string): void {
  const invalid = list.find((item) => !isValidEmail(item))
  if (!invalid) return

  throw createError({
    statusCode: 400,
    statusMessage: `Endereco invalido em ${label}: "${invalid}".`
  })
}

function assertSecurePort(host: string, port: number, secure: boolean): void {
  if (!secure) return
  if (port === 465) return

  if (host.toLowerCase().includes('gmail')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Para Gmail use porta 465 com SSL/TLS ligado, ou porta 587 com SSL/TLS desligado.'
    })
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'SSL/TLS ligado requer porta 465 na maioria dos provedores. Ajuste a porta ou desmarque SSL/TLS.'
  })
}

function mapSmtpError(error: unknown, config: MailConfig): { statusCode: number; statusMessage: string } {
  const typed = error as {
    code?: string
    message?: string
    response?: string
    responseCode?: number
    command?: string
  }

  const code = (typed.code || '').toUpperCase()
  const message = typed.message || 'Falha ao enviar e-mail via SMTP.'
  const response = typed.response || ''
  const raw = `${message} ${response}`.toLowerCase()
  const isGmail = config.host.toLowerCase().includes('gmail')

  if (code === 'EAUTH' || raw.includes('invalid login') || raw.includes('bad credentials')) {
    if (isGmail) {
      return {
        statusCode: 400,
        statusMessage:
          'Falha na autenticacao do Gmail. Confira SMTP usuario, senha de app (16 caracteres sem espacos), 2FA ativo e SSL/porta (465 com SSL ou 587 sem SSL).'
      }
    }

    return {
      statusCode: 400,
      statusMessage: 'Falha na autenticacao SMTP. Verifique usuario e senha.'
    }
  }

  if (code === 'EENVELOPE' || raw.includes('no recipients defined') || raw.includes('invalid recipient')) {
    return {
      statusCode: 400,
      statusMessage: 'Destinatario invalido. Revise os campos To/CC.'
    }
  }

  if (raw.includes('invalid sender') || raw.includes('sender address rejected')) {
    return {
      statusCode: 400,
      statusMessage:
        'Remetente (from) invalido ou rejeitado pelo provedor. Use um e-mail valido, preferencialmente o mesmo do SMTP usuario.'
    }
  }

  if (
    code === 'ESOCKET' ||
    code === 'ECONNECTION' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN'
  ) {
    return {
      statusCode: 502,
      statusMessage:
        'Nao foi possivel conectar ao servidor SMTP. Verifique host, porta, SSL/TLS e se a rede permite saida SMTP.'
    }
  }

  return {
    statusCode: 500,
    statusMessage: message
  }
}

async function sendMailWithHandling(
  config: MailConfig,
  mailOptions: {
    from: string
    to: string[]
    cc?: string[]
    subject: string
    html: string
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
  }
): Promise<{ messageId: string; destinatarios: string[] }> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  })

  try {
    const response = await transporter.sendMail({
      from: mailOptions.from,
      to: mailOptions.to,
      cc: mailOptions.cc && mailOptions.cc.length > 0 ? mailOptions.cc : undefined,
      subject: mailOptions.subject,
      html: mailOptions.html,
      attachments: mailOptions.attachments
    })

    const destinatarios = [...mailOptions.to, ...(mailOptions.cc || [])]
    return {
      messageId: response.messageId,
      destinatarios
    }
  } catch (error) {
    const mapped = mapSmtpError(error, config)
    throw createError(mapped)
  }
}

function resolveMailConfigFromRuntime(input: RuntimeMailConfigInput): MailConfig {
  const host = input.host?.trim()
  const user = input.user?.trim()
  const pass = input.pass?.trim()
  const from = input.from?.trim()
  const to = normalizeRecipients(input.to)
  const cc = normalizeRecipients(input.cc)
  const subjectPrefix = input.subjectPrefix?.trim() || undefined
  const port = Number(input.port)

  if (!host || !user || !pass || !from || to.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Configuracao SMTP invalida. Verifique host, porta, usuario, senha, remetente e destinatario(s).'
    })
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Porta SMTP invalida.'
    })
  }

  const secure = typeof input.secure === 'boolean' ? input.secure : port === 465
  const normalizedFrom = normalizeFromAddress(from, user)
  assertRecipientsValid(to, 'To')
  assertRecipientsValid(cc, 'CC')
  assertSecurePort(host, port, secure)

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: normalizedFrom,
    to,
    cc,
    subjectPrefix
  }
}

function resolveMailConfigFromEnv(): MailConfig {
  const host = process.env.SMTP_HOST?.trim()
  const portRaw = process.env.SMTP_PORT?.trim() || '587'
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.REPORT_EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim()
  const to = parseEmailList(process.env.REPORT_EMAIL_TO)
  const cc = parseEmailList(process.env.REPORT_EMAIL_CC)
  const subjectPrefix = process.env.REPORT_EMAIL_SUBJECT_PREFIX?.trim() || undefined

  if (!host || !user || !pass || !from || to.length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Configuracao SMTP incompleta. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, REPORT_EMAIL_FROM e REPORT_EMAIL_TO.'
    })
  }

  const port = Number(portRaw)
  if (!Number.isFinite(port) || port <= 0) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SMTP_PORT invalido.'
    })
  }

  const secure = (process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true' || port === 465
  const normalizedFrom = normalizeFromAddress(from, user)
  assertRecipientsValid(to, 'REPORT_EMAIL_TO')
  assertRecipientsValid(cc, 'REPORT_EMAIL_CC')
  assertSecurePort(host, port, secure)

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: normalizedFrom,
    to,
    cc,
    subjectPrefix
  }
}

function buildEmailSubject(data: DailyFinanceReportData, subjectPrefix?: string): string {
  const dateLabel = formatDateBR(data.dataReferencia)
  const contaLabel = data.contaSelecionada?.trim()
  const title = contaLabel
    ? `Relatorio financeiro diario - ${contaLabel} - ${dateLabel}`
    : `Relatorio financeiro diario - ${dateLabel}`
  const subject = subjectPrefix ? `${subjectPrefix} ${title}` : title
  return subject.toLocaleUpperCase('pt-BR')
}

function buildEmailBody(data: DailyFinanceReportData): string {
  const contaLabel = data.contaSelecionada?.trim() || '--'

  return `
  <div style="font-family:Segoe UI,Tahoma,sans-serif;color:#0f172a;line-height:1.45;">
    <p>Segue o movimento do ${contaLabel}.</p>
    <p>
      <strong>Data do extrato:</strong> ${formatDateBR(data.dataReferencia)}<br>
      <strong>Conta:</strong> ${contaLabel}<br>
      <strong>Creditos do extrato:</strong> ${formatCurrencyBRL(data.totalCreditosExtrato)}<br>
      <strong>Titulos pagos no periodo:</strong> ${formatCurrencyBRL(data.totalTitulosPagosNoDia)}
    </p>
    <p>
      <strong>Saldo do dia:</strong> ${formatCurrencyBRL(data.saldoDoDia)}
    </p>
  <p>Os anexos incluem o PDF detalhado do relatorio e o PDF do extrato bancario.</p>
    <p>Qualquer duvida, estou a disposicao.</p>
    <p><strong>Atenciosamente,</strong><br>Maria Luiza Rodrigues<br><em>Auxiliar Financeiro</em></p>
  </div>`
}

function buildTestSubject(config: MailConfig): string {
  const title = 'Teste SMTP - Relatorio financeiro diario'
  return config.subjectPrefix ? `${config.subjectPrefix} ${title}` : title
}

function buildTestBody(dataReferencia: string): string {
  return `
  <div style="font-family:Segoe UI,Tahoma,sans-serif;color:#0f172a;line-height:1.45;">
    <p>Teste de configuracao SMTP executado com sucesso.</p>
    <ul>
      <li><strong>Data de referencia:</strong> ${formatDateBR(dataReferencia)}</li>
      <li><strong>Processado em:</strong> ${new Date().toLocaleString('pt-BR')}</li>
    </ul>
    <p>Se voce recebeu esta mensagem, o envio de e-mail esta operacional.</p>
  </div>`
}

export async function sendDailyFinanceReportEmail(
  input: SendDailyFinanceReportEmailInput,
  options?: { runtimeConfig?: RuntimeMailConfigInput | null }
): Promise<{ messageId: string; destinatarios: string[] }> {
  const config = options?.runtimeConfig
    ? resolveMailConfigFromRuntime(options.runtimeConfig)
    : resolveMailConfigFromEnv()

  const fileDate = input.data.dataReferencia.replace(/-/g, '')

  return sendMailWithHandling(config, {
    from: config.from,
    to: config.to,
    cc: config.cc,
    subject: buildEmailSubject(input.data, config.subjectPrefix),
    html: buildEmailBody(input.data),
    attachments: [
      {
        filename: `relatorio_financeiro_${fileDate}.pdf`,
        content: input.pdfBuffer,
        contentType: 'application/pdf'
      },
      {
        filename: input.extratoFileName,
        content: input.extratoPdfBuffer,
        contentType: input.extratoMimeType || 'application/pdf'
      }
    ]
  })
}

export async function sendFinanceSmtpTestEmail(
  configInput: RuntimeMailConfigInput,
  dataReferencia: string
): Promise<{ messageId: string; destinatarios: string[] }> {
  const config = resolveMailConfigFromRuntime(configInput)

  return sendMailWithHandling(config, {
    from: config.from,
    to: config.to,
    cc: config.cc,
    subject: buildTestSubject(config),
    html: buildTestBody(dataReferencia)
  })
}
