create table if not exists public.relatorio_titulos_excluidos (
  titulo_id bigint primary key,
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_relatorio_titulos_excluidos_updated_at
  on public.relatorio_titulos_excluidos (updated_at desc);
