# Relatorio Financeiro Diario

## Visao geral

Fluxo implementado no sistema (sem n8n para envio):

1. Upload/manual de extrato PDF para extrair creditos.
2. Consolidacao de dados do dia no endpoint `/api/financeiro/relatorio/dados`.
3. Render de HTML premium + conversao para PDF.
4. Envio automatico por cron da Vercel em `/api/financeiro/relatorio/disparar`, com dois anexos no mesmo e-mail:
   - `relatorio_financeiro_YYYYMMDD.pdf`
   - PDF original do extrato enviado no upload.

O n8n pode continuar somente para alimentar o Supabase, se necessario.

## Agendamento na Vercel

Arquivo: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/financeiro/relatorio/disparar",
      "schedule": "0 20 * * *"
    }
  ]
}
```

`20:00 UTC` equivale a `17:00` em `America/Fortaleza`.

## Variaveis de ambiente

Configure no projeto da Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RELATORIO_EXTRATO_TABLE` (opcional, default: `extrato_creditos_diarios`)
- `RELATORIO_EXTRATO_FILE_TABLE` (opcional, default: `extrato_arquivos_diarios`)
- `RELATORIO_TITULOS_TABLE` (opcional, default: `titulos_financeiros`)
- `RELATORIO_EMAIL_CONFIG_TABLE` (opcional, default: `relatorio_email_configuracoes`)
- `CRON_SECRET` (usado automaticamente pela Vercel no header Authorization)
- `REPORT_MANUAL_TOKEN` (opcional, para PDF/disparo manual)
- `SMTP_HOST` (fallback quando nao houver config salva via tela)
- `SMTP_PORT` (fallback quando nao houver config salva via tela)
- `SMTP_USER` (fallback quando nao houver config salva via tela)
- `SMTP_PASS` (fallback quando nao houver config salva via tela)
- `SMTP_SECURE` (`true` ou `false`, fallback)
- `REPORT_EMAIL_FROM` (fallback)
- `REPORT_EMAIL_TO` (um ou mais, separados por virgula, fallback)
- `REPORT_EMAIL_CC` (opcional, fallback)
- `REPORT_EMAIL_SUBJECT_PREFIX` (opcional, fallback)
- `CHROME_EXECUTABLE_PATH` (opcional para ambiente local)

## Tabela de creditos de extrato (SQL)

```sql
create table if not exists public.extrato_creditos_diarios (
  id bigserial primary key,
  data_referencia date not null,
  data_movimento date,
  descricao text,
  documento text,
  valor numeric(14,2) not null,
  banco text,
  created_at timestamptz not null default now()
);

create index if not exists idx_extrato_creditos_diarios_data_ref
  on public.extrato_creditos_diarios (data_referencia);
```

## Tabela de arquivo original do extrato (SQL)

```sql
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
```

## Tabela de configuracao de e-mail (SQL)

```sql
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
```

## Endpoints

### 1. Dados consolidados

`GET /api/financeiro/relatorio/dados?data=YYYY-MM-DD`

Retorna JSON para a nova aba de relatorio diario.

### 2. Preview HTML

`GET /api/financeiro/relatorio/preview?data=YYYY-MM-DD`

Renderiza o HTML final (visual do PDF) direto no navegador.

### 3. PDF manual

`GET /api/financeiro/relatorio/pdf?data=YYYY-MM-DD`

Se `REPORT_MANUAL_TOKEN` estiver definido, enviar header `x-report-token`.

### 4. Disparo automatico/manual

`GET /api/financeiro/relatorio/disparar?data=YYYY-MM-DD`

- Cron Vercel: usa `Authorization: Bearer <CRON_SECRET>` automaticamente.
- Manual: pode usar `x-report-token: <REPORT_MANUAL_TOKEN>`.
- O envio e bloqueado se nao existir:
  - credito de extrato no dia
  - PDF original do extrato salvo no dia

### 5. Upload de extrato PDF

`POST /api/financeiro/relatorio/upload-extrato`

`multipart/form-data`:

- `file` (PDF)
- `data_referencia` (opcional, `YYYY-MM-DD`)
- `banco` (opcional)
- `substituir` (opcional, default `true`)

Observacao: o upload tambem salva o PDF original para anexar no envio do relatorio.

### 6. Configuracao SMTP via tela

- `GET /api/financeiro/relatorio/email-config`
- `POST /api/financeiro/relatorio/email-config`

Campos do POST:

- `smtpHost`
- `smtpPort`
- `smtpSecure`
- `smtpUser`
- `smtpPass` (opcional quando ja existir senha salva)
- `emailFrom`
- `emailTo`
- `emailCc` (opcional)
- `subjectPrefix` (opcional)

### 7. Envio de e-mail de teste

`POST /api/financeiro/relatorio/email-test`

Mesmos campos da configuracao SMTP e opcionalmente:

- `data` (`YYYY-MM-DD`) para informar a data de referencia no corpo do teste.

## Observacoes de parser PDF

O parser atual usa heuristica de texto (`pdf-parse`) para identificar linhas de credito.

- Funciona melhor para PDFs com texto selecionavel.
- Para layout especifico de banco, ajuste regras em:
  - `server/utils/financeiro/report-extrato-parser.ts`

Se o PDF vier escaneado (imagem), sera necessario OCR.
