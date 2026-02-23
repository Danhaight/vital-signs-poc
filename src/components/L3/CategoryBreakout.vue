<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide } from 'vue'
import type { ClientData, CategoryKey } from '../../data/types'
import { CATEGORY_MAP } from '../../data/types'
import SubComponentChart from './SubComponentChart.vue'
import CategoryNarrative from './CategoryNarrative.vue'
import PolicyCitations from './PolicyCitations.vue'
import { usePolicyFilters, POLICY_FILTERS_KEY } from '../../composables/usePolicyFilters'

const props = defineProps<{
  data: ClientData
  categoryKey: CategoryKey
}>()

// Provide shared policy filter state for chart ↔ citation list linking
if (props.categoryKey === 'policy') {
  provide(POLICY_FILTERS_KEY, usePolicyFilters(props.data.config.id))
}

const emit = defineEmits<{
  back: []
}>()

const cat = computed(() => CATEGORY_MAP[props.categoryKey])
const trend = computed(() => props.data.trends[props.categoryKey])
const latestValue = computed(() => {
  const last = props.data.years[props.data.years.length - 1]
  return last ? last[props.categoryKey] : 0
})

const trendIcon = computed(() => {
  if (trend.value === 'strengthening') return '↑'
  if (trend.value === 'weakening') return '↓'
  return '→'
})

const trendColor = computed(() => {
  if (trend.value === 'strengthening') return '#8DB580'
  if (trend.value === 'weakening') return '#C47070'
  return '#8a8d97'
})

// Escape key handler
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('back')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Category header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <span
          class="w-3 h-3 rounded-full"
          :style="{ backgroundColor: cat.color }"
        ></span>
        <h1
          class="text-2xl font-semibold tracking-tight"
          :style="{ color: cat.color }"
        >
          {{ cat.label }}
        </h1>
      </div>
      <p class="text-vs-muted text-sm">
        {{ data.config.name }} · {{ data.config.toolName }}
        · {{ (cat.weight * 100).toFixed(0) }}% of composite score
      </p>

      <!-- Current score badge -->
      <div class="flex items-center gap-3 mt-4">
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-mono font-semibold"
            :style="{ color: cat.color }"
          >
            {{ latestValue.toFixed(0) }}
          </span>
          <span class="text-vs-dim text-sm font-mono">/100</span>
        </div>
        <span
          class="text-sm font-mono font-medium"
          :style="{ color: trendColor }"
        >
          {{ trendIcon }} {{ trend }}
        </span>
      </div>
    </div>

    <!-- Sub-component chart -->
    <div class="bg-vs-surface border border-vs-border rounded-lg p-6 mb-8">
      <h3 class="text-sm font-semibold text-vs-muted uppercase tracking-wider font-mono mb-4">
        Sub-Component Decomposition
      </h3>
      <SubComponentChart
        :data="data"
        :category-key="categoryKey"
      />
    </div>

    <!-- Category narrative -->
    <div class="mb-8">
      <CategoryNarrative
        :data="data"
        :category-key="categoryKey"
      />
    </div>

    <!-- Policy citations (only for policy category) -->
    <div v-if="categoryKey === 'policy'" class="mb-8">
      <PolicyCitations />
    </div>

    <!-- Data sources -->
    <p class="text-vs-dim text-xs font-mono mt-8">
      Sources: {{ cat.sources.join(', ') }} · {{ data.config.yearRange[0] }}–{{ data.config.yearRange[1] }}
    </p>
  </div>
</template>
