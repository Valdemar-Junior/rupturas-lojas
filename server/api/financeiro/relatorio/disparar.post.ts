import { readBody } from 'h3'
import { authorizeReportTrigger } from '~~/server/utils/financeiro/report-auth'
import { runDailyFinanceReport } from '~~/server/utils/financeiro/report-runner'

interface TriggerBody {
  data?: string
  data_inicio?: string
  data_fim?: string
  conta?: string
  exigir_credito?: boolean
  agrupar_fornecedor?: boolean
}

export default defineEventHandler(async (event) => {
  const auth = authorizeReportTrigger(event)
  const body = (await readBody(event)) as TriggerBody | null

  const dataReferencia = typeof body?.data === 'string' ? body.data : undefined
  const periodoTitulosInicio = typeof body?.data_inicio === 'string' ? body.data_inicio : undefined
  const periodoTitulosFim = typeof body?.data_fim === 'string' ? body.data_fim : undefined
  const contaCaixaBanco = typeof body?.conta === 'string' ? body.conta : undefined
  const exigirCreditoExtrato = typeof body?.exigir_credito === 'boolean' ? body.exigir_credito : true
  const agruparPagosPorFornecedor = typeof body?.agrupar_fornecedor === 'boolean' ? body.agrupar_fornecedor : false

  const result = await runDailyFinanceReport({
    dataReferencia,
    periodoTitulosInicio,
    periodoTitulosFim,
    contaCaixaBanco,
    exigirCreditoExtrato,
    agruparPagosPorFornecedor
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
