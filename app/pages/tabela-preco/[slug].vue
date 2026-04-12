<template>
  <div class="space-y-6">
    <div class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside class="print-hide rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-[0_24px_60px_-34px_rgba(15,23,42,0.45)] p-5 xl:sticky xl:top-24 h-fit">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Painel de precos</p>
        <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          Tabela de Preco
        </h1>
        <p class="mt-2 text-sm text-slate-600">
          Selecione a tabela para consultar os itens e valores.
        </p>

        <div class="mt-6 space-y-2">
          <NuxtLink
            v-for="table in priceTables"
            :key="table.slug"
            :to="`/tabela-preco/${table.slug}`"
            :class="[
              'block w-full text-left rounded-2xl p-3 transition border',
              activeSlug === table.slug
                ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            ]"
          >
            <p class="text-sm font-semibold">{{ table.title }}</p>
            <p
              :class="[
                'text-xs mt-1',
                activeSlug === table.slug ? 'text-slate-300' : 'text-slate-500'
              ]"
            >
              {{ table.description }}
            </p>
          </NuxtLink>
        </div>

        <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Ultima atualizacao</p>
            <p class="mt-1 text-sm font-semibold text-slate-700">{{ updatedAtLabel }}</p>
          </div>
          <button
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-500 transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            :disabled="pending"
            @click="refreshData"
          >
            <svg :class="{ 'animate-spin': pending }" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12a9 9 0 101.76-5.36M3 4v4h4" />
            </svg>
            Atualizar dados
          </button>
        </div>
      </aside>

      <main class="space-y-6 min-w-0">
        <section class="print-hide relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white px-6 py-7 sm:px-8">
          <div class="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-cyan-400/25 blur-2xl"></div>
          <div class="absolute -left-16 -bottom-14 h-44 w-44 rounded-full bg-orange-300/20 blur-3xl"></div>

          <div class="relative">
            <p class="text-xs uppercase tracking-[0.22em] text-cyan-100/90">Modulo comercial</p>
            <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {{ activeTable?.title || 'Tabela de Preco' }}
            </h2>
            <p class="mt-2 text-cyan-50/90 text-sm sm:text-base">
              {{ activeTable?.description }}
            </p>
            <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {{ filteredItems.length }} itens exibidos apos filtros
            </div>
          </div>
        </section>

        <div
          v-if="error"
          class="print-hide rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm"
        >
          <p class="font-semibold text-sm">Erro ao carregar dados</p>
          <p class="text-sm mt-1">{{ error.message }}</p>
        </div>

        <section class="print-hide rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur-xl p-4 sm:p-5">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_210px_210px]">
            <div class="relative">
              <input
                v-model="search"
                type="text"
                class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                placeholder="Buscar por codigo, produto ou estoque..."
              >
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p class="text-xs uppercase tracking-wide text-slate-500">Perfil de acesso</p>
              <select
                v-model="currentProfile"
                class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="diretor">Diretor (solicita)</option>
                <option value="gerente">Gerente (acompanha)</option>
              </select>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p class="text-xs uppercase tracking-wide text-slate-500">Total da tabela</p>
              <p class="font-semibold text-slate-800">{{ items.length }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <p class="text-xs uppercase tracking-wide text-slate-500">Solicitacoes pendentes</p>
              <p class="font-semibold text-slate-800">{{ pendingRequestCount }}</p>
            </div>
          </div>
          <p class="mt-3 text-xs text-slate-500">
            Diretor abre solicitacoes na coluna de acoes. O gerente aplica no ERP e, ao atualizar esta consulta, a solicitacao pendente e finalizada automaticamente.
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              :class="[
                'inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                activePanelTab === 'tabela'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              ]"
              @click="activePanelTab = 'tabela'"
            >
              Tabela de produtos
            </button>
            <button
              :class="[
                'inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                activePanelTab === 'historico'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              ]"
              @click="activePanelTab = 'historico'"
            >
              Historico de alteracoes ({{ historyRequestCount }})
            </button>
          </div>
        </section>

        <section
          v-if="pendingAddRequests.length > 0"
          class="print-hide rounded-2xl border border-cyan-200/80 bg-cyan-50/60 p-4 sm:p-5"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-cyan-900">
              Produtos solicitados para adicionar ({{ pendingAddRequests.length }})
            </h3>
            <p class="text-xs text-cyan-700">
              O gerente adiciona no ERP. Depois da atualizacao automatica, a solicitacao vira historico.
            </p>
          </div>
          <div class="mt-3 grid gap-2">
            <article
              v-for="request in pendingAddRequests"
              :key="request.id"
              class="rounded-xl border border-cyan-200 bg-white px-3 py-2.5"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-slate-900 break-words">
                    {{ normalizeText(request.produto) }}
                  </p>
                  <p class="mt-1 text-xs text-slate-600">
                    Cod: {{ normalizeText(request.codigo) }} | Solicitado por {{ request.solicitante || 'nao informado' }} em {{ formatDateTime(request.created_at) }}
                  </p>
                  <p
                    v-if="relatedCodesFromRequest(request).length > 0"
                    class="mt-1 text-xs text-slate-600"
                  >
                    Codigos do kit: {{ relatedCodesFromRequest(request).join(', ') }}
                  </p>
                  <p
                    v-if="request.novo_preco !== null && request.novo_preco !== undefined"
                    class="mt-1 text-xs text-slate-600"
                  >
                    Preco sugerido: {{ formatCurrency(request.novo_preco) }}
                    <span v-if="request.preco_atual !== null && request.preco_atual !== undefined">
                      | Preco base: {{ formatCurrency(request.preco_atual) }}
                    </span>
                  </p>
                  <p
                    v-if="request.observacao"
                    class="mt-1 text-xs text-slate-600 break-words"
                  >
                    Obs.: {{ request.observacao }}
                  </p>
                </div>
                <div
                  v-if="currentProfile === 'diretor'"
                  class="flex items-center gap-2"
                >
                  <button
                    class="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    :disabled="cancelingRequestId === request.id"
                    @click="cancelPendingRequest(request)"
                  >
                    {{ cancelingRequestId === request.id ? 'Cancelando...' : 'Cancelar solicitacao' }}
                  </button>
                </div>
              </div>
              <p
                v-if="cancelErrorRequestId === request.id && cancelErrorMessage"
                class="mt-1 text-[11px] font-medium text-red-700"
              >
                {{ cancelErrorMessage }}
              </p>
            </article>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-[0_20px_55px_-32px_rgba(15,23,42,0.45)] overflow-hidden">
          <template v-if="activePanelTab === 'tabela'">
            <div v-if="pending && items.length === 0" class="p-12 flex flex-col items-center justify-center text-slate-500">
              <svg class="animate-spin h-8 w-8 text-cyan-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.97 7.97 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"></path>
              </svg>
              <p>Buscando tabela de preco no Supabase...</p>
            </div>

            <div v-else-if="filteredItems.length === 0" class="p-12 text-center">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2a4 4 0 114 0v2m-4 0h4m-7 0h10a2 2 0 002-2v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-slate-900">Nenhum item encontrado</h3>
              <p class="mt-1 text-sm text-slate-500">Ajuste o filtro de busca para visualizar os produtos da tabela.</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full table-fixed divide-y divide-slate-200">
                <thead class="bg-slate-50/80">
                  <tr>
                    <th class="w-[7%] px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Codigo</th>
                    <th class="w-[41%] px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
                    <th class="w-[7%] px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Preco tabela</th>
                    <th class="w-[7%] px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo</th>
                    <th class="w-[7%] px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">DVV %</th>
                    <th class="w-[7%] px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">MC</th>
                    <th class="w-[7%] px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qtd total</th>
                    <th class="w-[17%] px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div class="flex items-center justify-between gap-2">
                        <span>Acoes</span>
                        <button
                          v-if="currentProfile === 'diretor'"
                          class="inline-flex items-center rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-[10px] font-semibold text-cyan-700 hover:bg-cyan-100"
                          @click="openAddProductModal"
                        >
                          Adicionar
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-slate-200/80">
                  <tr
                    v-for="item in filteredItems"
                    :key="item.id"
                    class="transition-colors hover:bg-gradient-to-r hover:from-cyan-50/60 hover:to-transparent"
                  >
                    <td class="px-3 py-3 align-top">
                      <span class="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                        {{ normalizeText(item.codigo) }}
                      </span>
                    </td>
                    <td class="px-3 py-3 align-top">
                      <p class="text-sm font-semibold text-slate-900 leading-snug break-words">
                        {{ normalizeText(item.produto) }}
                      </p>
                      <div
                        v-if="parsedDetalhamento(item.detalhamento_estoque).length > 0"
                        class="mt-2 flex flex-wrap gap-1.5"
                      >
                        <div
                          v-for="detail in parsedDetalhamento(item.detalhamento_estoque)"
                          :key="detail.key"
                          class="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5"
                        >
                          <p class="text-[11px] font-semibold text-slate-700">
                            {{ detail.label }}
                          </p>
                          <span class="inline-flex items-center rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-200">
                            Assu: {{ formatStockQuantity(detail.assu) }}
                          </span>
                          <span class="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            Deposito: {{ formatStockQuantity(detail.deposito) }}
                          </span>
                          <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            Mossoro: {{ formatStockQuantity(detail.mossoro) }}
                          </span>
                        </div>
                      </div>
                      <p
                        v-else-if="item.detalhamento_estoque"
                        class="mt-1 text-xs text-slate-500 break-words"
                      >
                        {{ item.detalhamento_estoque }}
                      </p>
                    </td>
                    <td class="px-3 py-3 text-right text-sm font-semibold text-slate-900 align-top">{{ formatDecimal(item.preco_tabela) }}</td>
                    <td class="px-3 py-3 text-right text-sm text-slate-700 align-top">{{ formatDecimal(item.custo) }}</td>
                    <td class="px-3 py-3 text-right text-sm text-slate-700 align-top">{{ formatDecimal(item.dvv_percentual) }}</td>
                    <td class="px-3 py-3 text-right text-sm text-slate-700 align-top">{{ formatDecimal(item.mc) }}</td>
                    <td class="px-3 py-3 text-right text-sm text-slate-700 align-top">{{ formatDecimal(item.quantidade_disponivel_total) }}</td>
                    <td class="px-3 py-3 align-top">
                      <div
                        v-if="requestByRowId[item.id]"
                        class="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5"
                      >
                        <p class="text-xs font-semibold text-amber-800">
                          {{ describeRequest(requestByRowId[item.id]) }}
                        </p>
                        <p class="mt-1 text-[11px] text-amber-700">
                          Solicitado por {{ requestByRowId[item.id]?.solicitante || 'nao informado' }} em
                          {{ formatDateTime(requestByRowId[item.id]?.created_at) }}
                        </p>
                        <p
                          v-if="requestByRowId[item.id]?.observacao"
                          class="mt-1 text-[11px] text-amber-700 break-words"
                        >
                          Obs.: {{ requestByRowId[item.id]?.observacao }}
                        </p>
                        <div v-if="currentProfile === 'diretor'" class="mt-2">
                          <button
                            class="inline-flex items-center rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                            :disabled="cancelingRequestId === requestByRowId[item.id]?.id"
                            @click="cancelPendingRequest(requestByRowId[item.id])"
                          >
                            {{ cancelingRequestId === requestByRowId[item.id]?.id ? 'Cancelando...' : 'Cancelar solicitacao' }}
                          </button>
                        </div>
                        <p
                          v-if="cancelErrorRequestId === requestByRowId[item.id]?.id && cancelErrorMessage"
                          class="mt-1 text-[11px] font-medium text-red-700"
                        >
                          {{ cancelErrorMessage }}
                        </p>
                      </div>

                      <div
                        v-else-if="currentProfile === 'diretor' && requestFormRowId === item.id"
                        class="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2"
                      >
                        <div class="grid gap-2">
                          <select
                            v-model="requestForm.acao"
                            class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          >
                            <option value="alterar_preco">Alterar preco</option>
                            <option value="excluir">Excluir item</option>
                          </select>

                          <input
                            v-if="requestForm.acao === 'alterar_preco'"
                            v-model="requestForm.novoPreco"
                            type="text"
                            inputmode="decimal"
                            class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            placeholder="Novo preco (ex: 1999,90)"
                          >

                          <input
                            v-model="requestForm.solicitante"
                            type="text"
                            class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            placeholder="Nome do solicitante"
                          >

                          <input
                            v-model="requestForm.observacao"
                            type="text"
                            class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            placeholder="Observacao (opcional)"
                          >
                        </div>

                        <div class="flex flex-wrap gap-1.5">
                          <button
                            class="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            :disabled="savingRequest"
                            @click="submitRequest(item)"
                          >
                            {{ savingRequest ? 'Salvando...' : 'Enviar solicitacao' }}
                          </button>
                          <button
                            class="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            @click="cancelRequestForm"
                          >
                            Cancelar
                          </button>
                        </div>

                        <p v-if="requestFormError" class="text-[11px] font-medium text-red-600">
                          {{ requestFormError }}
                        </p>
                      </div>

                      <div v-else-if="currentProfile === 'diretor'" class="space-y-1.5">
                        <button
                          class="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          @click="openRequestForm(item)"
                        >
                          Solicitar acao
                        </button>
                      </div>

                      <p v-else class="text-xs text-slate-400">Sem solicitacao pendente</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-else>
            <div class="print-hide border-b border-slate-200 px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-slate-500">
                Exporte as solicitacoes pendentes para compartilhar com os gerentes.
              </p>
              <button
                class="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                :disabled="pendingRequestCount === 0"
                @click="exportPendingRequestsPdf"
              >
                Gerar PDF solicitacoes pendentes
              </button>
            </div>

            <div v-if="pending && solicitacoesHistorico.length === 0" class="p-12 flex flex-col items-center justify-center text-slate-500">
              <svg class="animate-spin h-8 w-8 text-cyan-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.97 7.97 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"></path>
              </svg>
              <p>Buscando historico...</p>
            </div>

            <div v-else-if="solicitacoesHistorico.length === 0" class="p-12 text-center">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
                </svg>
              </div>
              <h3 class="text-sm font-semibold text-slate-900">Sem historico de alteracoes</h3>
              <p class="mt-1 text-sm text-slate-500">As solicitacoes resolvidas e canceladas vao aparecer aqui.</p>
            </div>

            <div v-else class="divide-y divide-slate-200/80">
              <article
                v-for="request in solicitacoesHistorico"
                :key="request.id"
                class="p-4 sm:p-5"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900 break-words">
                      {{ normalizeText(request.produto) }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500">
                      Cod: {{ normalizeText(request.codigo) }} | Solicitado por {{ request.solicitante || 'nao informado' }} em {{ formatDateTime(request.created_at) }}
                    </p>
                  </div>
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                      historyStatusClass(request.status)
                    ]"
                  >
                    {{ historyStatusLabel(request.status) }}
                  </span>
                </div>
                <p class="mt-3 text-sm text-slate-700">
                  <span class="font-semibold text-slate-800">Solicitacao:</span>
                  {{ describeRequest(request) }}
                </p>
                <p class="mt-1 text-sm text-slate-700">
                  <span class="font-semibold text-slate-800">Resultado:</span>
                  {{ historyResultLabel(request) }}
                </p>
                <p class="mt-1 text-xs text-slate-500">
                  {{ request.status === 'pendente' ? 'Pendente desde' : 'Finalizado em' }}
                  {{ formatDateTime(request.status === 'pendente' ? request.created_at : (request.resolvido_em || request.updated_at)) }}
                </p>
              </article>
            </div>
          </template>
        </section>

        <div
          v-if="isAddProductModalOpen"
          class="fixed inset-0 z-[70] flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            @click="closeAddProductModal"
          />
          <div class="relative z-[71] w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 class="text-base font-semibold text-slate-900">Solicitar adicao de produto</h3>
                <p class="text-xs text-slate-500">Busque no catalogo do webhook e envie a solicitacao para o gerente aplicar no ERP.</p>
              </div>
              <button
                class="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                @click="closeAddProductModal"
              >
                Fechar
              </button>
            </div>

            <div class="space-y-3 px-4 py-4">
              <input
                v-model="addProductSearch"
                type="text"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                placeholder="Digite codigo ou nome do produto..."
                @input="clearSelectedProductIfNeeded"
              >

              <div class="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p class="px-1 text-xs text-slate-500">
                  {{ addProductHintText }}
                </p>
                <div class="mt-2 max-h-64 space-y-1 overflow-y-auto">
                  <button
                    v-for="suggestion in addProductSuggestions"
                    :key="suggestion.codigo"
                    type="button"
                    :class="[
                      'w-full rounded-lg border px-3 py-2 text-left transition',
                      selectedAddProduct?.codigo === suggestion.codigo
                        ? 'border-cyan-300 bg-cyan-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100'
                    ]"
                    @click="selectedAddProduct = suggestion"
                  >
                    <p class="text-sm font-semibold text-slate-900 break-words">{{ suggestion.produto }}</p>
                    <p class="mt-0.5 text-xs text-slate-600">Cod: {{ suggestion.codigo }}</p>
                    <p class="mt-0.5 text-xs text-slate-500">
                      Preco: {{ formatCurrency(suggestion.preco_tabela) }} | Custo: {{ formatCurrency(suggestion.custo) }}
                    </p>
                  </button>
                </div>
              </div>

              <div
                v-if="selectedAddProduct"
                class="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3"
              >
                <p class="text-xs font-semibold uppercase tracking-wide text-cyan-800">Produto selecionado</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 break-words">{{ selectedAddProduct.produto }}</p>
                <p class="mt-0.5 text-xs text-slate-600">Cod: {{ selectedAddProduct.codigo }}</p>

                <div class="mt-3 grid gap-2 sm:grid-cols-3">
                  <div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                    <p class="text-[11px] uppercase tracking-wide text-slate-500">Preco base</p>
                    <p class="mt-1 text-sm font-semibold text-slate-900">
                      {{ formatCurrency(selectedAddProduct.preco_tabela) }}
                    </p>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                    <p class="text-[11px] uppercase tracking-wide text-slate-500">Custo</p>
                    <p class="mt-1 text-sm font-semibold text-slate-900">
                      {{ formatCurrency(selectedAddProduct.custo) }}
                    </p>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                    <p class="text-[11px] uppercase tracking-wide text-slate-500">MC atual</p>
                    <p class="mt-1 text-sm font-semibold text-slate-900">
                      {{ formatPercent(addProductCurrentMc) }}
                    </p>
                  </div>
                </div>

                <div class="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <label class="text-[11px] uppercase tracking-wide text-slate-500">Preco sugerido</label>
                    <input
                      v-model="addProductPriceInput"
                      type="text"
                      inputmode="decimal"
                      class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      placeholder="Ex: 2650,00"
                    >
                  </div>
                  <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                    <p class="text-[11px] uppercase tracking-wide text-emerald-700">MC recalculada</p>
                    <p class="mt-1 text-sm font-semibold text-emerald-800">
                      {{ formatPercent(addProductCalculatedMc) }}
                    </p>
                    <p class="mt-1 text-[11px] text-emerald-700">
                      Formula: (((preco - custo - (preco * 0,165)) / preco) * 100)
                    </p>
                  </div>
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-[11px] uppercase tracking-wide text-slate-500">
                  Codigos relacionados do kit (opcional)
                </label>
                <input
                  v-model="addProductRelatedCodesInput"
                  type="text"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="Ex: 3255, 3252"
                >
                <p class="text-[11px] text-slate-500">
                  Use quando o codigo solicitado for um kit. A solicitacao baixa quando todos os codigos informados entrarem na tabela.
                </p>
              </div>

              <input
                v-model="addProductObservation"
                type="text"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                placeholder="Observacao (opcional)"
              >

              <p v-if="addProductError" class="text-xs font-semibold text-red-600">
                {{ addProductError }}
              </p>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                @click="closeAddProductModal"
              >
                Cancelar
              </button>
              <button
                class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                :disabled="savingRequest || !selectedAddProduct || addProductParsedPrice === null || addProductParsedPrice <= 0"
                @click="submitAddProductRequest"
              >
                {{ savingRequest ? 'Salvando...' : 'Enviar solicitacao de adicao' }}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useTabelaPreco } from '~/composables/useTabelaPreco'
