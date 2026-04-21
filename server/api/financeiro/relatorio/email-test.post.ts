import { createError, readBody } from 'h3'
import type { EmailConfigFormInput } from '~~/server/utils/financeiro/report-email-settings'
import {
  buildRuntimeConfigForEmailTest
} from '~~/server/utils/financeiro/report-email-settings'
import { sendFinanceSmtpTestEmail } from '~~/server/utils/financeiro/report-email'
import { getDateInFortaleza } from '~~/server/utils/financeiro/report-types'

interface EmailTestBody extends EmailConfigFormInput {
  data?: string
}

function sanitizeDate(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return getDateInFortaleza()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Campo "data" deve estar no formato YYYY-MM-DD.'
    })
  }

  return raw
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as EmailTestBody | null
  const dataReferencia = sanitizeDate(body?.data)
  const runtimeConfig = await buildRuntimeConfigForEmailTest(body || {})
  const result = await sendFinanceSmtpTestEmail(runtimeConfig, dataReferencia)

  return {
    success: true,
    message: 'E-mail de teste enviado com sucesso.',
    dataReferencia,
    messageId: result.messageId,
    destinatarios: result.destinatarios
  }
})

