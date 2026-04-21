import { getEmailConfigForUi } from '~~/server/utils/financeiro/report-email-settings'

export default defineEventHandler(async () => {
  const config = await getEmailConfigForUi()

  return {
    success: true,
    ...config
  }
})

