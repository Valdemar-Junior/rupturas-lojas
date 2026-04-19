<template>
  <article
    :class="[
      'rounded-2xl border p-4 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.45)]',
      toneClass
    ]"
  >
    <p class="text-[11px] uppercase tracking-[0.16em] text-slate-500">{{ title }}</p>
    <p class="mt-2 text-base font-semibold tracking-tight text-slate-900">{{ value }}</p>
    <p class="mt-1 text-xs text-slate-600">{{ description }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  value: string
  description: string
  tone?: 'green' | 'amber' | 'red' | 'cyan' | 'slate'
}>()

const toneClass = computed(() => {
  if (props.tone === 'green') return 'border-emerald-200 bg-emerald-50/70'
  if (props.tone === 'amber') return 'border-amber-200 bg-amber-50/70'
  if (props.tone === 'red') return 'border-rose-200 bg-rose-50/70'
  if (props.tone === 'cyan') return 'border-cyan-200 bg-cyan-50/70'
  return 'border-slate-200 bg-white'
})
</script>
