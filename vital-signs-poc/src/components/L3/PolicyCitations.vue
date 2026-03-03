<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue'
import type { PolicyCitation } from '../../data/types'
import { POLICY_FILTERS_KEY } from '../../composables/usePolicyFilters'

// Inject shared filter state from CategoryBreakout via usePolicyFilters composable
const pf = inject(POLICY_FILTERS_KEY)!

const {
  allCitations,
  loading,
  filtered,
  searchQuery,
  filterYear,
  filterCore,
  filterOrgTier,
  availableYears,
  hasActiveFilter,
  clearFilters: composableClearFilters,
} = pf

// ─── Local display state ───

const showCount = ref(25)

// Reset showCount when any filter changes
watch(
  [filterOrgTier, filterCore, filterYear, searchQuery],
  () => { showCount.value = 25 },
)

// Visible subset
const visible = computed(() => filtered.value.slice(0, showCount.value))

// Group by year
const groupedByYear = computed(() => {
  const groups = new Map<number, PolicyCitation[]>()
  for (const c of visible.value) {
    const yr = c.policyDocYear || 0
    if (!groups.has(yr)) groups.set(yr, [])
    groups.get(yr)!.push(c)
  }
  return Array.from(groups.entries()).sort((a, b) => b[0] - a[0])
})

// Stats (computed from the shared allCitations)
const GOV_ORG_TYPES = new Set(['Government', 'Legislative Body', 'Judicial Body'])
const LEGISLATIVE_ORG_TYPES = new Set(['Legislative Body', 'Judicial Body'])
const govCount = computed(() => allCitations.value.filter(c => GOV_ORG_TYPES.has(c.orgType)).length)
const legislativeCount = computed(() => allCitations.value.filter(c => LEGISLATIVE_ORG_TYPES.has(c.orgType)).length)
const uniqueOrgs = computed(() => new Set(allCitations.value.map(c => c.citingOrg)).size)

function showMore() {
  showCount.value += 50
}

function clearFilters() {
  composableClearFilters()
  showCount.value = 25
}

// Left-border accent color based on org tier
function citationAccentColor(cit: PolicyCitation): string {
  if (LEGISLATIVE_ORG_TYPES.has(cit.orgType)) return '#E8C547'
  if (cit.orgType === 'Government') return '#D4A85C'
  return '#4d5162'
}
</script>

