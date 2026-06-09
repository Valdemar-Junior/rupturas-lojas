import { createError, readBody } from 'h3'
import {
  buildExtratoAdjustmentIdentity,
  saveExtratoAdjustment
} from '~~/server/utils/financeiro/report-extrato-adjustments'

interface UpdateExtratoBody {
  action?: 'editar' | 'excluir' | string | null
  dataReferencia?: string | null
  banco?: string | null
  dataMovimento?: string | null
  descricao?: string | null
  documento?: string | null
  valorOriginal?: number | string | null
  valorEditado?: number | string | null
  ocorrenciaIndex?: number | string | null
  motivo?: string | null
}

function parseCurrency(value: number | string | null | undefined): number {
  return typeof value === 'number'
    ? value
    : Number(String(value || '').trim().replace(/\./g, '').replace(',', '.'))
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as UpdateExtratoBody | null
  const dataReferencia = String(body?.dataReferencia || '').trim()
  const banco = String(body?.banco || '').trim()
  const dataMovimento = String(body?.dataMovimento || '').trim() || null
  const descricao = String(body?.descricao || '').trim()
  const documento = String(body?.documento || '').trim()
  const valorOriginal = parseCurrency(body?.valorOriginal)
  const ocorrenciaIndex = Number(body?.ocorrenciaIndex)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataReferencia)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data de referencia invalida para ajuste do extrato.'
    })
  }

  if (!banco) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Conta/banco invalido para ajuste do extrato.'
    })
  }

  if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valor original invalido para ajuste do extrato.'
    })
  }

  if (!Number.isInteger(ocorrenciaIndex) || ocorrenciaIndex <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ocorrencia do credito invalida para ajuste do extrato.'
    })
  }

  const identity = buildExtratoAdjustmentIdentity({
    dataReferencia,
    banco,
    dataMovimento,
    descricao,
    documento,
    valorOriginal,
    ocorrenciaIndex
  })

  const action = String(body?.action || 'editar').trim().toLowerCase()

  if (action === 'excluir') {
    await saveExtratoAdjustment({
      adjustmentKey: identity.adjustmentKey,
      assinatura: identity.assinatura,
      dataReferencia,
      banco,
      dataMovimento,
      descricao,
      documento,
      valorOriginal,
      excluido: true,
      motivo: body?.motivo || 'Excluido manualmente na tabela de creditos do relatorio diario.'
    })

    return {
      success: true,
      message: 'Credito do extrato excluido do relatorio com sucesso.'
    }
  }

  const valorEditado = parseCurrency(body?.valorEditado)
  if (!Number.isFinite(valorEditado) || valorEditado <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe um valor valido para salvar a alteracao do credito do extrato.'
    })
  }

  await saveExtratoAdjustment({
    adjustmentKey: identity.adjustmentKey,
    assinatura: identity.assinatura,
    dataReferencia,
    banco,
    dataMovimento,
    descricao,
    documento,
    valorOriginal,
    valorEditado,
    excluido: false,
    motivo: body?.motivo || 'Valor ajustado manualmente na tabela de creditos do relatorio diario.'
  })

  return {
    success: true,
    message: 'Valor do credito do extrato atualizado com sucesso.',
    data: {
      adjustmentKey: identity.adjustmentKey,
      valorOriginal,
      valorEditado
    }
  }
})
