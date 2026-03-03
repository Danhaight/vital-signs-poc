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
const isSubmitting = ref(false)

async function hashString(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function submitPasscode() {
  isSubmitting.value = true
  const hash = await hashString(passcodeInput.value.trim().toLowerCase())
  if (hash === PASSCODE_HASH) {
    sessionStorage.setItem('vs-unlocked', '1')
    isUnlocked.value = true
    passcodeError.value = false
  } else {
    passcodeError.value = true
    passcodeInput.value = ''
  }
  isSubmitting.value = false
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
  <div v-if="!isUnlocked" class="min-h-screen bg-vs-bg flex items-center justify-center relative overflow-hidden">
    <!-- Ambient glow -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-vs-accent/[0.03] blur-[100px]"></div>
    </div>

    <form @submit.prevent="submitPasscode" class="text-center relative z-10">
      <div class="flex items-center justify-center gap-2 mb-10">
        <!-- Logo mark -->
        <div class="w-6 h-6 rounded-md bg-gradient-to-br from-vs-accent/80 to-vs-accent/40 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 10L4.5 5.5L7 7.5L10.5 2" stroke="#0b0d14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="text-vs-dim text-xs font-mono uppercase tracking-[0.18em]">Impact Tracker</span>
      </div>

      <div class="space-y-3">
        <input
          v-model="passcodeInput"
          type="password"
          placeholder="Enter passcode"
          autofocus
          class="bg-vs-surface border border-vs-border rounded-lg px-5 py-3 text-vs-text font-mono text-sm w-64 text-center
                 focus:outline-none focus:border-vs-accent/30 focus:shadow-[0_0_0_3px_rgba(217,174,94,0.08)]
                 transition-all duration-200 placeholder:text-vs-dim"
          :class="passcodeError ? 'border-trend-down/50 shadow-[0_0_0_3px_rgba(208,102,102,0.08)]' : ''"
        />
        <div v-if="passcodeError" class="text-trend-down text-xs font-mono animate-slide-up">
          Incorrect passcode
        </div>
      </div>

      <div class="mt-5">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="vs-btn px-6 py-2.5 bg-vs-surface border border-vs-border rounded-lg text-vs-muted text-sm
                 hover:text-vs-text hover:border-vs-dim/50 hover:bg-vs-surface-raised
                 disabled:opacity-50 transition-all duration-200"
        >
          {{ isSubmitting ? 'Verifying…' : 'Enter' }}
        </button>
      </div>
    </form>
  </div>

  <!-- App (only shown when unlocked) -->
  <div v-else class="min-h-screen text-vs-text font-sans">
    <!-- Fixed header -->
    <header class="sticky top-0 z-50 border-b border-vs-border/80"
            style="background: linear-gradient(to bottom, rgba(11, 13, 20, 0.95), rgba(11, 13, 20, 0.88)); backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3);">
      <div class="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between">
        <!-- Left: back button or client toggle -->
        <div class="flex items-center gap-4">
          <button
            v-if="selectedCategory"
            @click="backToOverview"
            class="vs-btn flex items-center gap-2 text-vs-muted hover:text-vs-text text-sm px-3 py-1.5 -ml-3 rounded-lg
                   hover:bg-vs-surface/80 transition-all duration-200 group"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5">
              <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Overview</span>
          </button>

          <!-- Segmented control for org selection -->
          <div v-else class="flex items-center bg-vs-surface/60 rounded-lg p-0.5 border border-vs-border/50">
            <button
              v-for="client in (['oi', 'ku'] as ClientId[])"
              :key="client"
              @click="switchClient(client)"
              class="relative px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
              :class="activeClient === client
                ? 'bg-vs-accent text-vs-bg shadow-sm'
                : 'text-vs-muted hover:text-vs-text'"
            >
              {{ client === 'oi' ? 'Org 1' : 'Org 2' }}
            </button>
          </div>
        </div>

        <!-- Right: brand -->
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-md bg-gradient-to-br from-vs-accent/60 to-vs-accent/25 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 10L4.5 5.5L7 7.5L10.5 2" stroke="#0b0d14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="text-vs-dim text-[11px] font-mono uppercase tracking-[0.12em]">Impact Tracker</span>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="px-8 py-10">
      <Transition name="fade" mode="out-in">
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
      </Transition>
    </main>
  </div>
</template>