import type {
  SolicitacaoAcao,
  TabelaPrecoItem,
  TabelaPrecoSolicitacao
} from '~/types/supabase'

type UserProfile = 'diretor' | 'gerente'

type PriceTableOption = {
  slug: string;
  dbName: string;
  title: string;
  description: string;
}

type EstoqueDetalhe = {
  key: string;
  label: string;
  assu: number | null;
  deposito: number | null;
  mossoro: number | null;
}

type RequestFormState = {
  acao: SolicitacaoAcao;
  novoPreco: string;
  solicitante: string;
  observacao: string;
}

type PanelTab = 'tabela' | 'historico'

type AddProductSuggestion = {
  codigo: string;
  produto: string;
  tabela_preco: string | null;
  preco_tabela: number | null;
  custo: number | null;
  dvv_percentual: number | null;
  mc: number | null;
  quantidade_disponivel_total: number | null;
  detalhamento_estoque: string | null;
}

const MC_TAX_RATE = 0.165

const priceTables: PriceTableOption[] = [
  {
    slug: 'assu-cartao',
    dbName: 'TABELA INTERNA ASSU CART\u00C3O',
    title: 'Tabela Assu Cartao',
    description: 'Tabela interna de preco para a loja Assu.'
  },
  {
    slug: 'mossoro-filial-01',
    dbName: 'TABELA INTERNA MOSSORO FILIAL 01',
    title: 'Tabela Mossoro Filial 01',
    description: 'Tabela interna de preco para a filial de Mossoro.'
  }
]

