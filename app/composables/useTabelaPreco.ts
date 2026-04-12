import { ref } from 'vue'
import type {
  SolicitacaoAcao,
  TabelaPrecoItem,
  TabelaPrecoSolicitacao
} from '~/types/supabase'

type CriarSolicitacaoInput =
  | {
    tabelaNome: string;
    acao: 'adicionar_produto';
    codigo: string;
    codigosRelacionados?: string[] | null;
    produto: string;
    precoAtual?: number | null;
    novoPreco?: number | null;
    solicitante?: string | null;
    observacao?: string | null;
  }
  | {
    item: TabelaPrecoItem;
    tabelaNome: string;
    acao: Exclude<SolicitacaoAcao, 'adicionar_produto'>;
    novoPreco?: number | null;
    solicitante?: string | null;
    observacao?: string | null;
  }

type ResolucaoAutomatica = {
  id: number;
  motivo: string;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

function normalizeMoney(value: number | string | null | undefined): number | null {
  const num = toNumber(value)
  if (num === null) return null
  return Math.round(num * 100) / 100
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-'

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function normalizeCodigo(value: string | null | undefined): string {
  return value?.trim().toUpperCase() || ''
}

function normalizeCodigoList(values: Array<string | null | undefined> | null | undefined): string[] {
  if (!values || values.length === 0) return []

  const seen = new Set<string>()
  const list: string[] = []

  values.forEach((value) => {
    const normalized = normalizeCodigo(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    list.push(normalized)
  })

  return list
}

export function useTabelaPreco() {
  const supabase = useSupabaseClient()

  const items = ref<TabelaPrecoItem[]>([])
  const solicitacoesPendentes = ref<TabelaPrecoSolicitacao[]>([])
  const solicitacoesHistorico = ref<TabelaPrecoSolicitacao[]>([])
  const pending = ref(false)
  const savingRequest = ref(false)
  const cancelingRequestId = ref<number | null>(null)
  const error = ref<Error | null>(null)
  const updatedAt = ref<string | null>(null)

  async function fetchPendingRequests(nomeTabela: string) {
    const { data, error: requestError } = await supabase
      .from('tabela_preco_solicitacoes')
      .select('*')
      .eq('tabela_preco_nome', nomeTabela)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (requestError) throw requestError

    return (data as TabelaPrecoSolicitacao[]) ?? []
  }

  async function fetchHistoryRequests(nomeTabela: string) {
    const { data, error: requestError } = await supabase
      .from('tabela_preco_solicitacoes')
      .select('*')
      .eq('tabela_preco_nome', nomeTabela)
      .limit(5000)

    if (requestError) throw requestError

    const rows = (data as TabelaPrecoSolicitacao[]) ?? []

    return rows.sort((a, b) => {
      const priority = (status: TabelaPrecoSolicitacao['status']) => {
        if (status === 'pendente') return 0
        if (status === 'resolvida') return 1
        return 2
      }

      const byStatus = priority(a.status) - priority(b.status)
      if (byStatus !== 0) return byStatus

      const dateA = new Date(a.status === 'pendente' ? a.created_at : (a.resolvido_em || a.updated_at)).getTime()
      const dateB = new Date(b.status === 'pendente' ? b.created_at : (b.resolvido_em || b.updated_at)).getTime()
      return dateB - dateA
    })
  }

  async function resolveAutomaticallyIfNeeded(
    rows: TabelaPrecoItem[],
    requests: TabelaPrecoSolicitacao[]
  ) {
    const mapById = new Map<number, TabelaPrecoItem>()
    const codeSet = new Set<string>()
    rows.forEach((row) => mapById.set(row.id, row))
    rows.forEach((row) => {
      const code = normalizeCodigo(row.codigo)
      if (code) codeSet.add(code)
    })

    const autoResolved: ResolucaoAutomatica[] = []

    requests.forEach((request) => {
      if (request.acao === 'adicionar_produto') {
        const requestedCode = normalizeCodigo(request.codigo)
        const relatedCodes = normalizeCodigoList(request.codigos_relacionados)
          .filter((code) => code !== requestedCode)

        if (requestedCode && codeSet.has(requestedCode)) {
          autoResolved.push({
            id: request.id,
            motivo: 'Produto adicionado.'
          })
          return
        }

        if (relatedCodes.length > 0) {
          const missingCodes = relatedCodes.filter((code) => !codeSet.has(code))
          if (missingCodes.length === 0) {
            autoResolved.push({
              id: request.id,
              motivo: `Produto adicionado por componentes do kit (${relatedCodes.join(', ')}).`
            })
          }
        }

        return
      }

      const row = request.tabela_preco_id === null
        ? undefined
        : mapById.get(request.tabela_preco_id)

      if (request.acao === 'excluir') {
        if (!row) {
          autoResolved.push({
            id: request.id,
            motivo: 'Produto excluido.'
          })
        }
        return
      }

      if (!row) {
        autoResolved.push({
          id: request.id,
          motivo: 'Produto excluido.'
        })
        return
      }

      const currentPrice = normalizeMoney(row.preco_tabela)
      const originalPrice = normalizeMoney(request.preco_atual)
      if (currentPrice !== null && originalPrice !== null && currentPrice !== originalPrice) {
        autoResolved.push({
          id: request.id,
          motivo: `Preco alterado de ${formatCurrency(originalPrice)} para ${formatCurrency(currentPrice)}.`
        })
      }
    })

    if (autoResolved.length === 0) {
      return {
        hasChanges: false,
        pending: requests
      }
    }

    const now = new Date().toISOString()
    await Promise.all(
      autoResolved.map(async (entry) => {
        const { error: updateError } = await supabase
          .from('tabela_preco_solicitacoes')
          .update({
            status: 'resolvida',
            motivo_resolucao: entry.motivo,
            resolvido_em: now
          })
          .eq('id', entry.id)
          .eq('status', 'pendente')

        if (updateError) throw updateError
      })
    )

    const resolvedIds = new Set(autoResolved.map((entry) => entry.id))
    return {
      hasChanges: true,
      pending: requests.filter((request) => !resolvedIds.has(request.id))
    }
  }

  async function fetchByTabela(nomeTabela: string) {
    pending.value = true
    error.value = null

    try {
      const [itemsResult, pendingRequests, historyRequests] = await Promise.all([
        supabase
          .from('tabela_preco')
          .select('*')
          .eq('tabela_preco', nomeTabela)
          .order('produto', { ascending: true })
          .limit(5000),
        fetchPendingRequests(nomeTabela),
        fetchHistoryRequests(nomeTabela)
      ])

      if (itemsResult.error) throw itemsResult.error

      items.value = (itemsResult.data as TabelaPrecoItem[]) ?? []

      const autoResolution = await resolveAutomaticallyIfNeeded(items.value, pendingRequests)

      if (autoResolution.hasChanges) {
        const [pendingFresh, historyFresh] = await Promise.all([
          fetchPendingRequests(nomeTabela),
          fetchHistoryRequests(nomeTabela)
        ])

        solicitacoesPendentes.value = pendingFresh
        solicitacoesHistorico.value = historyFresh
      } else {
        solicitacoesPendentes.value = autoResolution.pending
        solicitacoesHistorico.value = historyRequests
      }

      updatedAt.value = new Date().toISOString()
    } catch (err: any) {
      console.error('Error fetching tabela_preco:', err)
      error.value = err
      items.value = []
      solicitacoesPendentes.value = []
      solicitacoesHistorico.value = []
    } finally {
      pending.value = false
    }
  }

  async function createSolicitacao(input: CriarSolicitacaoInput) {
    if (input.acao === 'adicionar_produto') {
      const codigoNormalizado = normalizeCodigo(input.codigo)
      const codigosRelacionadosNormalizados = normalizeCodigoList(input.codigosRelacionados)
        .filter((code) => code !== codigoNormalizado)
      const produtoNormalizado = input.produto?.trim() || ''

      if (!codigoNormalizado) {
        throw new Error('Informe o codigo do produto para solicitar adicao.')
      }

      if (!produtoNormalizado) {
        throw new Error('Informe o nome do produto para solicitar adicao.')
      }

      const hasPendingForCode = solicitacoesPendentes.value.some(
        (request) =>
          request.status === 'pendente' &&
          request.tabela_preco_nome === input.tabelaNome &&
          request.acao === 'adicionar_produto' &&
          normalizeCodigo(request.codigo) === codigoNormalizado
      )

      if (hasPendingForCode) {
        throw new Error('Esse produto ja possui solicitacao de adicao pendente.')
      }

      input.codigosRelacionados = codigosRelacionadosNormalizados
    } else {
      const hasPendingForItem = solicitacoesPendentes.value.some(
        (request) =>
          request.status === 'pendente' &&
          request.tabela_preco_id === input.item.id &&
          request.acao !== 'adicionar_produto'
      )

      if (hasPendingForItem) {
        throw new Error('Esse item ja possui uma solicitacao pendente.')
      }
    }

    if (
      input.acao === 'alterar_preco' &&
      (input.novoPreco === null || input.novoPreco === undefined)
    ) {
      throw new Error('Informe o novo preco para solicitar alteracao.')
    }

    const novoPrecoNormalizado = input.acao === 'alterar_preco'
      ? normalizeMoney(input.novoPreco)
      : input.acao === 'adicionar_produto'
        ? normalizeMoney(input.novoPreco)
        : null

    if (input.acao === 'alterar_preco' && novoPrecoNormalizado === null) {
      throw new Error('Novo preco invalido.')
    }

    if (input.acao === 'adicionar_produto' && novoPrecoNormalizado === null) {
      throw new Error('Informe o preco sugerido para adicionar o produto.')
    }

    if (input.acao === 'adicionar_produto' && novoPrecoNormalizado !== null && novoPrecoNormalizado <= 0) {
      throw new Error('Informe um preco sugerido maior que zero.')
    }

    const precoAtualNormalizado = input.acao === 'adicionar_produto'
      ? normalizeMoney(input.precoAtual)
      : normalizeMoney(input.item.preco_tabela)

    if (
      input.acao === 'alterar_preco' &&
      precoAtualNormalizado !== null &&
      novoPrecoNormalizado !== null &&
      precoAtualNormalizado === novoPrecoNormalizado
    ) {
      throw new Error('O novo preco deve ser diferente do preco atual.')
    }

    savingRequest.value = true

    try {
      const relatedCodesPayload = input.acao === 'adicionar_produto'
        ? normalizeCodigoList(input.codigosRelacionados)
        : []

      const payload = input.acao === 'adicionar_produto'
        ? {
          tabela_preco_id: null,
          tabela_preco_nome: input.tabelaNome,
          codigo: normalizeCodigo(input.codigo),
          codigos_relacionados: relatedCodesPayload.length > 0 ? relatedCodesPayload : null,
          produto: input.produto.trim(),
          acao: input.acao,
          preco_atual: precoAtualNormalizado,
          novo_preco: novoPrecoNormalizado,
          solicitante: input.solicitante?.trim() || null,
          observacao: input.observacao?.trim() || null,
          status: 'pendente'
        }
        : {
          tabela_preco_id: input.item.id,
          tabela_preco_nome: input.tabelaNome,
          codigo: input.item.codigo,
          codigos_relacionados: null,
          produto: input.item.produto,
          acao: input.acao,
          preco_atual: precoAtualNormalizado,
          novo_preco: novoPrecoNormalizado,
          solicitante: input.solicitante?.trim() || null,
          observacao: input.observacao?.trim() || null,
          status: 'pendente'
        }

      const { error: insertError } = await supabase
        .from('tabela_preco_solicitacoes')
        .insert(payload)

      if (insertError) throw insertError
    } catch (err: any) {
      console.error('Error creating tabela_preco_solicitacoes:', err)
      throw err
    } finally {
      savingRequest.value = false
    }
  }

  async function cancelSolicitacao(solicitacaoId: number) {
    cancelingRequestId.value = solicitacaoId

    try {
      const { error: cancelError } = await supabase
        .from('tabela_preco_solicitacoes')
        .update({
          status: 'cancelada',
          motivo_resolucao: 'Solicitacao cancelada pelo diretor.',
          resolvido_em: new Date().toISOString()
        })
        .eq('id', solicitacaoId)
        .eq('status', 'pendente')

      if (cancelError) throw cancelError
    } catch (err: any) {
      console.error('Error cancelling tabela_preco_solicitacoes:', err)
      throw err
    } finally {
      cancelingRequestId.value = null
    }
  }

  return {
    items,
    solicitacoesPendentes,
    solicitacoesHistorico,
    pending,
    savingRequest,
    cancelingRequestId,
    error,
    updatedAt,
    fetchByTabela,
    createSolicitacao,
    cancelSolicitacao
  }
}

