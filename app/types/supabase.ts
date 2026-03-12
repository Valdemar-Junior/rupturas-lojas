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
