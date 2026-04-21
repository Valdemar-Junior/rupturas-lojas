import { getQuery } from 'h3'
import { authorizeReportTrigger } from '~~/server/utils/financeiro/report-auth'
import { runDailyFinanceReport } from '~~/server/utils/financeiro/report-runner'

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false
  return fallback
}

export default defineEventHandler(async (event) => {
  const auth = authorizeReportTrigger(event)
  const query = getQuery(event)

  const dataReferencia = typeof query.data === 'string' ? query.data : undefined
  const exigirCreditoExtrato = parseBoolean(query.exigir_credito, true)

  const result = await runDailyFinanceReport({
    dataReferencia,
    exigirCreditoExtrato
  })

  return {
    success: true,
    mode: auth.mode,
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