const route = useRoute()
const search = ref('')
const activePanelTab = ref<PanelTab>('tabela')
const currentProfile = ref<UserProfile>('diretor')
const detailCache = new Map<string, EstoqueDetalhe[]>()
const requestFormRowId = ref<number | null>(null)
const requestFormError = ref<string | null>(null)
const cancelErrorRequestId = ref<number | null>(null)
const cancelErrorMessage = ref<string | null>(null)
const isAddProductModalOpen = ref(false)
const addProductSearch = ref('')
const addProductSuggestions = ref<AddProductSuggestion[]>([])
const addProductLoading = ref(false)
const addProductError = ref<string | null>(null)
const addProductObservation = ref('')
const selectedAddProduct = ref<AddProductSuggestion | null>(null)
const addProductPriceInput = ref('')
const addProductRelatedCodesInput = ref('')
let addProductSearchTimer: ReturnType<typeof setTimeout> | null = null
const requestForm = ref<RequestFormState>({
  acao: 'alterar_preco',
  novoPreco: '',
  solicitante: 'Diretor',
  observacao: ''
})

const {
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
} = useTabelaPreco()

const activeSlug = computed(() => {
  return typeof route.params.slug === 'string' ? route.params.slug : ''
})

const activeTable = computed(() => {
  return priceTables.find((table) => table.slug === activeSlug.value) ?? null
})

