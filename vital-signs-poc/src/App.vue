<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { computeClientData } from './data/computation'
import type { ClientId, CategoryKey } from './data/types'
import ToolView from './components/L2/ToolView.vue'
import CategoryBreakout from './components/L3/CategoryBreakout.vue'

// ── Passcode gate ──
// SHA-256 hash of the passcode (so it's not in plaintext in source)
const PASSCODE_HASH = '7d4e62e50f7ea725d84040511f62c9b57cd5d74a6eb9bd9eab04a2873deae388'
const isUnlocked = ref(sessionStorage.getItem('vs-unlocked') === '1')
const passcodeInput = ref('')
const passcodeError = ref(false)

async function hashString(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function submitPasscode() {
  const hash = await hashString(passcodeInput.value.trim().toLowerCase())
  if (hash === PASSCODE_HASH) {
    sessionStorage.setItem('vs-unlocked', '1')
    isUnlocked.value = true
    passcodeError.value = false
  } else {
    passcodeError.value = true
    passcodeInput.value = ''
  }
}

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
  <!-- Passcode gate -->
  <div v-if="!isUnlocked" class="min-h-screen bg-vs-bg flex items-center justify-center">
    <form @submit.prevent="submitPasscode" class="text-center">
      <div class="text-vs-dim text-xs font-mono uppercase tracking-widest mb-8">Vital Signs</div>
      <input
        v-model="passcodeInput"
        type="password"
        placeholder="Enter passcode"
        autofocus
        class="bg-vs-surface border border-vs-border rounded px-4 py-2.5 text-vs-text font-mono text-sm w-56 text-center focus:outline-none focus:border-vs-muted transition-colors"
        :class="passcodeError ? 'border-trend-down' : ''"
      />
      <div v-if="passcodeError" class="text-trend-down text-xs font-mono mt-2">Incorrect passcode</div>
      <div class="mt-4">
        <button type="submit" class="px-5 py-2 bg-vs-surface border border-vs-border rounded text-vs-muted text-sm font-mono hover:text-vs-text hover:border-vs-muted transition-colors">
          Enter
        </button>
      </div>
    </form>
  </div>

  <!-- App (only shown when unlocked) -->
  <div v-else class="min-h-screen bg-vs-bg text-vs-text font-sans">
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
              {{ client === 'oi' ? 'Org 1' : 'Org 2' }}
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
