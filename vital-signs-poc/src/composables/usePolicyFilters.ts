/**
 * Shared composable for Policy L3 chart ↔ citation list linking.
 *
 * Owns filter state, raw citation loading, and per-year aggregation.
 * Provided by CategoryBreakout, injected by SubComponentChart and PolicyCitations.
 */

import {
  ref,
  shallowRef,
  computed,
  type Ref,
  type ShallowRef,
  type ComputedRef,
  type InjectionKey,
} from 'vue'
import type { PolicyCitation, ClientId } from '../data/types'

const GOV_ORG_TYPES = new Set(['Government', 'Legislative Body', 'Judicial Body'])
const LEGISLATIVE_ORG_TYPES = new Set(['Legislative Body', 'Judicial Body'])

// ─── Public API type ───

export interface PolicyFiltersAPI {
  // Writable filter refs
  filterOrgTier: Ref<'gov' | 'ngo' | 'legislative' | null>
  filterCore: Ref<boolean | null>
  filterYear: Ref<number | null>
  searchQuery: Ref<string>

  // Data
  allCitations: ShallowRef<PolicyCitation[]>
  loading: Ref<boolean>

  // Filtered citation list (all 4 filters applied — for citation list)
  filtered: ComputedRef<PolicyCitation[]>

  // Chart aggregation: counts per year with only orgTier + core filters
  // (searchQuery and filterYear do NOT affect the chart)
  filteredByYear: ComputedRef<{ year: number; count: number }[]>

  // Max citations in any single year, unfiltered — for Y-axis anchoring
  maxTotal: ComputedRef<number>

  // Whether orgTier or core filter is active (chart-relevant filters)
  hasChartFilter: ComputedRef<boolean>

  // Whether any filter is active (including search/year)
  hasActiveFilter: ComputedRef<boolean>

  // Available years from the data
  availableYears: ComputedRef<number[]>

  // Reset all filters
  clearFilters: () => void
}

export const POLICY_FILTERS_KEY: InjectionKey<PolicyFiltersAPI> = Symbol('policyFilters')

// ─── Composable ───

export function usePolicyFilters(clientId: ClientId): PolicyFiltersAPI {
  const allCitations = shallowRef<PolicyCitation[]>([])
  const loading = ref(true)

  // Fetch raw citation records
  const url = clientId === 'oi'
    ? '/data/oi-policy-citations.json'
    : '/data/ku-policy-citations.json'

  fetch(url)
    .then(resp => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return resp.json()
    })
    .then((data: PolicyCitation[]) => {
      allCitations.value = data
    })
    .catch(e => {
      console.warn('Policy citations not yet loaded:', e)
      allCitations.value = []
    })
    .finally(() => {
      loading.value = false
    })

  // ─── Filter state ───

  const searchQuery = ref('')
  const filterYear = ref<number | null>(null)
  const filterCore = ref<boolean | null>(null)
  const filterOrgTier = ref<'gov' | 'ngo' | 'legislative' | null>(null)

  const hasChartFilter = computed(() =>
    filterOrgTier.value !== null || filterCore.value !== null,
  )

  const hasActiveFilter = computed(() =>
    filterOrgTier.value !== null ||
    filterCore.value !== null ||
    filterYear.value !== null ||
    searchQuery.value.trim() !== '',
  )

  const availableYears = computed(() => {
    const years = new Set<number>()
    for (const c of allCitations.value) {
      if (c.policyDocYear > 0) years.add(c.policyDocYear)
    }
    return Array.from(years).sort((a, b) => b - a)
  })

  // ─── Full filtered list (all 4 filters — for citation list) ───

  const filtered = computed(() => {
    let result = allCitations.value

    if (filterCore.value !== null) {
      result = result.filter(c => c.coreTopic === filterCore.value)
    }

    if (filterOrgTier.value !== null) {
      if (filterOrgTier.value === 'gov') {
        result = result.filter(c => GOV_ORG_TYPES.has(c.orgType))
      } else if (filterOrgTier.value === 'legislative') {
        result = result.filter(c => LEGISLATIVE_ORG_TYPES.has(c.orgType))
      } else {
        result = result.filter(c => !GOV_ORG_TYPES.has(c.orgType))
      }
    }

    if (filterYear.value !== null) {
      result = result.filter(c => c.policyDocYear === filterYear.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      result = result.filter(
        c =>
          c.policyDocTitle.toLowerCase().includes(q) ||
          c.citingOrg.toLowerCase().includes(q) ||
          c.citedPaperTitle.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          c.orgType.toLowerCase().includes(q),
      )
    }

    return result
  })

  // ─── Chart aggregation (only orgTier + core filters, grouped by year) ───

  const filteredByYear = computed(() => {
    let result = allCitations.value

    if (filterCore.value !== null) {
      result = result.filter(c => c.coreTopic === filterCore.value)
    }

    if (filterOrgTier.value !== null) {
      if (filterOrgTier.value === 'gov') {
        result = result.filter(c => GOV_ORG_TYPES.has(c.orgType))
      } else if (filterOrgTier.value === 'legislative') {
        result = result.filter(c => LEGISLATIVE_ORG_TYPES.has(c.orgType))
      } else {
        result = result.filter(c => !GOV_ORG_TYPES.has(c.orgType))
      }
    }

    // Group by year
    const map = new Map<number, number>()
    for (const c of result) {
      const yr = c.policyDocYear
      if (yr > 0) {
        map.set(yr, (map.get(yr) ?? 0) + 1)
      }
    }

    return Array.from(map.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year)
  })

  // ─── Max total per year (unfiltered) — for Y-axis anchoring ───

  const maxTotal = computed(() => {
    const map = new Map<number, number>()
    for (const c of allCitations.value) {
      const yr = c.policyDocYear
      if (yr > 0) {
        map.set(yr, (map.get(yr) ?? 0) + 1)
      }
    }
    if (map.size === 0) return 1
    return Math.max(...map.values())
  })

  // ─── Actions ───

  function clearFilters() {
    searchQuery.value = ''
    filterYear.value = null
    filterCore.value = null
    filterOrgTier.value = null
  }

  return {
    filterOrgTier,
    filterCore,
    filterYear,
    searchQuery,
    allCitations,
    loading,
    filtered,
    filteredByYear,
    maxTotal,
    hasChartFilter,
    hasActiveFilter,
    availableYears,
    clearFilters,
  }
}
