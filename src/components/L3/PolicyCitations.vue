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
const govCount = computed(() => allCitations.value.filter(c => GOV_ORG_TYPES.has(c.orgType)).length)
const uniqueOrgs = computed(() => new Set(allCitations.value.map(c => c.citingOrg)).size)

function showMore() {
  showCount.value += 50
}

function clearFilters() {
  composableClearFilters()
  showCount.value = 25
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold text-vs-muted uppercase tracking-wider font-mono mb-4">
      Policy Citations
    </h3>

    <div v-if="loading" class="text-vs-muted text-sm py-8 text-center">
      Loading citations…
    </div>

    <div v-else-if="allCitations.length === 0" class="text-vs-muted text-sm py-8 text-center">
      No citation data available.
    </div>

    <template v-else>
      <!-- Stats bar -->
      <div class="flex items-center gap-4 mb-4 text-xs font-mono text-vs-dim">
        <span>{{ allCitations.length.toLocaleString() }} total citations</span>
        <span>·</span>
        <span>{{ govCount.toLocaleString() }} government</span>
        <span>·</span>
        <span>{{ (allCitations.length - govCount).toLocaleString() }} think tanks/IGOs/NGOs</span>
        <span>·</span>
        <span>{{ uniqueOrgs }} unique organizations</span>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <!-- Search -->
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search titles, orgs, countries…"
          class="bg-vs-bg border border-vs-border rounded px-3 py-1.5 text-sm text-vs-text
                 placeholder:text-vs-dim focus:outline-none focus:border-vs-muted/50
                 w-64 font-mono"
        />

        <!-- Year filter -->
        <select
          v-model="filterYear"
          class="bg-vs-bg border border-vs-border rounded px-3 py-1.5 text-sm text-vs-text
                 focus:outline-none focus:border-vs-muted/50 font-mono"
        >
          <option :value="null">All years</option>
          <option v-for="yr in availableYears" :key="yr" :value="yr">{{ yr }}</option>
        </select>

        <!-- Org tier toggle -->
        <div class="flex gap-1">
          <button
            @click="filterOrgTier = filterOrgTier === 'gov' ? null : 'gov'"
            class="px-2 py-1 rounded text-xs font-mono transition-colors"
            :class="filterOrgTier === 'gov'
              ? 'bg-[#D4A85C]/20 text-[#D4A85C] border border-[#D4A85C]/30'
              : 'bg-vs-bg text-vs-dim border border-vs-border hover:text-vs-muted'"
          >
            Government
          </button>
          <button
            @click="filterOrgTier = filterOrgTier === 'ngo' ? null : 'ngo'"
            class="px-2 py-1 rounded text-xs font-mono transition-colors"
            :class="filterOrgTier === 'ngo'
              ? 'bg-[#9A7830]/20 text-[#9A7830] border border-[#9A7830]/30'
              : 'bg-vs-bg text-vs-dim border border-vs-border hover:text-vs-muted'"
          >
            Think Tanks/IGOs
          </button>
        </div>

        <!-- Core toggle -->
        <div class="flex gap-1">
          <button
            @click="filterCore = filterCore === true ? null : true"
            class="px-2 py-1 rounded text-xs font-mono transition-colors"
            :class="filterCore === true
              ? 'bg-[#D4A85C]/20 text-[#D4A85C] border border-[#D4A85C]/30'
              : 'bg-vs-bg text-vs-dim border border-vs-border hover:text-vs-muted'"
          >
            Core
          </button>
          <button
            @click="filterCore = filterCore === false ? null : false"
            class="px-2 py-1 rounded text-xs font-mono transition-colors"
            :class="filterCore === false
              ? 'bg-vs-muted/20 text-vs-muted border border-vs-muted/30'
              : 'bg-vs-bg text-vs-dim border border-vs-border hover:text-vs-muted'"
          >
            Other
          </button>
        </div>

        <!-- Result count -->
        <span class="text-xs font-mono text-vs-dim ml-auto">
          {{ filtered.length.toLocaleString() }} matching
        </span>

        <!-- Clear -->
        <button
          v-if="hasActiveFilter"
          @click="clearFilters"
          class="text-xs font-mono text-vs-muted hover:text-vs-text transition-colors"
        >
          Clear filters
        </button>
      </div>

      <!-- Citation list grouped by year -->
      <div class="space-y-4">
        <div
          v-for="[year, citations] in groupedByYear"
          :key="year"
        >
          <!-- Year header -->
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-mono font-semibold text-vs-muted">
              {{ year || 'Unknown Year' }}
            </span>
            <span class="text-xs font-mono text-vs-dim">
              ({{ citations.length }})
            </span>
          </div>

          <!-- Citations -->
          <div class="space-y-1">
            <div
              v-for="(cit, idx) in citations"
              :key="idx"
              class="bg-vs-surface border border-vs-border/50 rounded px-4 py-3
                     hover:border-vs-border transition-colors group"
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
                      class="shrink-0 w-1.5 h-1.5 rounded-full bg-vs-dim/50"
                      title="Other topic"
                    ></span>
                    <a
                      v-if="cit.url"
                      :href="cit.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm text-vs-text hover:text-[#D4A85C] transition-colors truncate"
                    >
                      {{ cit.policyDocTitle || 'Untitled' }}
                      <span class="text-vs-dim text-[10px] ml-1">↗</span>
                    </a>
                    <span v-else class="text-sm text-vs-text truncate">
                      {{ cit.policyDocTitle || 'Untitled' }}
                    </span>
                  </div>

                  <!-- Meta line -->
                  <div class="text-xs font-mono text-vs-dim mt-1 flex items-center gap-2 flex-wrap">
                    <span>{{ cit.citingOrg }}</span>
                    <span v-if="cit.country">· {{ cit.country }}</span>
                    <span v-if="cit.orgType">· {{ cit.orgType }}</span>
                    <span v-if="cit.policyDocType">· {{ cit.policyDocType }}</span>
                  </div>

                  <!-- Cited paper -->
                  <div class="text-[11px] text-vs-dim/70 mt-1">
                    Cites: {{ cit.citedPaperTitle || 'Unknown paper' }}
                    <span v-if="cit.citedPaperYear"> ({{ cit.citedPaperYear }})</span>
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
        class="text-center mt-6"
      >
        <button
          @click="showMore"
          class="px-4 py-2 text-sm font-mono text-vs-muted border border-vs-border rounded
                 hover:text-vs-text hover:border-vs-muted/50 transition-colors"
        >
          Show more ({{ visible.length }} of {{ filtered.length.toLocaleString() }})
        </button>
      </div>
    </template>
  </div>
</template>
