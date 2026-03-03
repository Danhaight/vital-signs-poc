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
  <div class="max-w-6xl mx-auto">
    <!-- Client identity (anonymized for external sharing) -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight">{{ data.config.id === 'oi' ? 'Org 1' : 'Org 2' }}</h1>
      <p class="text-vs-muted text-sm mt-1">
        Launched {{ data.config.launchYear }}
      </p>
    </div>

    <!-- Hero card: chart + narrative as a single visual unit -->
    <div class="bg-vs-surface border border-vs-border rounded-lg p-6 mb-6">
      <CompositeTrajectory :data="data" />

      <!-- Narrative inside the hero card, separated by thin border -->
      <div class="border-t border-vs-border/50 mt-5 pt-5">
        <NarrativeBlock :data="data" />
      </div>
    </div>

    <!-- Small multiples -->
    <div class="mb-8">
      <CategorySmallMultiples
        :data="data"
        @select-category="(key) => emit('selectCategory', key)"
      />
    </div>

    <!-- Footer -->
    <div class="border-t border-vs-border mt-8 pt-4 flex items-center justify-between">
      <span class="text-vs-dim text-xs font-mono">
        Source: Vital Signs Framework · Darkhorse · 2026
      </span>
      <span class="text-vs-dim text-xs font-mono">
        Launched {{ data.config.launchYear }} · Data through {{ data.config.yearRange[1] }}
      </span>
    </div>
  </div>
</template>
