import { createError } from 'h3'
import { buildDailyFinanceReportData } from './report-data'
import { renderDailyFinanceReportHtml } from './report-html'
import { renderPdfFromHtml } from './report-pdf'
import { sendDailyFinanceReportEmail } from './report-email'
import { getStoredEmailConfigForSending } from './report-email-settings'
import { getExtratoOriginalPdfByDate, getLatestExtratoOriginalPdfMeta } from './report-extrato-file'
import type { DailyFinanceReportRunResult } from './report-types'

export interface RunDailyFinanceReportOptions {
  dataReferencia?: string
  periodoTitulosInicio?: string
  periodoTitulosFim?: string
  contaCaixaBanco?: string
  exigirCreditoExtrato?: boolean
  agruparPagosPorFornecedor?: boolean
}

export async function runDailyFinanceReport(options: RunDailyFinanceReportOptions = {}): Promise<DailyFinanceReportRunResult> {
  const data = await buildDailyFinanceReportData({
    dataReferencia: options.dataReferencia,
    periodoTitulosInicio: options.periodoTitulosInicio,
    periodoTitulosFim: options.periodoTitulosFim,
    contaCaixaBanco: options.contaCaixaBanco,
    agruparPagosPorFornecedor: options.agruparPagosPorFornecedor
  })

  const exigirCreditoExtrato = options.exigirCreditoExtrato ?? true

  if (exigirCreditoExtrato && data.creditosExtrato.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Sem creditos de extrato na data de referencia. Envio cancelado para evitar relatorio inconsistente.'
    })
  }

  const html = renderDailyFinanceReportHtml(data)
  const pdfBuffer = await renderPdfFromHtml(html)
  const runtimeConfig = await getStoredEmailConfigForSending()
  const extratoOriginal = await getExtratoOriginalPdfByDate(data.dataReferencia, data.contaSelecionada || undefined)

  if (!extratoOriginal) {
    const latest = await getLatestExtratoOriginalPdfMeta()
    const latestInfo = latest
      ? ` Ultimo extrato salvo: ${latest.fileName} em ${latest.dataReferencia} (${latest.sizeBytes} bytes).`
      : ''

    throw createError({
      statusCode: 422,
      statusMessage:
        `Sem PDF original do extrato para a data de referencia (${data.dataReferencia}). Envio bloqueado. Faca o upload do extrato antes do disparo.${latestInfo}`
    })
  }

  if (extratoOriginal.buffer.equals(pdfBuffer)) {
    throw createError({
      statusCode: 422,
      statusMessage:
        'O PDF do extrato esta igual ao PDF do relatorio. Reenvie o extrato bancario original antes do disparo.'
    })
  }

  const emailResult = await sendDailyFinanceReportEmail({
    data,
    pdfBuffer,
    extratoPdfBuffer: extratoOriginal.buffer,
    extratoFileName: extratoOriginal.fileName,
    extratoMimeType: extratoOriginal.mimeType
  }, {
    runtimeConfig
  })

  return {
    data,
    html,
    pdfBuffer,
    emailMessageId: emailResult.messageId,
    destinatarios: emailResult.destinatarios,
    extratoOriginalFileName: extratoOriginal.fileName,
    extratoOriginalSizeBytes: extratoOriginal.buffer.length
  }
}