const pendingRequestCount = computed(() => solicitacoesPendentes.value.length)
const historyRequestCount = computed(() => solicitacoesHistorico.value.length)
const pendingAddRequests = computed(() => {
  return solicitacoesPendentes.value.filter((request) => request.acao === 'adicionar_produto')
})
const addProductParsedPrice = computed(() => parseMoneyInput(addProductPriceInput.value))
const addProductCurrentMc = computed(() => {
  if (!selectedAddProduct.value) return null
  if (selectedAddProduct.value.mc !== null) return selectedAddProduct.value.mc

  return calculateMc(selectedAddProduct.value.preco_tabela, selectedAddProduct.value.custo)
})
const addProductCalculatedMc = computed(() => {
  if (!selectedAddProduct.value) return null
  return calculateMc(addProductParsedPrice.value, selectedAddProduct.value.custo)
})
const addProductRelatedCodes = computed(() => parseRelatedCodesInput(addProductRelatedCodesInput.value))

const addProductHintText = computed(() => {
  if (addProductLoading.value) return 'Buscando produtos...'
  if (!addProductSearch.value.trim()) return 'Digite pelo menos 2 caracteres para buscar.'
  if (addProductSearch.value.trim().length < 2) return 'Digite pelo menos 2 caracteres para buscar.'
  if (addProductSuggestions.value.length === 0) return 'Nenhum produto encontrado para este termo.'
  return 'Selecione um produto para solicitar a adicao.'
})

