import type {
  CreditoExtratoView,
  DailyFinanceReportData,
  TransferenciaSaidaView,
  TituloPagoView,
  TituloPendenteView
} from './report-types'
import { formatCurrencyBRL, formatDateBR, formatDateRangeBR } from './report-types'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderTableRows<T>(
  rows: T[],
  renderRow: (row: T, index: number) => string,
  emptyMessage: string,
  colSpan: number
): string {
  if (rows.length === 0) {
    return `<tr><td class="empty" colspan="${colSpan}">${escapeHtml(emptyMessage)}</td></tr>`
  }

  return rows.map((row, index) => renderRow(row, index)).join('')
}

function renderCreditoRows(rows: CreditoExtratoView[]): string {
  return renderTableRows(
    rows,
    (row, index) => {
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(formatDateBR(row.dataMovimento))}</td>
        <td>${escapeHtml(row.descricao)}</td>
        <td>${escapeHtml(row.documento)}</td>
        <td>${escapeHtml(row.banco)}</td>
        <td class="value-positive">${escapeHtml(formatCurrencyBRL(row.valor))}</td>
      </tr>`
    },
    'Nenhum credito encontrado no extrato para o periodo.',
    6
  )
}

function renderTitulosPagosRows(rows: TituloPagoView[]): string {
  return renderTableRows(
    rows,
    (row, index) => {
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.numeroTitulo)}</td>
        <td>${escapeHtml(row.parcela)}</td>
        <td>${escapeHtml(row.fornecedor)}</td>
        <td>${escapeHtml(row.historico)}</td>
        <td>${escapeHtml(row.complemento)}</td>
        <td>${escapeHtml(row.contaCaixaBanco)}</td>
        <td>${escapeHtml(row.formaPagamento)}</td>
        <td>${escapeHtml(formatDateBR(row.dataBaixa))}</td>
        <td class="value-negative">${escapeHtml(formatCurrencyBRL(row.valorPago))}</td>
      </tr>`
    },
    'Nenhum titulo pago no dia de referencia.',
    10
  )
}

function renderTransferenciasRows(rows: TransferenciaSaidaView[]): string {
  return renderTableRows(
    rows,
    (row, index) => {
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(formatDateBR(row.dataMovimento))}</td>
        <td>${escapeHtml(row.descricao)}</td>
        <td>${escapeHtml(row.contaOrigem)}</td>
        <td>${escapeHtml(row.contaDestino)}</td>
        <td>${escapeHtml(row.observacao)}</td>
        <td class="value-negative">${escapeHtml(formatCurrencyBRL(row.valorTransferencia))}</td>
      </tr>`
    },
    'Nenhuma transferencia entre contas encontrada no periodo.',
    7
  )
}

function renderTitulosPendentesRows(rows: TituloPendenteView[]): string {
  return renderTableRows(
    rows,
    (row, index) => {
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.numeroTitulo)}</td>
        <td>${escapeHtml(row.fornecedor)}</td>
        <td>${escapeHtml(row.situacao)}</td>
        <td>${escapeHtml(formatDateBR(row.dataVencimento))}</td>
        <td class="value-pending">${escapeHtml(formatCurrencyBRL(row.valorPendente))}</td>
      </tr>`
    },
    'Nenhum titulo pendente ate a data de referencia.',
    6
  )
}

