<script setup lang="ts">
import { CATEGORIES } from '../../data/types'
import type { ClientData, CategoryKey } from '../../data/types'
import CategoryPanel from './CategoryPanel.vue'

const props = defineProps<{
  data: ClientData
}>()

const emit = defineEmits<{
  selectCategory: [key: CategoryKey]
}>()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-vs-muted uppercase tracking-wider font-mono">
        Category Decomposition
      </h3>
      <!-- Shared time axis label -->
      <span class="text-[10px] font-mono text-vs-dim">
        {{ data.config.yearRange[0] }}–{{ data.config.yearRange[1] }} · 0–100 scale
      </span>
    </div>

    <div class="grid grid-cols-5 gap-3">
      <CategoryPanel
        v-for="cat in CATEGORIES"
        :key="cat.key"
        :category-key="cat.key"
        :years="data.years"
        :config="data.config"
        :trend="data.trends[cat.key]"
        @select="(key) => emit('selectCategory', key)"
      />
    </div>
  </div>
</template>
