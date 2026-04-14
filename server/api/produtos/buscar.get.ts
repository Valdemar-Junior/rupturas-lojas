import { createError, getQuery } from 'h3'

type SearchMode = 'codigo' | 'descricao' | 'ambos'

type ProdutoBusca = {
  codigo: string;
  produto: string;
  tabela_preco: string | null;
  preco_tabela: number | null;
  custo: number | null;
  dvv_percentual: number | null;
  mc: number | null;
  quantidade_disponivel_total: number | null;
  detalhamento_estoque: string | null;
  quantidade_componente: string | null;
}

type FetchErrorLike = {
  statusCode?: number;
  data?: {
    message?: string;
    hint?: string;
  };
  message?: string;
}

function normalizeSearchMode(value: unknown): SearchMode {
  const mode = String(value ?? '').trim().toLowerCase()
  if (mode === 'descricao') return 'descricao'
  if (mode === 'ambos') return 'ambos'
  return 'codigo'
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeSearchTerm(term: string): string[] {
  return normalizeSearchText(term)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

function hasAllTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false
  return tokens.every((token) => text.includes(token))
}

function getSearchScore(entry: ProdutoBusca, termLower: string, mode: SearchMode, tokens: string[]): number {
  const code = normalizeSearchText(entry.codigo)
  const product = normalizeSearchText(entry.produto)
  const tokenMatchOnProduct = hasAllTokens(product, tokens)
  const tokenMatchOnCode = hasAllTokens(code, tokens)

  if (mode === 'codigo') {
    if (code === termLower) return 0
    if (code.startsWith(termLower)) return 1
    if (code.includes(termLower)) return 2
    if (tokens.length > 1 && tokenMatchOnCode) return 3
    return Number.POSITIVE_INFINITY
  }

  if (mode === 'descricao') {
    if (product === termLower) return 0
    if (product.startsWith(termLower)) return 1
    if (product.includes(termLower)) return 2
    if (tokens.length > 1 && tokenMatchOnProduct) return 3
    return Number.POSITIVE_INFINITY
  }

  if (code === termLower) return 0
  if (code.startsWith(termLower)) return 1
  if (code.includes(termLower)) return 2
  if (product === termLower) return 3
  if (product.startsWith(termLower)) return 4
  if (product.includes(termLower)) return 5
  if (tokens.length > 1 && tokenMatchOnProduct) return 6
  if (tokens.length > 1 && tokenMatchOnCode) return 7
  return Number.POSITIVE_INFINITY
}

function toList(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.value)) return payload.value
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.produtos)) return payload.produtos
  if (Array.isArray(payload?.response)) return payload.response
  if (payload && typeof payload === 'object') {
    const hasCodigo = payload.codigo !== undefined && payload.codigo !== null
    const hasProduto = payload.produto !== undefined && payload.produto !== null
    if (hasCodigo || hasProduto) return [payload]
  }
  return []
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const raw = String(value).trim()
  if (!raw) return null

  let normalized = raw
  const hasDot = normalized.includes('.')
  const hasComma = normalized.includes(',')
  if (hasDot && hasComma) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
  }

  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return null
  return parsed
}

function normalizeProduto(entry: any): ProdutoBusca | null {
  const codigo = String(
    entry?.codigo ??
    entry?.codigo_produto ??
    entry?.cod_produto ??
    entry?.code ??
    entry?.id ??
    ''
  ).trim()

  const produto = String(
    entry?.produto ??
    entry?.nome_produto ??
    entry?.nome ??
    entry?.descricao_produto ??
    entry?.descricao ??
    ''
  ).trim()

  if (!codigo || !produto) return null

  return {
    codigo,
    produto,
    tabela_preco: toText(entry?.tabela_preco),
    preco_tabela: toNumber(entry?.preco_tabela),
    custo: toNumber(entry?.custo),
    dvv_percentual: toNumber(entry?.dvv_percentual),
    mc: toNumber(entry?.mc),
    quantidade_disponivel_total: toNumber(entry?.quantidade_disponivel_total),
    detalhamento_estoque: toText(entry?.detalhamento_estoque),
    quantidade_componente: toText(entry?.quantidade_componente)
  }
}

function getFetchErrorMessage(error: unknown): string {
  const err = error as FetchErrorLike
  const dataMessage = err?.data?.message?.trim()
  const hint = err?.data?.hint?.trim()
  const fallbackMessage = err?.message?.trim()

  if (dataMessage && hint) return `${dataMessage} ${hint}`
  if (dataMessage) return dataMessage
  if (fallbackMessage) return fallbackMessage
  return 'Falha ao consultar o catalogo de produtos.'
}

async function queryWebhookProducts(webhookUrl: string, term: string) {
  const searchParams = { busca: term }
  let postError: unknown = null

  try {
    return await $fetch<any>(webhookUrl, {
      method: 'POST',
      body: searchParams
    })
  } catch (errorPost) {
    postError = errorPost
    try {
      return await $fetch<any>(webhookUrl, {
        method: 'GET',
        query: searchParams
      })
    } catch (errorGet) {
      const message = [getFetchErrorMessage(postError), getFetchErrorMessage(errorGet)]
        .find((entry) => entry && entry !== 'Falha ao consultar o catalogo de produtos.')
        || 'Falha ao consultar o catalogo de produtos.'
      throw createError({
        statusCode: 502,
        statusMessage: message
      })
    }
  }
}

export default defineEventHandler(async (event): Promise<ProdutoBusca[]> => {
  const query = getQuery(event)
  const term = String(query.q ?? '').trim()
  const mode = normalizeSearchMode(query.mode)

  if (term.length < 2) return []

  const runtimeConfig = useRuntimeConfig(event)
  const webhookUrl = runtimeConfig.n8nBuscarProdutoWebhook as string | undefined

  if (!webhookUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Webhook de busca de produto nao configurado.'
    })
  }

  const payload = await queryWebhookProducts(webhookUrl, term)

  let sourceEntries = toList(payload)
  const tokens = tokenizeSearchTerm(term)

  // Em buscas com mais de uma palavra, combina também resultados por token
  // para compensar limitações do filtro do webhook.
  if (tokens.length > 1 && mode !== 'codigo') {
    const uniqueTokens = Array.from(new Set(tokens)).slice(0, 4)
    const tokenPayloads = await Promise.all(
      uniqueTokens.map(async (token) => {
        try {
          return await queryWebhookProducts(webhookUrl, token)
        } catch {
          return null
        }
      })
    )

    const tokenEntries = tokenPayloads.flatMap((tokenPayload) => toList(tokenPayload))
    sourceEntries = [...sourceEntries, ...tokenEntries]
  }

  const normalized = sourceEntries
    .map(normalizeProduto)
    .filter((entry): entry is ProdutoBusca => entry !== null)

  const deduped = new Map<string, ProdutoBusca>()
  normalized.forEach((entry) => {
    const key = entry.codigo.trim().toUpperCase()
    if (!deduped.has(key)) {
      deduped.set(key, entry)
    }
  })

  const termLower = normalizeSearchText(term)
  return Array.from(deduped.values())
    .map((entry) => ({
      entry,
      score: getSearchScore(entry, termLower, mode, tokens)
    }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      if (a.entry.codigo.length !== b.entry.codigo.length) {
        return a.entry.codigo.length - b.entry.codigo.length
      }
      return a.entry.codigo.localeCompare(b.entry.codigo, 'pt-BR')
    })
    .map((item) => item.entry)
    .slice(0, 30)
})
