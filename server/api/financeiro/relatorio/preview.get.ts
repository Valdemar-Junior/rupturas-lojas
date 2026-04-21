import { getQuery, setResponseHeader } from 'h3'
import { buildDailyFinanceReportData } from '~~/server/utils/financeiro/report-data'
import { renderDailyFinanceReportHtml } from '~~/server/utils/financeiro/report-html'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dataReferencia = typeof query.data === 'string' ? query.data : undefined

  const data = await buildDailyFinanceReportData({
    dataReferencia
  })

  const html = renderDailyFinanceReportHtml(data)

  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  return html
})