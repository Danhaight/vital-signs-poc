<script setup lang="ts">
import type { ClientData, CategoryKey } from '../../data/types'
import CompositeTrajectory from './CompositeTrajectory.vue'
import StatusIndicators from './StatusIndicators.vue'
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
    <!-- Client identity -->
    <div class="mb-10">
      <h1 class="text-2xl font-semibold tracking-tight">{{ data.config.name }}</h1>
      <p class="text-vs-muted text-sm mt-1">
        {{ data.config.toolName }} · Launched {{ data.config.launchYear }}
      </p>
    </div>

    <!-- Hero chart -->
    <div class="bg-vs-surface border border-vs-border rounded-lg p-6 mb-6">
      <CompositeTrajectory :data="data" />
    </div>

    <!-- Status indicators -->
    <div class="mb-6">
      <StatusIndicators
        :trends="data.trends"
        @select-category="(key) => emit('selectCategory', key)"
      />
    </div>

    <!-- Small multiples -->
    <div class="mb-8">
      <CategorySmallMultiples
        :data="data"
        @select-category="(key) => emit('selectCategory', key)"
      />
    </div>

    <!-- Narrative -->
    <div class="mb-10 mt-10">
      <NarrativeBlock :data="data" />
    </div>

    <!-- Source attribution -->
    <p class="text-vs-dim text-xs mt-10 font-mono">
      Source: Vital Signs Framework · Darkhorse · 2026
    </p>
  </div>
</template>
