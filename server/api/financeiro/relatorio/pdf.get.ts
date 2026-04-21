import { getQuery, setHeader } from 'h3'
import { buildDailyFinanceReportData } from '~~/server/utils/financeiro/report-data'
import { renderDailyFinanceReportHtml } from '~~/server/utils/financeiro/report-html'
import { renderPdfFromHtml } from '~~/server/utils/financeiro/report-pdf'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dataReferencia = typeof query.data === 'string' ? query.data : undefined

  const data = await buildDailyFinanceReportData({
    dataReferencia
  })

  const html = renderDailyFinanceReportHtml(data)
  const pdf = await renderPdfFromHtml(html)

  const fileDate = data.dataReferencia.replace(/-/g, '')

  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `inline; filename="relatorio_financeiro_${fileDate}.pdf"`)
  return pdf
})
