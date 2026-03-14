<template>
  <div class="min-h-screen text-slate-900">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

:root {
  font-family: 'Sora', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
  margin: 0;
  padding: 0;
  background-color: #f1f5f9;
  color: #0f172a;
}

.print-only {
  display: none;
}

@media print {
  @page {
    size: A4 landscape;
    margin: 8mm;
  }

  body {
    background: #ffffff !important;
    color: #111827 !important;
  }

  .print-hide {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  main {
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .print-report-root .grid {
    display: block !important;
  }

  .print-report-root .rounded-3xl,
  .print-report-root .rounded-2xl,
  .print-report-root .rounded-xl {
    border-radius: 0 !important;
  }

  .print-overflow-reset {
    overflow: visible !important;
  }

  .print-report-table {
    width: 100% !important;
    min-width: 0 !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
  }

  .print-report-table thead {
    display: table-header-group;
  }

  .print-report-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .print-report-table th,
  .print-report-table td {
    padding: 4px 6px !important;
    font-size: 10px !important;
    line-height: 1.25 !important;
    vertical-align: top !important;
    word-break: break-word !important;
  }

  .print-report-table svg {
    display: none !important;
  }
}
</style>
