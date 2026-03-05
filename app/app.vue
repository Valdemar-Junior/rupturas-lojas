<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 font-sans">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  background-color: #f8fafc; /* Tailwind slate-50 */
}
</style>
