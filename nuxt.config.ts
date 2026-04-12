// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/supabase', '@nuxtjs/tailwindcss'],
  runtimeConfig: {
    n8nBuscarProdutoWebhook: process.env.N8N_BUSCAR_PRODUTO_WEBHOOK || 'https://n8n.lojaodosmoveis.shop/webhook/buscar_produto'
  },
  supabase: {
    redirect: false
  }
})
