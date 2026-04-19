<template>
  <article
    :class="[
      'relative overflow-hidden rounded-2xl border bg-white/90 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl',
      toneClass
    ]"
  >
    <div class="absolute -right-9 -top-10 h-24 w-24 rounded-full bg-white/55 blur-xl"></div>
    <div class="relative flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] uppercase tracking-[0.16em] text-slate-500">{{ title }}</p>
        <p v-if="loading" class="mt-2 h-8 w-28 animate-pulse rounded-lg bg-slate-200"></p>
        <p v-else class="mt-2 truncate text-2xl font-extrabold tracking-tight text-slate-900">{{ value }}</p>
      </div>
      <div :class="['rounded-xl p-2.5 ring-1 ring-inset', iconClass]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPath" />
        </svg>
      </div>
    </div>
    <p class="relative mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">{{ description }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  value: string
  description: string
  tone?: 'green' | 'amber' | 'red' | 'cyan' | 'slate'
  icon?: 'money' | 'clock' | 'list' | 'chart'
  loading?: boolean
}>()

const toneClass = computed(() => {
  if (props.tone === 'green') return 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white'
  if (props.tone === 'amber') return 'border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-white'
  if (props.tone === 'red') return 'border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-white'
  if (props.tone === 'cyan') return 'border-cyan-200 bg-gradient-to-br from-cyan-50/80 via-white to-white'
  return 'border-slate-200 bg-gradient-to-br from-slate-100/80 via-white to-white'
})

const iconClass = computed(() => {
  if (props.tone === 'green') return 'bg-emerald-100 text-emerald-700 ring-emerald-300'
  if (props.tone === 'amber') return 'bg-amber-100 text-amber-700 ring-amber-300'
  if (props.tone === 'red') return 'bg-rose-100 text-rose-700 ring-rose-300'
  if (props.tone === 'cyan') return 'bg-cyan-100 text-cyan-700 ring-cyan-300'
  return 'bg-slate-200 text-slate-700 ring-slate-300'
})

const iconPath = computed(() => {
  if (props.icon === 'money') {
    return 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m-7-3a2 2 0 100-4 2 2 0 000 4zm8 6h2a1 1 0 001-1V8a1 1 0 00-1-1h-2v10z'
  }
  if (props.icon === 'clock') {
    return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
  }
  if (props.icon === 'chart') {
    return 'M11 3v18m-6-6v6m12-12v12m6-9v9M4 21h16'
  }
  return 'M9 5H7a2 2 0 00-2 2v2m0 6v2a2 2 0 002 2h2m6 0h2a2 2 0 002-2v-2m0-6V7a2 2 0 00-2-2h-2M9 12h6'
})
</script>
