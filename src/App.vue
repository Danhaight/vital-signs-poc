<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { computeClientData } from './data/computation'
import type { ClientId, CategoryKey } from './data/types'
import ToolView from './components/L2/ToolView.vue'
import CategoryBreakout from './components/L3/CategoryBreakout.vue'

// ── State ──
const activeClient = ref<ClientId>('oi')
const selectedCategory = ref<CategoryKey | null>(null)

// ── Derived data ──
const clientData = computed(() => computeClientData(activeClient.value))

// ── Handlers ──
function switchClient(id: ClientId) {
  activeClient.value = id
  selectedCategory.value = null
}

function selectCategory(key: CategoryKey) {
  selectedCategory.value = key
  nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

function backToOverview() {
  selectedCategory.value = null
  nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}
</script>

<template>
  <div class="min-h-screen bg-vs-bg text-vs-text font-sans">
    <!-- Fixed header -->
    <header class="sticky top-0 z-50 bg-vs-bg/90 backdrop-blur-sm border-b border-vs-border">
      <div class="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between">
        <!-- Left: back button or client toggle -->
        <div class="flex items-center gap-4">
          <button
            v-if="selectedCategory"
            @click="backToOverview"
            class="flex items-center gap-1.5 text-vs-muted hover:text-vs-text text-sm transition-colors"
          >
            <span class="text-lg leading-none">←</span>
            <span>Back to Overview</span>
          </button>
          <div v-else class="flex gap-2">
            <button
              v-for="client in (['oi', 'ku'] as ClientId[])"
              :key="client"
              @click="switchClient(client)"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="activeClient === client
                ? 'bg-vs-accent text-vs-bg'
                : 'bg-vs-surface text-vs-muted border border-vs-border hover:text-vs-text'"
            >
              {{ client === 'oi' ? 'Opportunity Insights' : 'KU — The Care Board' }}
            </button>
          </div>
        </div>

        <!-- Right: brand -->
        <div class="text-vs-dim text-xs font-mono uppercase tracking-widest">
          Vital Signs
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="px-8 py-10">
      <!-- L2: Tool Overview -->
      <ToolView
        v-if="!selectedCategory"
        :key="'l2-' + activeClient"
        :data="clientData"
        @select-category="selectCategory"
      />

      <!-- L3: Category Breakout -->
      <CategoryBreakout
        v-else
        :key="'l3-' + activeClient + '-' + selectedCategory"
        :data="clientData"
        :category-key="selectedCategory!"
        @back="backToOverview"
      />
    </main>
  </div>
</template>
