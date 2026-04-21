create table if not exists public.relatorio_email_configuracoes (
  id bigserial primary key,
  smtp_host text not null,
  smtp_port integer not null,
  smtp_secure boolean not null default false,
  smtp_user text not null,
  smtp_pass text not null,
  email_from text not null,
  email_to text not null,
  email_cc text,
  subject_prefix text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_relatorio_email_configuracoes_updated_at
  on public.relatorio_email_configuracoes (updated_at desc);
