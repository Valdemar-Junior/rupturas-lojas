<template>
  <div class="flex flex-col min-h-screen bg-slate-50">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/LOGONEW .png" alt="Logotipo Lojão" class="h-12 w-auto" />
        </div>
        
        <div class="flex items-center gap-4 text-sm text-slate-500">
          <span>Depósito Central -> Filiais (Assú / Mossoró)</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>