const requestByRowId = computed<Record<number, TabelaPrecoSolicitacao>>(() => {
  const map: Record<number, TabelaPrecoSolicitacao> = {}

  solicitacoesPendentes.value.forEach((request) => {
    if (request.acao === 'adicionar_produto' || request.tabela_preco_id === null) return

    if (!map[request.tabela_preco_id]) {
      map[request.tabela_preco_id] = request
    }
  })

  return map
})

const updatedAtLabel = computed(() => {
  if (!updatedAt.value) return '--'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(updatedAt.value))
})

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return items.value

  return items.value.filter((item) => {
    const codigo = item.codigo?.toLowerCase() ?? ''
    const produto = item.produto?.toLowerCase() ?? ''
    const detalhe = item.detalhamento_estoque?.toLowerCase() ?? ''
    return codigo.includes(term) || produto.includes(term) || detalhe.includes(term)
  })
})

watch(
  () => currentProfile.value,
  () => {
    requestForm.value.solicitante = currentProfile.value === 'diretor' ? 'Diretor' : 'Gerente'
  }
)

watch(
  () => activeSlug.value,
  async () => {
    const table = activeTable.value

    if (!table) {
      await navigateTo(`/tabela-preco/${priceTables[0].slug}`, { replace: true })
      return
    }

    search.value = ''
    activePanelTab.value = 'tabela'
    cancelRequestForm()
    closeAddProductModal()
    cancelErrorRequestId.value = null
    cancelErrorMessage.value = null
    await fetchByTabela(table.dbName)
  },
  { immediate: true }
)

watch(
  () => addProductSearch.value,
  (value) => {
    if (!isAddProductModalOpen.value) return

    if (addProductSearchTimer) {
      clearTimeout(addProductSearchTimer)
      addProductSearchTimer = null
    }

    const term = value.trim()
    if (term.length < 2) {
      addProductLoading.value = false
      addProductSuggestions.value = []
      if (!term) {
        addProductError.value = null
      }
      return
    }

    addProductSearchTimer = setTimeout(async () => {
      await fetchAddProductSuggestions(term)
    }, 350)
  }
)

watch(
  () => selectedAddProduct.value,
  (product) => {
    if (!product) {
      addProductPriceInput.value = ''
      return
    }

    addProductPriceInput.value = formatDecimalToInput(product.preco_tabela)
  }
)

onBeforeUnmount(() => {
  if (addProductSearchTimer) {
    clearTimeout(addProductSearchTimer)
    addProductSearchTimer = null
  }
})

