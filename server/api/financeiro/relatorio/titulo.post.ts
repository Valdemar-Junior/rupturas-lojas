import { createError, readBody } from 'h3'
import { getFinanceiroSupabaseServiceClient } from '~~/server/utils/financeiro/supabase-service'

const DEFAULT_TITULOS_TABLE = 'titulos_financeiros'

interface UpdateTituloBody {
  id?: number | string | null
  valorPago?: number | string | null
}

function getTitulosTable(): string {
  return process.env.RELATORIO_TITULOS_TABLE?.trim() || DEFAULT_TITULOS_TABLE
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as UpdateTituloBody | null
  const id = Number(body?.id)
  const valorRaw = body?.valorPago

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identificador do titulo invalido para edicao.'
    })
  }

  const valorPago = typeof valorRaw === 'number'
    ? valorRaw
    : Number(String(valorRaw || '').trim().replace(/\./g, '').replace(',', '.'))

  if (!Number.isFinite(valorPago) || valorPago <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe um valor pago valido para salvar a alteracao.'
    })
  }

  const supabase = getFinanceiroSupabaseServiceClient()
  const titulosTable = getTitulosTable()

  const { data, error } = await supabase
    .from(titulosTable)
    .update({
      valor_nominal: valorPago,
      valor_pago: valorPago,
      valor_baixa: valorPago
    })
    .eq('id', id)
    .select('id,valor_nominal,valor_pago,valor_baixa')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Titulo financeiro nao encontrado para atualizacao.'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Falha ao atualizar o numero do titulo.'
    })
  }

  return {
    success: true,
    message: 'Valor pago do titulo atualizado com sucesso.',
    data: {
      id: data.id,
      valorPago: data.valor_nominal ?? data.valor_baixa ?? data.valor_pago
    }
  }
})
