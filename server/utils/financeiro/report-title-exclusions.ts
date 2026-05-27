import { createError } from 'h3'
import { getFinanceiroSupabaseServiceClient } from './supabase-service'

const DEFAULT_EXCLUDED_TITLES_TABLE = 'relatorio_titulos_excluidos'
const SUPABASE_PAGE_SIZE = 1000

function getExcludedTitlesTableName(): string {
  return process.env.RELATORIO_TITULOS_EXCLUIDOS_TABLE?.trim() || DEFAULT_EXCLUDED_TITLES_TABLE
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const generic = error as { code?: string; message?: string; details?: string }
  const code = (generic.code || '').trim().toUpperCase()
  if (code === '42P01' || code === 'PGRST205') return true

  const message = `${generic.message || ''} ${generic.details || ''}`.toLowerCase()
  return message.includes('could not find the table') || message.includes('schema cache')
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback

  const generic = error as { message?: string; details?: string }
  const message = generic.message?.trim()
  const details = generic.details?.trim()

  if (message && details) return `${message} ${details}`
  if (message) return message
  return fallback
}

export async function fetchExcludedTituloIds(): Promise<Set<number>> {
  const supabase = getFinanceiroSupabaseServiceClient()
  const table = getExcludedTitlesTableName()
  const excludedIds = new Set<number>()
  let start = 0

  while (true) {
    const end = start + SUPABASE_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from(table)
      .select('titulo_id')
      .order('titulo_id', { ascending: true })
      .range(start, end)

    if (error) {
      if (isMissingTableError(error)) return excludedIds

      throw createError({
        statusCode: 500,
        statusMessage: toErrorMessage(error, 'Erro ao consultar titulos excluidos do relatorio.')
      })
    }

    const rows = (data as Array<{ titulo_id: number | string | null }>) || []
    for (const row of rows) {
      const tituloId = Number(row.titulo_id)
      if (Number.isInteger(tituloId) && tituloId > 0) {
        excludedIds.add(tituloId)
      }
    }

    if (rows.length < SUPABASE_PAGE_SIZE) break
    start += SUPABASE_PAGE_SIZE
  }

  return excludedIds
}

export async function excludeTituloFromReport(input: { tituloId: number; motivo?: string | null }) {
  const tituloId = Number(input.tituloId)
  if (!Number.isInteger(tituloId) || tituloId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identificador do titulo invalido para exclusao do relatorio.'
    })
  }

  const supabase = getFinanceiroSupabaseServiceClient()
  const table = getExcludedTitlesTableName()
  const motivo = String(input.motivo || '').trim() || 'Excluido manualmente da tela de relatorio diario.'

  const { error } = await supabase
    .from(table)
    .upsert(
      {
        titulo_id: tituloId,
        motivo,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'titulo_id'
      }
    )

  if (error) {
    if (isMissingTableError(error)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Tabela "${table}" nao encontrada. Crie a tabela de titulos excluidos do relatorio antes de usar a lixeira.`
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: toErrorMessage(error, 'Falha ao excluir o titulo do relatorio.')
    })
  }

  return {
    success: true,
    tituloId
  }
}
