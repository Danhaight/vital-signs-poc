<script setup lang="ts">
import { CATEGORIES } from '../../data/types'
import type { CategoryKey, TrendDirection } from '../../data/types'

const props = defineProps<{
  trends: Record<CategoryKey | 'composite', TrendDirection>
}>()

const emit = defineEmits<{
  selectCategory: [key: CategoryKey]
}>()

const trendIcon = (dir: TrendDirection) => {
  if (dir === 'strengthening') return '↑'
  if (dir === 'weakening') return '↓'
  return '→'
}

const trendColorClass = (dir: TrendDirection) => {
  if (dir === 'strengthening') return 'text-[#8DB580]'
  if (dir === 'weakening') return 'text-[#C47070]'
  return 'text-vs-muted'
}
</script>

<template>
  <div class="flex items-center gap-3 flex-wrap">
    <button
      v-for="cat in CATEGORIES"
      :key="cat.key"
      @click="emit('selectCategory', cat.key)"
      class="flex items-center gap-2 px-3 py-2 rounded-md bg-vs-surface border border-vs-border
             hover:border-vs-muted/50 transition-colors cursor-pointer group"
    >
      <span
        class="w-2 h-2 rounded-full"
        :style="{ backgroundColor: cat.color }"
      ></span>
      <span class="text-xs text-vs-muted group-hover:text-vs-text transition-colors">
        {{ cat.label }}
      </span>
      <span
        class="font-mono text-xs font-medium"
        :class="trendColorClass(trends[cat.key])"
      >
        {{ trendIcon(trends[cat.key]) }}
      </span>
    </button>
  </div>
</template>
