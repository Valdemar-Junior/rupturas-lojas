import { readBody } from 'h3'
import { authorizeReportTrigger } from '~~/server/utils/financeiro/report-auth'
import { runDailyFinanceReport } from '~~/server/utils/financeiro/report-runner'

interface TriggerBody {
  data?: string
  exigir_credito?: boolean
}

export default defineEventHandler(async (event) => {
  const auth = authorizeReportTrigger(event)
  const body = (await readBody(event)) as TriggerBody | null

  const dataReferencia = typeof body?.data === 'string' ? body.data : undefined
  const exigirCreditoExtrato = typeof body?.exigir_credito === 'boolean' ? body.exigir_credito : true

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
