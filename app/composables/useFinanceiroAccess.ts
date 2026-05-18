const FINANCEIRO_ACCESS_KEY = 'financeiro-admin-unlocked'
const FINANCEIRO_ADMIN_PASSWORD = '6163'

export function useFinanceiroAccess() {
  const isUnlocked = useState<boolean>('financeiro-admin-unlocked', () => false)

  function syncFromSession() {
    if (!import.meta.client) {
      return
    }

    isUnlocked.value = window.sessionStorage.getItem(FINANCEIRO_ACCESS_KEY) === 'true'
  }

  function persistAccess(unlocked: boolean) {
    isUnlocked.value = unlocked

    if (!import.meta.client) {
      return
    }

    if (unlocked) {
      window.sessionStorage.setItem(FINANCEIRO_ACCESS_KEY, 'true')
      return
    }

    window.sessionStorage.removeItem(FINANCEIRO_ACCESS_KEY)
  }

  function unlockWithPassword(password: string) {
    const normalizedPassword = password.trim()
    const matches = normalizedPassword === FINANCEIRO_ADMIN_PASSWORD

    if (matches) {
      persistAccess(true)
    }

    return matches
  }

  return {
    isUnlocked,
    syncFromSession,
    persistAccess,
    unlockWithPassword
  }
}
