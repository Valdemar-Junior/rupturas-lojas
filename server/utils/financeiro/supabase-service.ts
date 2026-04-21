import { createClient } from '@supabase/supabase-js'
import { createError } from 'h3'

export function getFinanceiroSupabaseServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_URL nao configurado para operacoes do financeiro.'
    })
  }

  if (!serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SUPABASE_SERVICE_ROLE_KEY nao configurado para operacoes do financeiro.'
    })
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}