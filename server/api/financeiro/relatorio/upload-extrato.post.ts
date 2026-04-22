import { createError, readMultipartFormData } from 'h3'
import { extractCreditEntriesFromPdf } from '~~/server/utils/financeiro/report-extrato-parser'
import { getExtratoOriginalPdfByDate, saveExtratoOriginalPdf } from '~~/server/utils/financeiro/report-extrato-file'
import { getDateInFortaleza } from '~~/server/utils/financeiro/report-types'
import { getFinanceiroSupabaseServiceClient } from '~~/server/utils/financeiro/supabase-service'

const DEFAULT_EXTRATO_TABLE = 'extrato_creditos_diarios'

function getConfiguredExtratoTable(): string {
  return process.env.RELATORIO_EXTRATO_TABLE?.trim() || DEFAULT_EXTRATO_TABLE
}

function isMissingTableError(error: { code?: string; message?: string; details?: string } | null | undefined): boolean {
  const code = (error?.code || '').trim().toUpperCase()
  if (code === '42P01' || code === 'PGRST205') return true

  const rawMessage = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return rawMessage.includes('could not find the table') || rawMessage.includes('schema cache')
}

function sanitizeDate(value: string | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return getDateInFortaleza()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Campo data_referencia deve estar no formato YYYY-MM-DD.'
    })
  }

  return raw
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  const raw = (value || '').trim().toLowerCase()
  if (!raw) return fallback
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'sim') return true
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'nao') return false
  return fallback
}

type FileLikePart = {
  name?: string
  type?: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

function isFileLikePart(value: unknown): value is FileLikePart {
  if (!value || typeof value !== 'object') return false
  const typed = value as { arrayBuffer?: unknown }
  return typeof typed.arrayBuffer === 'function'
}

type MultipartUploadPayload = {
  fileBuffer: Buffer
  fileName: string
  fileType: string
  dataReferenciaRaw: string
  bancoRaw: string
  substituirRaw: string
}

async function readUploadPayload(event: Parameters<typeof defineEventHandler>[0]): Promise<MultipartUploadPayload | null> {
  try {
    const parts = await readMultipartFormData(event)
    if (parts && parts.length > 0) {
      const filePart = parts.find((part) => part.name === 'file' && part.filename && part.data)
      if (!filePart?.data) return null

      const dataPart = parts.find((part) => part.name === 'data_referencia')
      const bancoPart = parts.find((part) => part.name === 'banco')
      const substituirPart = parts.find((part) => part.name === 'substituir')

      return {
        fileBuffer: Buffer.from(filePart.data),
        fileName: (filePart.filename || '').trim(),
        fileType: (filePart.type || '').trim(),
        dataReferenciaRaw: dataPart?.data?.toString('utf-8') || '',
        bancoRaw: bancoPart?.data?.toString('utf-8') || '',
        substituirRaw: substituirPart?.data?.toString('utf-8') || ''
      }
    }
  } catch {
    // fallback abaixo
  }

  try {
    const formData = await event.request.formData()
    const filePart = formData.get('file')
    if (!isFileLikePart(filePart)) return null

    return {
      fileBuffer: Buffer.from(await filePart.arrayBuffer()),
      fileName: (filePart.name || '').trim(),
      fileType: (filePart.type || '').trim(),
      dataReferenciaRaw: String(formData.get('data_referencia') || ''),
      bancoRaw: String(formData.get('banco') || ''),
      substituirRaw: String(formData.get('substituir') || '')
    }
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const upload = await readUploadPayload(event)
  if (!upload) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Envie um form-data multipart com o arquivo PDF.'
    })
  }

  const fileBuffer = upload.fileBuffer
  if (!fileBuffer || fileBuffer.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Arquivo PDF vazio no campo "file".'
    })
  }

  const dataReferencia = sanitizeDate(upload.dataReferenciaRaw)
  const banco = upload.bancoRaw.trim() || 'Conta principal'
  const substituir = parseBool(upload.substituirRaw, true)

  const creditos = await extractCreditEntriesFromPdf(fileBuffer, dataReferencia)

  const supabase = getFinanceiroSupabaseServiceClient()
  const extratoTable = getConfiguredExtratoTable()

  if (substituir) {
    const { error: deleteError } = await supabase
      .from(extratoTable)
      .delete()
      .eq('data_referencia', dataReferencia)

    if (deleteError && !isMissingTableError(deleteError)) {
      throw createError({
        statusCode: 500,
        statusMessage: deleteError.message || 'Erro ao limpar creditos antigos da data de referencia.'
      })
    }

    if (isMissingTableError(deleteError)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${extratoTable}" nao encontrada. Crie a tabela no Supabase antes do upload.`
      })
    }
  }

  const payload = creditos.map((item) => ({
    data_referencia: dataReferencia,
    data_movimento: item.dataMovimento || dataReferencia,
    descricao: item.descricao,
    documento: item.documento,
    valor: item.valor,
    banco
  }))

  const { error: insertError } = await supabase
    .from(extratoTable)
    .insert(payload)

  if (insertError) {
    if (isMissingTableError(insertError)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${extratoTable}" nao encontrada. Crie a tabela no Supabase antes do upload.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: insertError.message || 'Erro ao inserir creditos extraidos no Supabase.'
    })
  }

  await saveExtratoOriginalPdf({
    dataReferencia,
    banco,
    fileName: upload.fileName || `extrato_${dataReferencia}.pdf`,
    mimeType: upload.fileType || 'application/pdf',
    fileBuffer
  })

  const extratoPersistido = await getExtratoOriginalPdfByDate(dataReferencia)
  if (!extratoPersistido) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Extrato processado, mas o PDF original nao foi encontrado na base apos o upload. Verifique a tabela extrato_arquivos_diarios.'
    })
  }

  return {
    success: true,
    dataReferencia,
    banco,
    registrosInseridos: payload.length,
    substituir,
    arquivoExtratoSalvo: true,
    arquivoExtrato: {
      fileName: extratoPersistido.fileName,
      sizeBytes: extratoPersistido.buffer.length
    },
    preview: payload.slice(0, 5)
  }
})
