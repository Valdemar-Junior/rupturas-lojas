create table if not exists public.relatorio_extrato_ajustes (
  adjustment_key text primary key,
  assinatura text not null,
  data_referencia date not null,
  banco text not null,
  data_movimento date,
  descricao text,
  documento text,
  valor_original numeric(14,2) not null,
  valor_editado numeric(14,2),
  excluido boolean not null default false,
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_relatorio_extrato_ajustes_data_ref
  on public.relatorio_extrato_ajustes (data_referencia, banco);

create index if not exists idx_relatorio_extrato_ajustes_updated_at
  on public.relatorio_extrato_ajustes (updated_at desc);