async function refreshData() {
  if (!activeTable.value) return
  await fetchByTabela(activeTable.value.dbName)
}

function openRequestForm(item: TabelaPrecoItem) {
  requestFormRowId.value = item.id
  requestFormError.value = null
  cancelErrorRequestId.value = null
  cancelErrorMessage.value = null
  requestForm.value = {
    acao: 'alterar_preco',
    novoPreco: formatDecimalToInput(item.preco_tabela),
    solicitante: currentProfile.value === 'diretor' ? 'Diretor' : 'Gerente',
    observacao: ''
  }
}

function cancelRequestForm() {
  requestFormRowId.value = null
  requestFormError.value = null
}

async function submitRequest(item: TabelaPrecoItem) {
  requestFormError.value = null

  if (!activeTable.value) {
    requestFormError.value = 'Tabela ativa nao encontrada.'
    return
  }

  let novoPreco: number | null = null
  if (requestForm.value.acao === 'alterar_preco') {
    novoPreco = parseMoneyInput(requestForm.value.novoPreco)
    if (novoPreco === null) {
      requestFormError.value = 'Informe um novo preco valido.'
      return
    }
  }

  try {
    await createSolicitacao({
      item,
      tabelaNome: activeTable.value.dbName,
      acao: requestForm.value.acao,
      novoPreco,
      solicitante: requestForm.value.solicitante,
      observacao: requestForm.value.observacao
    })

    await fetchByTabela(activeTable.value.dbName)
    cancelRequestForm()
  } catch (err: any) {
    requestFormError.value = err?.message || 'Falha ao criar solicitacao.'
  }
}

async function cancelPendingRequest(request: TabelaPrecoSolicitacao | undefined) {
  if (!request || !activeTable.value) return

  cancelErrorRequestId.value = null
  cancelErrorMessage.value = null

  try {
    await cancelSolicitacao(request.id)
    await fetchByTabela(activeTable.value.dbName)
  } catch (err: any) {
    cancelErrorRequestId.value = request.id
    cancelErrorMessage.value = err?.message || 'Falha ao cancelar solicitacao.'
  }
}

function openAddProductModal() {
  addProductError.value = null
  addProductSearch.value = ''
  addProductSuggestions.value = []
  addProductObservation.value = ''
  addProductPriceInput.value = ''
  addProductRelatedCodesInput.value = ''
  selectedAddProduct.value = null
  isAddProductModalOpen.value = true
}

function closeAddProductModal() {
  isAddProductModalOpen.value = false
  addProductError.value = null
  addProductLoading.value = false
  addProductSuggestions.value = []
  addProductSearch.value = ''
  addProductObservation.value = ''
  addProductPriceInput.value = ''
  addProductRelatedCodesInput.value = ''
  selectedAddProduct.value = null

  if (addProductSearchTimer) {
    clearTimeout(addProductSearchTimer)
    addProductSearchTimer = null
  }
}

function normalizeProductSuggestion(entry: any): AddProductSuggestion | null {
  const codigoRaw = String(
    entry?.codigo ??
    entry?.codigo_produto ??
    entry?.cod_produto ??
    entry?.code ??
    entry?.id ??
    ''
  ).trim()
  const produtoRaw = String(
    entry?.produto ??
    entry?.nome_produto ??
    entry?.nome ??
    entry?.descricao_produto ??
    entry?.descricao ??
    ''
  ).trim()

  if (!codigoRaw || !produtoRaw) return null

  return {
    codigo: codigoRaw,
    produto: produtoRaw,
    tabela_preco: parseSuggestionText(entry?.tabela_preco),
    preco_tabela: parseSuggestionNumber(entry?.preco_tabela),
    custo: parseSuggestionNumber(entry?.custo),
    dvv_percentual: parseSuggestionNumber(entry?.dvv_percentual),
    mc: parseSuggestionNumber(entry?.mc),
    quantidade_disponivel_total: parseSuggestionNumber(entry?.quantidade_disponivel_total),
    detalhamento_estoque: parseSuggestionText(entry?.detalhamento_estoque)
  }
}

function parseSuggestionText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

function parseSuggestionNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const raw = String(value).trim()
  if (!raw) return null

  let normalized = raw
  const hasDot = normalized.includes('.')
  const hasComma = normalized.includes(',')
  if (hasDot && hasComma) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
  }

  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

async function fetchAddProductSuggestions(term: string) {
  addProductLoading.value = true
  addProductError.value = null

  try {
    const response = await $fetch<any[]>('/api/produtos/buscar', {
      query: {
        q: term
      }
    })

    const uniqueByCode = new Map<string, AddProductSuggestion>()
    ;(response ?? []).forEach((item) => {
      const normalized = normalizeProductSuggestion(item)
      if (!normalized) return
      const key = normalized.codigo.trim().toUpperCase()
      if (!uniqueByCode.has(key)) {
        uniqueByCode.set(key, normalized)
      }
    })

    addProductSuggestions.value = Array.from(uniqueByCode.values())
  } catch (err: any) {
    addProductSuggestions.value = []
    addProductError.value = err?.message || 'Falha ao consultar o webhook de produtos.'
  } finally {
    addProductLoading.value = false
  }
}

function clearSelectedProductIfNeeded() {
  selectedAddProduct.value = null
}

