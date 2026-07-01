import { createError, readBody } from 'h3'
import { excludeTituloFromReport } from '~~/server/utils/financeiro/report-title-exclusions'
import { getFinanceiroSupabaseServiceClient } from '~~/server/utils/financeiro/supabase-service'

const DEFAULT_TITULOS_TABLE = 'titulos_financeiros'

interface UpdateTituloBody {
  id?: number | string | null
  action?: 'editar' | 'excluir' | string | null
  motivo?: string | null
  valorPago?: number | string | null
  parcela?: string | number | null
}

function getTitulosTable(): string {
  return process.env.RELATORIO_TITULOS_TABLE?.trim() || DEFAULT_TITULOS_TABLE
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as UpdateTituloBody | null
  const id = Number(body?.id)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identificador do titulo invalido para edicao.'
    })
  }

  const action = String(body?.action || 'editar').trim().toLowerCase()

  if (action === 'excluir') {
    await excludeTituloFromReport({
      tituloId: id,
      motivo: body?.motivo
    })

    return {
      success: true,
      message: 'Titulo excluido do relatorio com sucesso.'
    }
  }

  const parcela = String(body?.parcela ?? '').trim()
  const valorRaw = body?.valorPago
  const hasValorPago = valorRaw !== undefined && valorRaw !== null && String(valorRaw).trim() !== ''
  const hasParcela = parcela.length > 0

  if (!hasValorPago && !hasParcela) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe um valor pago ou uma parcela valida para salvar a alteracao.'
    })
  }

  const valorPago = hasValorPago
    ? (typeof valorRaw === 'number'
        ? valorRaw
        : Number(String(valorRaw || '').trim().replace(/\./g, '').replace(',', '.')))
    : null

  if (hasValorPago && (!Number.isFinite(valorPago) || Number(valorPago) <= 0)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe um valor pago valido para salvar a alteracao.'
    })
  }

  const supabase = getFinanceiroSupabaseServiceClient()
  const titulosTable = getTitulosTable()
  const updatePayload: Record<string, string | number> = {}

  if (hasParcela) {
    updatePayload.sufixo = parcela
  }

  if (hasValorPago && valorPago !== null) {
    updatePayload.valor_nominal = valorPago
    updatePayload.valor_pago = valorPago
    updatePayload.valor_baixa = valorPago
  }

  const { data, error } = await supabase
    .from(titulosTable)
    .update(updatePayload)
    .eq('id', id)
    .select('id,sufixo,valor_nominal,valor_pago,valor_baixa')
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
    message: hasParcela && hasValorPago
      ? 'Titulo atualizado com sucesso.'
      : hasParcela
        ? 'Parcela do titulo atualizada com sucesso.'
        : 'Valor pago do titulo atualizado com sucesso.',
    data: {
      id: data.id,
      parcela: data.sufixo,
      valorPago: data.valor_nominal ?? data.valor_baixa ?? data.valor_pago
    }
  }
})
