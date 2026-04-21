import { readBody } from 'h3'
import type { EmailConfigFormInput } from '~~/server/utils/financeiro/report-email-settings'
import { saveEmailConfig } from '~~/server/utils/financeiro/report-email-settings'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as EmailConfigFormInput | null
  const result = await saveEmailConfig(body || {})

  return {
    success: true,
    message: 'Configuracao de e-mail salva com sucesso.',
    ...result
  }
})

