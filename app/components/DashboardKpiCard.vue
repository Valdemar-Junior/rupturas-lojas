<template>
  <div :class="[
    'rounded-3xl border p-5 sm:p-6 flex flex-col justify-between min-h-[152px] overflow-hidden relative',
    color === 'cyan' ? 'border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white' : '',
    color === 'red' ? 'border-red-200 bg-gradient-to-br from-red-50 via-white to-white' : '',
    color === 'amber' ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white' : '',
    color === 'slate' ? 'border-slate-200 bg-gradient-to-br from-slate-100 via-white to-white' : ''
  ]">
    <div class="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/50 blur-xl"></div>

    <div class="flex items-start justify-between relative">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-slate-500 mb-1">{{ title }}</p>
        <div v-if="loading" class="h-10 w-24 bg-slate-200 animate-pulse rounded"></div>
        <h3 v-else class="text-3xl font-extrabold text-slate-900 tracking-tight">{{ value }}</h3>
      </div>
      
      <div :class="[
        'p-3 rounded-xl ring-1 ring-inset',
        color === 'cyan' ? 'bg-cyan-100/70 text-cyan-700 ring-cyan-300' : '',
        color === 'red' ? 'bg-red-100/70 text-red-700 ring-red-300' : '',
        color === 'amber' ? 'bg-amber-100/70 text-amber-700 ring-amber-300' : '',
        color === 'slate' ? 'bg-slate-200/70 text-slate-700 ring-slate-300' : ''
      ]">
        <svg v-if="icon === 'alert-circle'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <svg v-else-if="icon === 'alert-triangle'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <svg v-else-if="icon === 'info'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <svg v-else-if="icon === 'clock'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t border-slate-100 relative">
      <p class="text-sm text-slate-500">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: number | string
  description: string
  icon: 'alert-circle' | 'alert-triangle' | 'info' | 'clock'
  color: 'cyan' | 'red' | 'amber' | 'slate'
  loading?: boolean
}>()
</script>