export function renderDailyFinanceReportHtml(payload: DailyFinanceReportData): string {
  const generatedAtLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(payload.geradoEmIso))

  const saldoClass = payload.saldoDoDia >= 0 ? 'value-positive' : 'value-negative'
  const saldoLabel = payload.saldoDoDia >= 0 ? 'Saldo liquido do dia' : 'Deficit liquido do dia'

  const warnings = payload.avisos.length > 0
    ? `<section class="warnings"><h3>Avisos de consistencia</h3><ul>${payload.avisos.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
    : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Relatorio financeiro diario</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f1f5f9;
      --ink: #0f172a;
      --muted: #475569;
      --line: #cbd5e1;
      --surface: #ffffff;
      --brand-1: #082f49;
      --brand-2: #0c4a6e;
      --brand-3: #06b6d4;
      --ok: #047857;
      --warn: #b45309;
      --danger: #b91c1c;
      --shadow: 0 16px 42px -26px rgba(15, 23, 42, 0.45);
    }

    @page {
      size: A4 landscape;
      margin: 9mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: "Segoe UI", "Tahoma", sans-serif;
      color: var(--ink);
      background: var(--bg);
      line-height: 1.36;
    }

    .report {
      width: 100%;
      max-width: 100%;
    }

    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: linear-gradient(140deg, var(--brand-1), var(--brand-2) 62%, var(--brand-3));
      color: #ffffff;
      padding: 20px 24px;
      box-shadow: var(--shadow);
    }

    .hero::before {
      content: "";
      position: absolute;
      width: 220px;
      height: 220px;
      right: -70px;
      top: -90px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.15);
      filter: blur(4px);
    }

    .hero::after {
      content: "";
      position: absolute;
      width: 190px;
      height: 190px;
      left: -60px;
      bottom: -95px;
      border-radius: 999px;
      background: rgba(125, 211, 252, 0.35);
      filter: blur(4px);
    }

    .hero-grid {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: end;
    }

    .eyebrow {
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      opacity: 0.9;
    }

    .title {
      margin: 8px 0 0;
      font-size: 30px;
      letter-spacing: -0.02em;
      font-weight: 800;
    }

    .subtitle {
      margin: 6px 0 0;
      font-size: 14px;
      max-width: 760px;
      color: rgba(255, 255, 255, 0.92);
    }

    .meta-box {
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 12px;
      padding: 10px 12px;
      min-width: 250px;
      background: rgba(255, 255, 255, 0.11);
      text-align: right;
    }

    .meta-box p {
      margin: 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.95);
    }

    .meta-box p + p {
      margin-top: 5px;
    }

    .kpi-grid {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
    }

    .kpi {
      border-radius: 12px;
      border: 1px solid var(--line);
      background: var(--surface);
      padding: 10px 12px;
      box-shadow: var(--shadow);
    }

    .kpi .label {
      margin: 0;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.13em;
      color: var(--muted);
    }

    .kpi .value {
      margin: 5px 0 0;
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
    }

    .kpi .value.value-positive {
      color: var(--ok);
    }

    .kpi .value.value-negative {
      color: var(--danger);
    }

    .section {
      margin-top: 14px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: var(--surface);
      overflow: hidden;
      box-shadow: var(--shadow);
    }

    .section-header {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(120deg, #f8fafc, #eef2ff);
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
    }

    .section-header h2 {
      margin: 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #1e293b;
    }

    .section-header span {
      font-size: 12px;
      color: #334155;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }

    thead th {
      background: #f8fafc;
      color: #1e293b;
      border-bottom: 1px solid var(--line);
      border-top: 1px solid var(--line);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 7px 8px;
      text-align: left;
    }

    tbody td {
      border-bottom: 1px solid #e2e8f0;
      padding: 6px 8px;
      vertical-align: top;
      color: #0f172a;
      word-break: break-word;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    td.value-positive {
      color: var(--ok);
      font-weight: 700;
      text-align: right;
      white-space: nowrap;
    }

    td.value-negative {
      color: var(--danger);
      font-weight: 700;
      text-align: right;
      white-space: nowrap;
    }

    td.value-pending {
      color: var(--warn);
      font-weight: 700;
      text-align: right;
      white-space: nowrap;
    }

    td.empty {
      text-align: center;
      color: #64748b;
      font-style: italic;
      padding: 16px;
    }

    .warnings {
      margin-top: 14px;
      border-radius: 12px;
      border: 1px solid #f59e0b;
      background: #fffbeb;
      padding: 10px 12px;
      box-shadow: var(--shadow);
    }

    .warnings h3 {
      margin: 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #92400e;
    }

    .warnings ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }

    .warnings li {
      margin: 3px 0;
      color: #78350f;
      font-size: 11px;
    }

    .footer {
      margin-top: 12px;
      font-size: 10px;
      color: #64748b;
      text-align: right;
    }

    .mono {
      font-family: "Consolas", "Courier New", monospace;
      letter-spacing: 0.02em;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <main class="report">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <p class="eyebrow">Control Tower Financeiro</p>
          <h1 class="title">Relatorio Diario de Receita e Pagamentos</h1>
          <p class="subtitle">Consolidado de creditos do extrato, titulos pagos no periodo e carteira pendente ate a data final selecionada.</p>
        </div>
        <div class="meta-box">
          <p><strong>Data do extrato:</strong> ${escapeHtml(formatDateBR(payload.dataReferencia))}</p>
          <p><strong>Periodo dos titulos:</strong> ${escapeHtml(formatDateRangeBR(payload.periodoTitulosInicio, payload.periodoTitulosFim))}</p>
          <p><strong>Gerado em:</strong> ${escapeHtml(generatedAtLabel)}</p>
          <p class="mono">ref: ${escapeHtml(payload.dataReferencia)}</p>
        </div>
      </div>
    </section>

    <section class="kpi-grid">
      <article class="kpi">
        <p class="label">Creditos do extrato</p>
        <p class="value">${escapeHtml(formatCurrencyBRL(payload.totalCreditosExtrato))}</p>
      </article>
      <article class="kpi">
        <p class="label">Titulos pagos no periodo</p>
        <p class="value">${escapeHtml(formatCurrencyBRL(payload.totalTitulosPagosNoDia))}</p>
      </article>
      <article class="kpi">
        <p class="label">Transferencias entre contas</p>
        <p class="value">${escapeHtml(formatCurrencyBRL(payload.totalTransferenciasNoPeriodo))}</p>
      </article>
      <article class="kpi">
        <p class="label">Pendentes ate a data final</p>
        <p class="value">${escapeHtml(formatCurrencyBRL(payload.totalTitulosPendentesAteHoje))}</p>
      </article>
      <article class="kpi">
        <p class="label">${escapeHtml(saldoLabel)}</p>
        <p class="value ${escapeHtml(saldoClass)}">${escapeHtml(formatCurrencyBRL(payload.saldoDoDia))}</p>
      </article>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Creditos extraidos do extrato</h2>
        <span>${payload.creditosExtrato.length} registros</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: 12%">Data</th>
            <th style="width: 38%">Descricao</th>
            <th style="width: 15%">Documento</th>
            <th style="width: 15%">Conta/Banco</th>
            <th style="width: 15%; text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${renderCreditoRows(payload.creditosExtrato)}
        </tbody>
      </table>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Titulos pagos no periodo</h2>
        <span>${payload.titulosPagosNoDia.length} registros</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: 11%">Titulo</th>
            <th style="width: 7%">Parcela</th>
            <th style="width: 16%">Fornecedor</th>
            <th style="width: 14%">Historico</th>
            <th style="width: 13%">Complemento</th>
            <th style="width: 12%">Conta caixa/banco</th>
            <th style="width: 8%">Forma pgto</th>
            <th style="width: 8%">Data baixa</th>
            <th style="width: 6%; text-align: right;">Valor pago</th>
          </tr>
        </thead>
        <tbody>
          ${renderTitulosPagosRows(payload.titulosPagosNoDia)}
        </tbody>
      </table>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Transferencias entre contas</h2>
        <span>${payload.transferenciasNoPeriodo.length} registros</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: 12%">Data</th>
            <th style="width: 20%">Descricao</th>
            <th style="width: 18%">Conta origem</th>
            <th style="width: 18%">Conta destino</th>
            <th style="width: 17%">Observacao</th>
            <th style="width: 10%; text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${renderTransferenciasRows(payload.transferenciasNoPeriodo)}
        </tbody>
      </table>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Titulos pendentes ate a data final</h2>
        <span>${payload.titulosPendentesAteHoje.length} registros</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: 15%">Titulo</th>
            <th style="width: 32%">Fornecedor</th>
            <th style="width: 18%">Situacao</th>
            <th style="width: 12%">Vencimento</th>
            <th style="width: 18%; text-align: right;">Valor pendente</th>
          </tr>
        </thead>
        <tbody>
          ${renderTitulosPendentesRows(payload.titulosPendentesAteHoje)}
        </tbody>
      </table>
    </section>

    ${warnings}

    <p class="footer">Relatorio gerado automaticamente pelo sistema Rupturas Lojao.</p>
  </main>
</body>
</html>`
}
