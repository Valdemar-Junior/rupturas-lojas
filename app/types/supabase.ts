export interface ProdutoRuptura {
    departamento: string | null;
    grupo: string | null;
    subgrupo: string | null;
    codigo_modelo: string | null;
    nome_produto: string | null;
    possui_grade: string | null;
    cor: string | null;
    qtd_total_deposito: number | null;
    saldo_assu: number | null;
    saldo_mossoro: number | null;
    detalhes_grades_disponiveis: string | null;
}

export interface ProdutoEstoque {
    id: number;
    departamento: string | null;
    grupo: string | null;
    subgrupo: string | null;
    codigo_modelo: string;
    nome_produto: string | null;
    possui_grade: string | null;
    cor: string | null;
    saldo_deposito: number | null;
    saldo_assu: number | null;
    saldo_mossoro: number | null;
    detalhes_grades_em_loja: string | null;
    created_at: string | null;
}

export interface DashboardStats {
    ruptura: {
        total: number;
        ambas: number;
        assu: number;
        mossoro: number;
    };
    rupturaDeposito: {
        total: number;
        assu: number;
        mossoro: number;
    };
    criticos: number;
}

export interface TabelaPrecoItem {
    id: number;
    created_at: string | null;
    updated_at: string | null;
    tabela_preco: string | null;
    codigo: string | null;
    produto: string | null;
    preco_tabela: number | string | null;
    custo: number | string | null;
    dvv_percentual: number | string | null;
    mc: number | string | null;
    quantidade_disponivel_total: number | string | null;
    detalhamento_estoque: string | null;
    quantidade_componente: string | null;
}

export type SolicitacaoAcao = 'alterar_preco' | 'excluir' | 'adicionar_produto';

export type SolicitacaoStatus = 'pendente' | 'resolvida' | 'cancelada';

export interface TabelaPrecoSolicitacao {
    id: number;
    tabela_preco_id: number | null;
    tabela_preco_nome: string;
    codigo: string | null;
    codigos_relacionados: string[] | null;
    produto: string | null;
    acao: SolicitacaoAcao;
    preco_atual: number | string | null;
    novo_preco: number | string | null;
    solicitante: string | null;
    observacao: string | null;
    status: SolicitacaoStatus;
    motivo_resolucao: string | null;
    resolvido_em: string | null;
    created_at: string;
    updated_at: string;
}
