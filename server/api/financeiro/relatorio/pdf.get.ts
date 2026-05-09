import { getQuery, setHeader } from 'h3'
import { buildDailyFinanceReportData } from '~~/server/utils/financeiro/report-data'
import { renderDailyFinanceReportHtml } from '~~/server/utils/financeiro/report-html'
import { renderPdfFromHtml } from '~~/server/utils/financeiro/report-pdf'

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false
  return fallback
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dataReferencia = typeof query.data === 'string' ? query.data : undefined
  const contaCaixaBanco = typeof query.conta === 'string' ? query.conta : undefined
  const agruparPagosPorFornecedor = parseBoolean(query.agrupar_fornecedor, false)

  const data = await buildDailyFinanceReportData({
    dataReferencia,
    contaCaixaBanco,
    agruparPagosPorFornecedor
  })

  const html = renderDailyFinanceReportHtml(data)
  const pdf = await renderPdfFromHtml(html)

  const fileDate = data.dataReferencia.replace(/-/g, '')

  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `inline; filename="relatorio_financeiro_${fileDate}.pdf"`)
  return pdf
})
