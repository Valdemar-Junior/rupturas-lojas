export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client || !to.path.startsWith('/financeiro')) {
    return
  }

  const { isUnlocked, syncFromSession } = useFinanceiroAccess()

  syncFromSession()

  if (!isUnlocked.value) {
    return navigateTo('/', { replace: true })
  }
})
