import { getQuery } from 'h3'
import { buildDailyFinanceReportData } from '~~/server/utils/financeiro/report-data'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dataReferencia = typeof query.data === 'string' ? query.data : undefined

  const data = await buildDailyFinanceReportData({
    dataReferencia
  })

  return {
    success: true,
    data
  }
})