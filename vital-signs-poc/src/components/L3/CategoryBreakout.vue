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

const trendColor = computed(() => {
  if (trend.value === 'strengthening') return '#7DBF6C'
  if (trend.value === 'weakening') return '#D06666'
  return '#8b8e99'
})

// Escape key handler
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('back')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="max-w-6xl mx-auto animate-slide-up">
    <!-- Category header -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-2">
        <div
          class="w-3 h-3 rounded-full"
          :style="{ backgroundColor: cat.color, boxShadow: `0 0 10px ${cat.color}40` }"
        ></div>
        <h1
          class="text-[26px] font-semibold tracking-tight"
          :style="{ color: cat.color }"
        >
          {{ cat.label }}
        </h1>
      </div>
      <p class="text-vs-muted text-sm">
        {{ data.config.id === 'oi' ? 'Org 1' : 'Org 2' }}
        · {{ (cat.weight * 100).toFixed(0) }}% of composite score
      </p>

      <!-- Current score badge -->
      <div class="flex items-center gap-4 mt-5">
        <div class="flex items-baseline gap-1.5">
          <span
            class="text-[36px] font-mono font-bold tracking-tight leading-none"
            :style="{ color: cat.color }"
          >
            {{ latestValue.toFixed(0) }}
          </span>
          <span class="text-vs-dim/60 text-sm font-mono">/100</span>
        </div>
        <div class="h-6 w-px bg-vs-border/40"></div>
        <span
          class="text-sm font-mono font-semibold flex items-center gap-1.5"
          :style="{ color: trendColor }"
        >
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
            <path
              v-if="trend === 'strengthening'"
              d="M5 2L8 6H2L5 2Z"
              fill="currentColor"
            />
            <path
              v-else-if="trend === 'weakening'"
              d="M5 8L2 4H8L5 8Z"
              fill="currentColor"
            />
            <path
              v-else
              d="M2 5H7M7 5L5 3M7 5L5 7"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ trend }}
        </span>
      </div>
    </div>

    <!-- Chart + Narrative side-by-side -->
    <div class="vs-glass-raised rounded-xl p-7 mb-8">
      <div class="flex gap-8">
        <!-- Chart: takes ~67% -->
        <div class="flex-[4] min-w-0">
          <h3 class="text-xs font-semibold text-vs-muted uppercase tracking-[0.12em] mb-4">
            Sub-Component Decomposition
          </h3>
          <SubComponentChart
            :data="data"
            :category-key="categoryKey"
          />
        </div>

        <!-- Narrative: takes ~33% -->
        <div class="flex-[2] min-w-0 flex flex-col justify-between border-l border-vs-border/30 pl-7">
          <CategoryNarrative
            :data="data"
            :category-key="categoryKey"
          />
          <p class="text-vs-dim text-[10px] font-mono mt-5 pt-4 border-t border-vs-border/20">
            Sources: {{ cat.sources.join(', ') }} · {{ data.config.yearRange[0] }}–{{ data.config.yearRange[1] }}
          </p>
        </div>
      </div>
    </div>

    <!-- Policy citations (only for policy category) -->
    <div v-if="categoryKey === 'policy'" class="mb-8">
      <PolicyCitations />
    </div>
  </div>
</template>
