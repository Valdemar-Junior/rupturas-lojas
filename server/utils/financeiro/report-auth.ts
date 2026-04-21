import { createError, getHeader } from 'h3'
import type { H3Event } from 'h3'

interface AuthorizationResult {
  mode: 'cron' | 'manual'
}

export function authorizeReportTrigger(event: H3Event): AuthorizationResult {
  const authorization = getHeader(event, 'authorization')
  const manualTokenHeader = getHeader(event, 'x-report-token')

  const cronSecret = process.env.CRON_SECRET?.trim()
  const manualSecret = process.env.REPORT_MANUAL_TOKEN?.trim()

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return { mode: 'cron' }
  }

  if (manualSecret && manualTokenHeader === manualSecret) {
    return { mode: 'manual' }
  }

  throw createError({
    statusCode: 401,
    statusMessage: 'Nao autorizado para disparar envio do relatorio.'
  })
}
