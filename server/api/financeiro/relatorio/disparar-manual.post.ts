import { createError, getHeader, getRequestHost, readBody } from 'h3'
import type { H3Event } from 'h3'
import { runDailyFinanceReport } from '~~/server/utils/financeiro/report-runner'

interface TriggerBody {
  data?: string
  conta?: string
  exigir_credito?: boolean
  agrupar_fornecedor?: boolean
}

function toHost(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new URL(value).host
  } catch {
    return ''
  }
}

function assertManualUiRequest(event: H3Event) {
  const origin = getHeader(event, 'origin')
  const referer = getHeader(event, 'referer')
  const requestHost = getRequestHost(event, { xForwardedHost: true })
  const originHost = toHost(origin)
  const refererHost = toHost(referer)

  if (requestHost && (originHost === requestHost || refererHost === requestHost)) {
    return
  }

  const manualSecret = process.env.REPORT_MANUAL_TOKEN?.trim()
  const manualTokenHeader = getHeader(event, 'x-report-token')
  if (manualSecret && manualTokenHeader === manualSecret) {
    return
  }

  throw createError({
    statusCode: 403,
    statusMessage: 'Disparo manual nao autorizado.'
  })
}

export default defineEventHandler(async (event) => {
  assertManualUiRequest(event)

  const body = (await readBody(event)) as TriggerBody | null
  const dataReferencia = typeof body?.data === 'string' ? body.data : undefined
  const contaCaixaBanco = typeof body?.conta === 'string' ? body.conta : undefined
  const exigirCreditoExtrato = typeof body?.exigir_credito === 'boolean' ? body.exigir_credito : true
  const agruparPagosPorFornecedor = typeof body?.agrupar_fornecedor === 'boolean' ? body.agrupar_fornecedor : false

  const result = await runDailyFinanceReport({
    dataReferencia,
    contaCaixaBanco,
    exigirCreditoExtrato,
    agruparPagosPorFornecedor
  })

  return {
    success: true,
    mode: 'manual-ui',
    dataReferencia: result.data.dataReferencia,
    messageId: result.emailMessageId,
    destinatarios: result.destinatarios,
    anexoExtrato: {
      fileName: result.extratoOriginalFileName,
      sizeBytes: result.extratoOriginalSizeBytes
    },
    resumo: {
      totalCreditosExtrato: result.data.totalCreditosExtrato,
      totalTitulosPagosNoDia: result.data.totalTitulosPagosNoDia,
      totalTitulosPendentesAteHoje: result.data.totalTitulosPendentesAteHoje,
      saldoDoDia: result.data.saldoDoDia
    },
    avisos: result.data.avisos
  }
})