async function submitAddProductRequest() {
  addProductError.value = null

  if (!activeTable.value) {
    addProductError.value = 'Tabela ativa nao encontrada.'
    return
  }

  if (!selectedAddProduct.value) {
    addProductError.value = 'Selecione um produto na lista para solicitar a adicao.'
    return
  }

  const precoSugerido = addProductParsedPrice.value
  if (precoSugerido === null || precoSugerido <= 0) {
    addProductError.value = 'Informe um preco sugerido valido para o produto.'
    return
  }

  try {
    await createSolicitacao({
      acao: 'adicionar_produto',
      tabelaNome: activeTable.value.dbName,
      codigo: selectedAddProduct.value.codigo,
      codigosRelacionados: addProductRelatedCodes.value,
      produto: selectedAddProduct.value.produto,
      precoAtual: selectedAddProduct.value.preco_tabela,
      novoPreco: precoSugerido,
      solicitante: currentProfile.value === 'diretor' ? 'Diretor' : 'Gerente',
      observacao: addProductObservation.value
    })

    await fetchByTabela(activeTable.value.dbName)
    closeAddProductModal()
  } catch (err: any) {
    addProductError.value = err?.message || 'Falha ao criar solicitacao de adicao.'
  }
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || '-'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '--'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function formatDecimal(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)

  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return '-'

  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatPercent(value: number | string | null | undefined) {
  const formatted = formatDecimal(value)
  if (formatted === '-') return '-'
  return `${formatted}%`
}

function formatDecimalToInput(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return num.toFixed(2).replace('.', ',')
}

function parseMoneyInput(value: string) {
  const cleaned = value.trim()
  if (!cleaned) return null

  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned

  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return null

  return Math.round(parsed * 100) / 100
}

function normalizeCode(value: string | null | undefined) {
  return value?.trim().toUpperCase() || ''
}

function parseRelatedCodesInput(value: string | null | undefined) {
  if (!value) return []

  const seen = new Set<string>()
  const codes: string[] = []

  value
    .split(/[\n,;]+/)
    .flatMap((chunk) => chunk.split(/\s+/))
    .forEach((chunk) => {
      const normalized = normalizeCode(chunk)
      if (!normalized || seen.has(normalized)) return
      seen.add(normalized)
      codes.push(normalized)
    })

  return codes
}

function relatedCodesFromRequest(request: TabelaPrecoSolicitacao) {
  return parseRelatedCodesInput(Array.isArray(request.codigos_relacionados) ? request.codigos_relacionados.join(',') : '')
}

function calculateMc(precoTabela: number | null, custo: number | null): number | null {
  if (precoTabela === null || custo === null) return null
  if (precoTabela <= 0) return null

  const mc = (((precoTabela - custo - (precoTabela * MC_TAX_RATE)) / precoTabela) * 100)
  if (!Number.isFinite(mc)) return null

  return Math.round(mc * 100) / 100
}

function describeRequest(request: TabelaPrecoSolicitacao | undefined) {
  if (!request) return ''
  if (request.acao === 'adicionar_produto') {
    const relatedCodes = relatedCodesFromRequest(request)
    const relatedSuffix = relatedCodes.length > 0
      ? ` | Kit: ${relatedCodes.join(', ')}`
      : ''

    if (request.novo_preco !== null && request.novo_preco !== undefined) {
      if (request.preco_atual !== null && request.preco_atual !== undefined) {
        return `Solicitado: adicionar produto com preco ${formatCurrency(request.novo_preco)} (base ${formatCurrency(request.preco_atual)})${relatedSuffix}`
      }

      return `Solicitado: adicionar produto com preco ${formatCurrency(request.novo_preco)}${relatedSuffix}`
    }

    return `Solicitado: adicionar produto${relatedSuffix}`
  }
  if (request.acao === 'excluir') return 'Solicitado: excluir produto'
  return `Solicitado: alterar preco de ${formatCurrency(request.preco_atual)} para ${formatCurrency(request.novo_preco)}`
}

function historyStatusLabel(status: TabelaPrecoSolicitacao['status']) {
  if (status === 'resolvida') return 'Resolvida'
  if (status === 'cancelada') return 'Cancelada'
  return 'Pendente'
}

function historyStatusClass(status: TabelaPrecoSolicitacao['status']) {
  if (status === 'resolvida') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  if (status === 'cancelada') return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
  return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
}

function requestActionLabel(action: TabelaPrecoSolicitacao['acao']) {
  if (action === 'alterar_preco') return 'Alterar preco'
  if (action === 'excluir') return 'Excluir produto'
  return 'Adicionar produto'
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function exportPendingRequestsPdf() {
  if (!import.meta.client) return

  const requests = [...solicitacoesPendentes.value]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (requests.length === 0) {
    window.alert('Nao ha solicitacoes pendentes para gerar o PDF.')
    return
  }

  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date())

  const reportTitle = `Solicitacoes pendentes - ${activeTable.value?.title || 'Tabela de Preco'}`
  const reportSubtitle = `${requests.length} solicitacoes pendentes | Gerado em ${generatedAt}`
  const logoUrl = new URL('/LOGONEW .png', window.location.origin).toString()

  const bodyHtml = requests.map((request) => {
    const codigo = normalizeText(request.codigo)
    const produto = normalizeText(request.produto)
    const solicitante = request.solicitante?.trim() || 'nao informado'
    const detalhes = describeRequest(request)
    const observacao = request.observacao?.trim() || '-'
    const relatedCodes = relatedCodesFromRequest(request)
    const relatedCodesLabel = relatedCodes.length > 0 ? relatedCodes.join(', ') : '-'

    return `<tr>
      <td>${escapeHtml(formatDateTime(request.created_at))}</td>
      <td>${escapeHtml(requestActionLabel(request.acao))}</td>
      <td>${escapeHtml(codigo)}</td>
      <td>${escapeHtml(produto)}</td>
      <td>${escapeHtml(solicitante)}</td>
      <td>${escapeHtml(relatedCodesLabel)}</td>
      <td>${escapeHtml(detalhes)}</td>
      <td>${escapeHtml(observacao)}</td>
    </tr>`
  }).join('')

  const styleTagOpen = '<st' + 'yle>'
  const styleTagClose = '</st' + 'yle>'

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportTitle)}</title>
  ${styleTagOpen}
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; }
    .wrap { width: 100%; }
    .header { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
    .logo-wrap { display: flex; align-items: center; justify-content: center; width: 96px; height: 96px; padding: 0; border: none; border-radius: 0; box-shadow: none; background: transparent; }
    .logo-wrap img { width: 96px; height: auto; object-fit: contain; display: block; }
    .meta h1 { margin: 0; font-size: 16px; font-weight: 700; }
    .sub { margin: 4px 0 0; font-size: 11px; color: #475569; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; word-break: break-word; }
    th { background: #f1f5f9; text-align: left; font-weight: 700; }
    tr { page-break-inside: avoid; break-inside: avoid; }
  ${styleTagClose}
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo-wrap">
        <img src="${logoUrl}" alt="Logo Lojao" />
      </div>
      <div class="meta">
        <h1>${escapeHtml(reportTitle)}</h1>
        <p class="sub">${escapeHtml(reportSubtitle)}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 10%;">Data</th>
          <th style="width: 10%;">Acao</th>
          <th style="width: 8%;">Codigo</th>
          <th style="width: 24%;">Produto</th>
          <th style="width: 10%;">Solicitante</th>
          <th style="width: 10%;">Codigos do kit</th>
          <th style="width: 16%;">Solicitacao</th>
          <th style="width: 12%;">Observacao</th>
        </tr>
      </thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=1280,height=900')
  if (!printWindow) {
    window.alert('Nao foi possivel abrir a janela de impressao. Libere pop-ups para gerar o PDF.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  const closeOnPrint = () => printWindow.close()
  printWindow.addEventListener('afterprint', closeOnPrint, { once: true })
  const triggerPrint = () => {
    printWindow.focus()
    printWindow.print()
  }

  const images = Array.from(printWindow.document.images)
  if (images.length === 0) {
    setTimeout(triggerPrint, 120)
    return
  }

  let pendingImages = images.length
  const onImageReady = () => {
    pendingImages -= 1
    if (pendingImages <= 0) {
      setTimeout(triggerPrint, 120)
    }
  }

  images.forEach((img) => {
    if (img.complete) {
      onImageReady()
      return
    }

    img.addEventListener('load', onImageReady, { once: true })
    img.addEventListener('error', onImageReady, { once: true })
  })
}

function historyResultLabel(request: TabelaPrecoSolicitacao) {
  if (request.status === 'pendente') {
    return 'Pendente de atendimento no ERP.'
  }

  if (request.motivo_resolucao) return request.motivo_resolucao

  if (request.status === 'cancelada') {
    return 'Solicitacao cancelada pelo diretor.'
  }

  if (request.acao === 'adicionar_produto') {
    if (request.novo_preco !== null && request.novo_preco !== undefined) {
      return `Produto adicionado com preco ${formatCurrency(request.novo_preco)}.`
    }

    return 'Produto adicionado.'
  }

  if (request.acao === 'excluir') {
    return 'Produto excluido.'
  }

  return `Preco alterado de ${formatCurrency(request.preco_atual)} para ${formatCurrency(request.novo_preco)}.`
}

function formatStockQuantity(value: number | null) {
  if (value === null || Number.isNaN(value)) return '-'
  if (Number.isInteger(value)) return value.toString()

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

function parseDetailNumber(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

function extractStock(segment: string, local: 'ASSU' | 'DEPOSITO' | 'MOSSORO') {
  const match = segment.match(new RegExp(`ESTOQUE\\s+${local}\\s*=\\s*(-?\\d+(?:[\\.,]\\d+)?)`, 'i'))
  return parseDetailNumber(match?.[1] ?? null)
}

function parsedDetalhamento(raw: string | null | undefined): EstoqueDetalhe[] {
  if (!raw) return []

  const cacheKey = raw.trim()
  if (!cacheKey) return []

  const cached = detailCache.get(cacheKey)
  if (cached) return cached

  const compact = cacheKey
    .replace(/\r?\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const gradeSegments = compact.match(/\d+-\d+\s+.*?(?=(?:\s*\d+-\d+\s+)|$)/g) ?? []
  const segments = gradeSegments.length > 0 ? gradeSegments : [compact]

  const parsed = segments
    .map((segment, index) => {
      const clean = segment.trim()
      const labelBase = clean.replace(/\s*ESTOQUE\s+ASSU\s*=.*$/i, '').trim()
      const label = labelBase || (gradeSegments.length > 0 ? `Variacao ${index + 1}` : 'Saldo')
      const assu = extractStock(clean, 'ASSU')
      const deposito = extractStock(clean, 'DEPOSITO')
      const mossoro = extractStock(clean, 'MOSSORO')

      if (assu === null && deposito === null && mossoro === null) return null

      return {
        key: `${label}-${index}`,
        label,
        assu,
        deposito,
        mossoro
      }
    })
    .filter((entry): entry is EstoqueDetalhe => entry !== null)

  detailCache.set(cacheKey, parsed)
  return parsed
}
</script>

