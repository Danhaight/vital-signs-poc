<script setup lang="ts">
import type { ClientData, CategoryKey } from '../../data/types'
import CompositeTrajectory from './CompositeTrajectory.vue'
import CategorySmallMultiples from './CategorySmallMultiples.vue'
import NarrativeBlock from './NarrativeBlock.vue'

const props = defineProps<{
  data: ClientData
}>()

const emit = defineEmits<{
  selectCategory: [key: CategoryKey]
}>()
</script>

<template>
  <div class="max-w-6xl mx-auto animate-slide-up">
    <!-- Client identity -->
    <div class="mb-8">
      <h1 class="text-[28px] font-semibold tracking-tight">{{ data.config.id === 'oi' ? 'Org 1' : 'Org 2' }}</h1>
      <p class="text-vs-muted text-sm mt-1.5">
        Launched {{ data.config.launchYear }} · Composite analysis across 5 dimensions
      </p>
    </div>

    <!-- Hero card: chart + narrative as a single visual unit -->
    <div class="vs-glass-raised rounded-xl p-7 mb-8">
      <CompositeTrajectory :data="data" />

      <!-- Narrative inside the hero card, separated by thin border -->
      <div class="border-t border-vs-border/30 mt-6 pt-6">
        <NarrativeBlock :data="data" />
      </div>
    </div>

    <!-- Section label for small multiples -->
    <div class="flex items-center gap-3 mb-4">
      <h2 class="text-xs font-semibold text-vs-muted uppercase tracking-[0.12em]">
        Category Breakdown
      </h2>
      <div class="flex-1 h-px bg-vs-border/30"></div>
      <span class="text-[10px] text-vs-dim">Click to explore</span>
    </div>

    <!-- Small multiples -->
    <div class="mb-10">
      <CategorySmallMultiples
        :data="data"
        @select-category="(key) => emit('selectCategory', key)"
      />
    </div>

    <!-- Footer -->
    <div class="border-t border-vs-border/40 pt-5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-gradient-to-br from-vs-accent/40 to-vs-accent/15 flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 10L4.5 5.5L7 7.5L10.5 2" stroke="#0b0d14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="text-vs-dim text-[11px] font-mono">
          Impact Tracker · Darkhorse · 2026
        </span>
      </div>
      <span class="text-vs-dim text-[11px] font-mono">
        Launched {{ data.config.launchYear }} · Data through {{ data.config.yearRange[1] }}
      </span>
    </div>
  </div>
</template>
