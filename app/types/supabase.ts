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
