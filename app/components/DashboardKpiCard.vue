<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 mb-1">{{ title }}</p>
        <div v-if="loading" class="h-10 w-24 bg-slate-200 animate-pulse rounded"></div>
        <h3 v-else class="text-3xl font-bold text-slate-800">{{ value }}</h3>
      </div>
      
      <div :class="[
        'p-3 rounded-lg',
        color === 'blue' ? 'bg-blue-50 text-blue-600' : '',
        color === 'red' ? 'bg-red-50 text-red-600' : '',
        color === 'amber' ? 'bg-amber-50 text-amber-600' : ''
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
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t border-slate-100">
      <p class="text-sm text-slate-500">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  value: number
  description: string
  icon: 'alert-circle' | 'alert-triangle' | 'info'
  color: 'blue' | 'red' | 'amber'
  loading?: boolean
}>()
</script>