<template>
  <div>
    <h3 class="text-xs font-semibold text-vs-muted uppercase tracking-[0.12em] mb-5">
      Policy Citations
    </h3>

    <div v-if="loading" class="text-vs-muted text-sm py-12 text-center">
      <div class="inline-flex items-center gap-2">
        <svg class="animate-spin w-4 h-4 text-vs-dim" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" opacity="0.2" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        <span>Loading citations…</span>
      </div>
    </div>

    <div v-else-if="allCitations.length === 0" class="text-vs-muted text-sm py-12 text-center">
      No citation data available.
    </div>

    <template v-else>
      <!-- Stats bar -->
      <div class="vs-glass rounded-xl px-5 py-3.5 mb-5">
        <div class="flex items-center gap-5 text-xs flex-wrap">
          <div class="flex items-center gap-2">
            <span class="text-vs-dim">Total</span>
            <span class="font-mono font-semibold text-vs-text tabular-nums">{{ allCitations.length.toLocaleString() }}</span>
          </div>
          <div class="w-px h-3.5 bg-vs-border/40"></div>
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-[#E8C547]"></span>
            <span class="text-vs-dim">Legislative</span>
            <span class="font-mono font-semibold text-vs-text tabular-nums">{{ legislativeCount.toLocaleString() }}</span>
          </div>
          <div class="w-px h-3.5 bg-vs-border/40"></div>
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-[#D4A85C]"></span>
            <span class="text-vs-dim">Government</span>
            <span class="font-mono font-semibold text-vs-text tabular-nums">{{ govCount.toLocaleString() }}</span>
          </div>
          <div class="w-px h-3.5 bg-vs-border/40"></div>
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-[#4d5162]"></span>
            <span class="text-vs-dim">Think Tanks/IGOs</span>
            <span class="font-mono font-semibold text-vs-text tabular-nums">{{ (allCitations.length - govCount).toLocaleString() }}</span>
          </div>
          <div class="w-px h-3.5 bg-vs-border/40"></div>
          <div class="flex items-center gap-2">
            <span class="text-vs-dim">Orgs</span>
            <span class="font-mono font-semibold text-vs-text tabular-nums">{{ uniqueOrgs }}</span>
          </div>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="vs-glass rounded-xl px-5 py-3.5 mb-6">
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Search -->
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vs-dim pointer-events-none" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M11.5 11.5L14.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search titles, orgs, countries…"
              class="bg-vs-bg/60 border border-vs-border/60 rounded-lg pl-9 pr-3 py-1.5 text-sm text-vs-text
                     placeholder:text-vs-dim/60 focus:outline-none focus:border-vs-muted/50 focus:bg-vs-bg
                     w-64 font-mono transition-colors"
            />
          </div>

          <!-- Year filter -->
          <select
            v-model="filterYear"
            class="bg-vs-bg/60 border border-vs-border/60 rounded-lg px-3 py-1.5 text-sm text-vs-text
                   focus:outline-none focus:border-vs-muted/50 focus:bg-vs-bg font-mono transition-colors
                   cursor-pointer"
          >
            <option :value="null">All years</option>
            <option v-for="yr in availableYears" :key="yr" :value="yr">{{ yr }}</option>
          </select>

          <!-- Divider -->
          <div class="w-px h-6 bg-vs-border/30"></div>

          <!-- Org tier toggle -->
          <div class="flex gap-1.5">
            <button
              @click="filterOrgTier = filterOrgTier === 'legislative' ? null : 'legislative'"
              class="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200"
              :class="filterOrgTier === 'legislative'
                ? 'bg-[#E8C547]/15 text-[#E8C547] border border-[#E8C547]/25 shadow-[0_0_8px_-2px_rgba(232,197,71,0.15)]'
                : 'bg-transparent text-vs-dim border border-vs-border/40 hover:text-vs-muted hover:border-vs-border/60'"
            >
              Legislative
            </button>
            <button
              @click="filterOrgTier = filterOrgTier === 'gov' ? null : 'gov'"
              class="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200"
              :class="filterOrgTier === 'gov'
                ? 'bg-[#D4A85C]/15 text-[#D4A85C] border border-[#D4A85C]/25 shadow-[0_0_8px_-2px_rgba(212,168,92,0.15)]'
                : 'bg-transparent text-vs-dim border border-vs-border/40 hover:text-vs-muted hover:border-vs-border/60'"
            >
              Government
            </button>
            <button
              @click="filterOrgTier = filterOrgTier === 'ngo' ? null : 'ngo'"
              class="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200"
              :class="filterOrgTier === 'ngo'
                ? 'bg-[#9A7830]/15 text-[#9A7830] border border-[#9A7830]/25 shadow-[0_0_8px_-2px_rgba(154,120,48,0.15)]'
                : 'bg-transparent text-vs-dim border border-vs-border/40 hover:text-vs-muted hover:border-vs-border/60'"
            >
              Think Tanks / IGOs
            </button>
          </div>

          <!-- Divider -->
          <div class="w-px h-6 bg-vs-border/30"></div>

          <!-- Core toggle -->
          <div class="flex gap-1.5">
            <button
              @click="filterCore = filterCore === true ? null : true"
              class="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200"
              :class="filterCore === true
                ? 'bg-[#D4A85C]/15 text-[#D4A85C] border border-[#D4A85C]/25 shadow-[0_0_8px_-2px_rgba(212,168,92,0.15)]'
                : 'bg-transparent text-vs-dim border border-vs-border/40 hover:text-vs-muted hover:border-vs-border/60'"
            >
              Core
            </button>
            <button
              @click="filterCore = filterCore === false ? null : false"
              class="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200"
              :class="filterCore === false
                ? 'bg-vs-muted/15 text-vs-muted border border-vs-muted/25'
                : 'bg-transparent text-vs-dim border border-vs-border/40 hover:text-vs-muted hover:border-vs-border/60'"
            >
              Other
            </button>
          </div>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- Result count -->
          <span class="text-[11px] font-mono text-vs-dim tabular-nums">
            {{ filtered.length.toLocaleString() }} matching
          </span>

          <!-- Clear -->
          <button
            v-if="hasActiveFilter"
            @click="clearFilters"
            class="text-[11px] text-vs-muted hover:text-vs-text transition-colors flex items-center gap-1 group"
          >
            <svg class="w-3 h-3 group-hover:rotate-90 transition-transform duration-200" viewBox="0 0 12 12" fill="none">
              <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Clear
          </button>
        </div>
      </div>

      <!-- Citation list grouped by year -->
      <div class="space-y-6">
        <div
          v-for="[year, citations] in groupedByYear"
          :key="year"
        >
          <!-- Year header -->
          <div class="flex items-center gap-3 mb-3">
            <span class="text-sm font-mono font-semibold text-vs-text">
              {{ year || 'Unknown Year' }}
            </span>
            <span class="text-[11px] font-mono text-vs-dim tabular-nums">
              {{ citations.length }} citation{{ citations.length !== 1 ? 's' : '' }}
            </span>
            <div class="flex-1 h-px bg-vs-border/20"></div>
          </div>

          <!-- Citations -->
          <div class="space-y-1.5">
            <div
              v-for="(cit, idx) in citations"
              :key="idx"
              class="rounded-lg px-4 py-3 border-l-2
                     hover:bg-vs-surface transition-all duration-200 group"
              :style="{ borderLeftColor: citationAccentColor(cit) }"
              :class="cit.coreTopic
                ? 'bg-vs-surface/80 border border-vs-border/40 border-l-2'
                : 'bg-vs-surface/30 border border-vs-border/20 border-l-2'"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <!-- Policy doc title -->
                  <div class="flex items-center gap-2">
                    <span
                      v-if="cit.coreTopic"
                      class="shrink-0 w-1.5 h-1.5 rounded-full bg-[#D4A85C]"
                      title="Core topic"
                    ></span>
                    <span
                      v-else
                      class="shrink-0 w-1.5 h-1.5 rounded-full bg-vs-dim/40"
                      title="Other topic"
                    ></span>
                    <a
                      v-if="cit.url"
                      :href="cit.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm text-vs-text group-hover:text-[#D4A85C] transition-colors truncate"
                    >
                      {{ cit.policyDocTitle || 'Untitled' }}
                      <svg class="inline-block w-2.5 h-2.5 ml-1 opacity-40 group-hover:opacity-70 transition-opacity -translate-y-px" viewBox="0 0 10 10" fill="none">
                        <path d="M3 1H9V7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 1L1 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                      </svg>
                    </a>
                    <span v-else class="text-sm text-vs-text truncate">
                      {{ cit.policyDocTitle || 'Untitled' }}
                    </span>
                  </div>

                  <!-- Meta line -->
                  <div class="text-[11px] font-mono text-vs-dim mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span class="text-vs-muted">{{ cit.citingOrg }}</span>
                    <span v-if="cit.country" class="text-vs-dim/50">·</span>
                    <span v-if="cit.country">{{ cit.country }}</span>
                    <span v-if="cit.orgType" class="text-vs-dim/50">·</span>
                    <span v-if="cit.orgType">{{ cit.orgType }}</span>
                    <span v-if="cit.policyDocType" class="text-vs-dim/50">·</span>
                    <span v-if="cit.policyDocType">{{ cit.policyDocType }}</span>
                  </div>

                  <!-- Cited paper -->
                  <div class="text-[10px] text-vs-dim/60 mt-1.5">
                    Cites: {{ cit.citedPaperTitle || 'Unknown paper' }}
                    <span v-if="cit.citedPaperYear" class="text-vs-dim/40"> ({{ cit.citedPaperYear }})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Show more -->
      <div
        v-if="visible.length < filtered.length"
        class="text-center mt-8"
      >
        <button
          @click="showMore"
          class="px-5 py-2 text-sm text-vs-muted border border-vs-border/50 rounded-lg
                 hover:text-vs-text hover:border-vs-muted/40 hover:bg-vs-surface/50
                 transition-all duration-200"
        >
          Show more
          <span class="font-mono text-vs-dim text-[11px] ml-1.5">
            {{ visible.length }} of {{ filtered.length.toLocaleString() }}
          </span>
        </button>
      </div>
    </template>
  </div>
</template>
