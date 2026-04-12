import { createError, getQuery } from 'h3'

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
}

type FetchErrorLike = {
  statusCode?: number;
  data?: {
    message?: string;
    hint?: string;
  };
  message?: string;
}

function toList(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.produtos)) return payload.produtos
  if (Array.isArray(payload?.response)) return payload.response
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
    detalhamento_estoque: toText(entry?.detalhamento_estoque)
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

export default defineEventHandler(async (event): Promise<ProdutoBusca[]> => {
  const query = getQuery(event)
  const term = String(query.q ?? '').trim()

  if (term.length < 2) return []

  const runtimeConfig = useRuntimeConfig(event)
  const webhookUrl = runtimeConfig.n8nBuscarProdutoWebhook as string | undefined

  if (!webhookUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Webhook de busca de produto nao configurado.'
    })
  }

  const searchParams = {
    busca: term
  }

  let payload: any
  let postError: unknown = null
  let getError: unknown = null
  try {
    payload = await $fetch<any>(webhookUrl, {
      method: 'POST',
      body: searchParams
    })
  } catch (error) {
    postError = error
    try {
      payload = await $fetch<any>(webhookUrl, {
        method: 'GET',
        query: searchParams
      })
    } catch (errorGet) {
      getError = errorGet
      const message = [getFetchErrorMessage(postError), getFetchErrorMessage(getError)]
        .find((entry) => entry && entry !== 'Falha ao consultar o catalogo de produtos.')
        || 'Falha ao consultar o catalogo de produtos.'
      throw createError({
        statusCode: 502,
        statusMessage: message
      })
    }
  }

  const normalized = toList(payload)
    .map(normalizeProduto)
    .filter((entry): entry is ProdutoBusca => entry !== null)

  const deduped = new Map<string, ProdutoBusca>()
  normalized.forEach((entry) => {
    const key = entry.codigo.trim().toUpperCase()
    if (!deduped.has(key)) {
      deduped.set(key, entry)
    }
  })

  const termLower = term.toLowerCase()
  return Array.from(deduped.values())
    .filter((entry) => {
      return (
        entry.codigo.toLowerCase().includes(termLower) ||
        entry.produto.toLowerCase().includes(termLower)
      )
    })
    .slice(0, 30)
})
