create table if not exists public.extrato_arquivos_diarios (
  data_referencia date primary key,
  banco text,
  arquivo_nome text,
  arquivo_mime_type text,
  arquivo_base64 text not null,
  tamanho_bytes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_extrato_arquivos_diarios_updated_at
  on public.extrato_arquivos_diarios (updated_at desc);
