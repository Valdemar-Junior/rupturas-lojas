import { createError } from 'h3'

export interface ParsedExtratoCredito {
  dataMovimento: string | null
  descricao: string
  documento: string
  valor: number
}

interface ParsedCreditLineTokens {
  dateToken: string
  descriptionToken: string
  amountToken: string
  explicitDocumentToken?: string
}

const CURRENCY_TOKEN_REGEX = /([+\-\u2212]?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2})/

const CREDIT_HINTS = [
  'credito',
  'cred.',
  'pix recebido',
  'pix receb',
  'ted receb',
  'deposito',
  'dep dinheiro',
  'antec',
  'antecipacao',
  'recebimento',
  'valor recebido',
  'transferencia receb'
]

const DEBIT_HINTS = [
  'debito',
  'pagamento',
  'saque',
  'tarifa',
  'compra',
  'transferencia enviada',
  'transferencia env',
  'pix enviado'
]

const IGNORE_LINE_HINTS = [
  'saldo anterior',
  'data descricao documento valor',
  'extrato (periodo',
  'lancamentos futuros',
  'valores das operacoes',
  'sicredi fone',
  'ouvidoria',
  'sac 0800',
  '-- 1 of',
  '-- 2 of',
  '-- 3 of'
]

type PdfParseModule = {
  PDFParse?: new (options: { data: Buffer }) => {
    getText: () => Promise<{ text?: string | null }>
    destroy: () => Promise<void>
  }
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseCurrency(value: string): number {
  const trimmed = value.replace(/\s+/g, '').replace('R$', '').replace(/\u2212/g, '-')
  const signal = trimmed.startsWith('-') ? -1 : 1
  const normalized = trimmed.replace(/[+-]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return 0
  return parsed * signal
}

function sanitizeDescription(raw: string): string {
  const text = raw
    .replace(/\b(C|CR|CREDITO|D|DB|DEBITO)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text || 'Credito identificado no extrato'
}

function isDateToken(token: string): boolean {
  return /^\d{2}\/\d{2}(?:\/\d{2,4})?$/.test(token.trim())
}

function isMeaningfulDescription(value: string): boolean {
  const normalized = normalizeText(value).replace(/r\$/g, '').replace(/[\d\s.,/|:-]/g, '').trim()
  return normalized.length >= 2
}

function parseDateToken(token: string, referenceDate: string): string | null {
  const clean = token.trim()
  const match = clean.match(/^(\d{2})\/(\d{2})(?:\/(\d{2}|\d{4}))?$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(day) || !Number.isFinite(month) || day < 1 || day > 31 || month < 1 || month > 12) {
    return null
  }

  const referenceYear = Number(referenceDate.slice(0, 4))
  let year = referenceYear

  if (match[3]) {
    const yearRaw = Number(match[3])
    year = match[3].length === 2 ? 2000 + yearRaw : yearRaw
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeDocumentToken(token: string | undefined): string | null {
  const text = token?.trim() || ''
  if (!text) return null
  if (/^-+$/.test(text)) return '--'
  return text.toUpperCase()
}

function pickDocument(line: string, explicitToken?: string): string {
  const explicit = normalizeDocumentToken(explicitToken)
  if (explicit) return explicit

  const docMatch = line.match(/\b(?:doc|documento|id|nsu|aut|ref|comprovante)[:\s#-]*([a-z0-9.-]{4,})/i)
  if (!docMatch) return '--'
  return docMatch[1].toUpperCase()
}

function isCreditLine(line: string, amount: number): boolean {
  if (amount <= 0) return false

  const normalized = normalizeText(line)
  const hasDatePrefix = /^\d{2}\/\d{2}(?:\/\d{2,4})?\b/.test(line)
  if (!hasDatePrefix) return false

  const shouldIgnore = IGNORE_LINE_HINTS.some((hint) => normalized.includes(hint))
  if (shouldIgnore) return false

  const hasCreditHint = CREDIT_HINTS.some((hint) => normalized.includes(hint))
  const hasDebitHint = DEBIT_HINTS.some((hint) => normalized.includes(hint))
  const hasPlusSignal = /\+\s*(?:R\$\s*)?\d/.test(line)
  const creditSuffix = /\b(C|CR|CREDITO)\b/i.test(line)
  const isCardIncoming = normalized.includes('sicredi debito') || normalized.includes('sicredi antec')

  // Alguns bancos usam "debito" para identificar a bandeira do cartao,
  // mesmo em lancamentos de entrada (receita).
  if (hasDebitHint && !hasCreditHint && !isCardIncoming) return false

  if (hasCreditHint || hasPlusSignal || creditSuffix || isCardIncoming) return true

  // No layout do extrato validado, qualquer linha datada com valor positivo
  // e sem sinais de exclusao e considerada credito.
  return true
}

function parseIndexedCreditLine(line: string): ParsedCreditLineTokens | null {
  const columns = line
    .split(/\t+/)
    .map((column) => column.trim())
    .filter(Boolean)

  if (columns.length < 5) return null
  if (!/^\d+$/.test(columns[0])) return null
  if (!isDateToken(columns[1])) return null

  const amountCandidate = columns[columns.length - 1]
  const amountMatch = amountCandidate.match(CURRENCY_TOKEN_REGEX)
  if (!amountMatch) return null

  let explicitDocumentToken: string | undefined
  let descriptionEnd = columns.length - 2

  if (columns.length >= 6) {
    explicitDocumentToken = columns[columns.length - 3]
    descriptionEnd = columns.length - 3
  }

  const descriptionToken = columns.slice(2, descriptionEnd).join(' ').trim()
  if (!isMeaningfulDescription(descriptionToken)) return null

  return {
    dateToken: columns[1],
    descriptionToken,
    amountToken: amountMatch[1],
    explicitDocumentToken
  }
}

function parseDateLeadingCreditLine(line: string): ParsedCreditLineTokens | null {
  const twoColumnsPattern =
    /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([+\-\u2212]?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2})\s+([+\-\u2212]?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2})$/
  const oneColumnPattern =
    /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+([+\-\u2212]?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2})$/

  const twoColumnsMatch = line.match(twoColumnsPattern)
  if (twoColumnsMatch) {
    const descriptionToken = twoColumnsMatch[2]
    if (!isMeaningfulDescription(descriptionToken)) return null

    return {
      dateToken: twoColumnsMatch[1],
      descriptionToken,
      amountToken: twoColumnsMatch[3]
    }
  }

  const oneColumnMatch = line.match(oneColumnPattern)
  if (!oneColumnMatch) return null

  const descriptionToken = oneColumnMatch[2]
  if (!isMeaningfulDescription(descriptionToken)) return null

  return {
    dateToken: oneColumnMatch[1],
    descriptionToken,
    amountToken: oneColumnMatch[3]
  }
}

function dedupeCredits(rows: ParsedExtratoCredito[]): ParsedExtratoCredito[] {
  const map = new Map<string, ParsedExtratoCredito>()

  rows.forEach((row) => {
    const key = `${row.dataMovimento || 'sem_data'}|${row.descricao}|${row.valor.toFixed(2)}|${row.documento}`
    if (!map.has(key)) {
      map.set(key, row)
    }
  })

  return Array.from(map.values())
}

export async function extractCreditEntriesFromPdf(fileBuffer: Buffer, referenceDate: string): Promise<ParsedExtratoCredito[]> {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Arquivo PDF vazio para extracao.'
    })
  }

  let pdfModule: PdfParseModule
  try {
    pdfModule = await import('pdf-parse')
  } catch (error: any) {
    const detail = error?.message ? ` Detalhe: ${error.message}` : ''
    throw createError({
      statusCode: 422,
      statusMessage: `Falha ao inicializar leitura de PDF no servidor.${detail} Configure Node.js 22.x no deploy da Vercel e tente novamente.`
    })
  }

  const ParserCtor = pdfModule.PDFParse
  if (!ParserCtor) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Biblioteca de leitura de PDF indisponivel no servidor. Verifique instalacao/deploy das dependencias.'
    })
  }

  const parser = new ParserCtor({ data: fileBuffer })
  let text = ''

  try {
    const data = await parser.getText()
    text = data.text || ''
  } catch (error: any) {
    const detail = error?.message ? ` Detalhe: ${error.message}` : ''
    throw createError({
      statusCode: 422,
      statusMessage: `Falha ao ler o conteudo textual do PDF.${detail}`
    })
  } finally {
    await parser.destroy()
  }

  if (!text.trim()) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Nao foi possivel ler texto do PDF. Verifique se o arquivo nao esta escaneado como imagem.'
    })
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const output: ParsedExtratoCredito[] = []

  for (const line of lines) {
    const indexedLine = parseIndexedCreditLine(line)
    const parsedLine = indexedLine || parseDateLeadingCreditLine(line)
    if (!parsedLine) continue

    const { dateToken, descriptionToken, amountToken, explicitDocumentToken } = parsedLine
    const value = parseCurrency(amountToken)

    if (indexedLine) {
      if (value <= 0) continue
    } else if (!isCreditLine(line, value)) {
      continue
    }

    const dataMovimento = parseDateToken(dateToken, referenceDate)

    output.push({
      dataMovimento,
      descricao: sanitizeDescription(descriptionToken),
      documento: pickDocument(descriptionToken, explicitDocumentToken),
      valor: value
    })
  }

  const credits = dedupeCredits(output)

  if (credits.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Nenhum credito foi identificado no PDF. Ajuste as regras do parser para o layout do seu banco.'
    })
  }

  return credits
}
