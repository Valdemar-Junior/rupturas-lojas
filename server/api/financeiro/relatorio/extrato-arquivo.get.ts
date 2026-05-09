import { getQuery } from 'h3'
import { getExtratoOriginalPdfByDate, getLatestExtratoOriginalPdfMeta } from '~~/server/utils/financeiro/report-extrato-file'
import { getDateInFortaleza } from '~~/server/utils/financeiro/report-types'

function sanitizeDate(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return getDateInFortaleza()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return getDateInFortaleza()
  return raw
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dataReferencia = sanitizeDate(query.data)
  const contaCaixaBanco = typeof query.conta === 'string' ? query.conta.trim() : ''

  const extrato = await getExtratoOriginalPdfByDate(dataReferencia, contaCaixaBanco || undefined)
  const latest = await getLatestExtratoOriginalPdfMeta()

  return {
    success: true,
    dataReferencia,
    exists: !!extrato,
    fileName: extrato?.fileName || null,
    sizeBytes: extrato?.buffer.length || 0,
    latest
  }
})
