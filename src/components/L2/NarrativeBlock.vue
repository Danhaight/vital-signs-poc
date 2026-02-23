<script setup lang="ts">
import { computed } from 'vue'
import type { ClientData, CategoryKey, TrendDirection } from '../../data/types'

const props = defineProps<{
  data: ClientData
}>()

const config = computed(() => props.data.config)
const years = computed(() => props.data.years)
const trends = computed(() => props.data.trends)

// Key computed values for narrative
const lastYear = computed(() => years.value[years.value.length - 1])

// Baseline average
const baselineAvg = computed(() => {
  const bl = years.value.filter(
    y => y.year >= config.value.baselineStart && y.year <= config.value.baselineEnd,
  )
  if (bl.length === 0) return 0
  return bl.reduce((sum, y) => sum + y.composite, 0) / bl.length
})

// Peak composite
const peak = computed(() => {
  let max = { year: 0, composite: 0 }
  for (const y of years.value) {
    if (y.composite > max.composite) max = { year: y.year, composite: y.composite }
  }
  return max
})

// Category sorted by current value (descending)
const rankedCategories = computed(() => {
  const cats: { key: CategoryKey; label: string; value: number; trend: TrendDirection }[] = [
    { key: 'academic', label: 'Academic Foundation', value: lastYear.value!.academic, trend: trends.value.academic },
    { key: 'media', label: 'Media Amplification', value: lastYear.value!.media, trend: trends.value.media },
    { key: 'awareness', label: 'Public Awareness', value: lastYear.value!.awareness, trend: trends.value.awareness },
    { key: 'opinion', label: 'Opinion & Receptivity', value: lastYear.value!.opinion, trend: trends.value.opinion },
    { key: 'policy', label: 'Policy Adoption', value: lastYear.value!.policy, trend: trends.value.policy },
  ]
  return cats.sort((a, b) => b.value - a.value)
})

// Strongest and weakest categories
const strongest = computed(() => rankedCategories.value[0])
const weakest = computed(() => rankedCategories.value[rankedCategories.value.length - 1])

// Strengthening categories
const strengthening = computed(() =>
  rankedCategories.value.filter(c => c.trend === 'strengthening'),
)
const weakening = computed(() =>
  rankedCategories.value.filter(c => c.trend === 'weakening'),
)

// Helper: list with "and"
const listItems = (items: string[]): string => {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1]!
}

// Is current value near peak or declining from peak?
const isPostPeak = computed(() => {
  return peak.value.year < lastYear.value!.year && peak.value.composite > lastYear.value!.composite + 5
})

// Helper: "the Opportunity Atlas" vs "The Care Board" (avoid "the The Care Board")
const toolRef = computed(() => {
  const name = config.value.toolName
  return name.startsWith('The ') ? name : `the ${name}`
})

// Opening sentence
const openingSentence = computed(() => {
  const change = lastYear.value!.composite - baselineAvg.value
  const direction = change > 5 ? 'strengthened' : change < -5 ? 'weakened' : 'remained relatively stable'
  return `Between ${config.value.yearRange[0]} and ${lastYear.value!.year}, the conditions for ${toolRef.value}'s policy impact have ${direction}, with the composite index moving from ${baselineAvg.value.toFixed(1)} during the baseline period to ${lastYear.value!.composite.toFixed(1)}. Each category measures annual activity — how much is happening right now — rather than cumulative totals.`
})

// Trend sentence
const trendSentence = computed(() => {
  if (isPostPeak.value) {
    return `The composite reached its highest point of ${peak.value.composite.toFixed(1)} in ${peak.value.year} before declining to its current level, suggesting that favorable conditions may have peaked.`
  }
  if (trends.value.composite === 'strengthening') {
    return `The overall trajectory continues to strengthen, suggesting increasingly favorable conditions for policy impact.`
  }
  return ''
})

// Decomposition sentence
const decompositionSentence = computed(() => {
  const parts: string[] = []

  if (strengthening.value.length > 0) {
    const names = strengthening.value.map(c => c.label)
    parts.push(`${listItems(names)} ${strengthening.value.length === 1 ? 'is' : 'are'} strengthening`)
  }

  if (weakening.value.length > 0) {
    const names = weakening.value.map(c => c.label)
    parts.push(`${listItems(names)} ${weakening.value.length === 1 ? 'shows' : 'show'} signs of weakening`)
  }

  if (parts.length === 0) return 'All five categories are currently stable.'
  return `Across the five measured dimensions, ${parts.join(', while ')}.`
})

// Strongest/weakest sentence
const strengthSentence = computed(() => {
  return `${strongest.value!.label} is the strongest dimension at ${strongest.value!.value.toFixed(0)}/100, while ${weakest.value!.label} is the most constrained at ${weakest.value!.value.toFixed(0)}/100.`
})

// Caveat sentence
const caveatSentence = computed(() => {
  const hasCarriedForward = years.value.some(y => y.opinionCarriedForward)
  const parts: string[] = []

  if (hasCarriedForward) {
    parts.push('opinion data relies on surveys with irregular cadence, requiring interpolation for some years')
  }

  parts.push('all category scores are normalized relative to each tool\'s own history, so values are not comparable across tools')

  return `Note: ${parts.join('; ')}.`
})
</script>

<template>
  <div class="max-w-[680px]">
    <h3 class="text-sm font-semibold text-vs-muted uppercase tracking-wider font-mono mb-4">
      Summary
    </h3>

    <div class="space-y-3 text-[15px] leading-[1.75] text-vs-text/90">
      <p>{{ openingSentence }}</p>

      <p v-if="trendSentence">{{ trendSentence }}</p>

      <p>{{ decompositionSentence }} {{ strengthSentence }}</p>

      <p class="text-vs-muted text-[13px] leading-[1.7] italic">
        {{ caveatSentence }}
      </p>
    </div>
  </div>
</template>
