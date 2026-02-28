<script setup lang="ts">
import { computed } from 'vue'
import type { ClientData, CategoryKey } from '../../data/types'
import { CATEGORY_MAP } from '../../data/types'

const props = defineProps<{
  data: ClientData
  categoryKey: CategoryKey
}>()

const cat = computed(() => CATEGORY_MAP[props.categoryKey])
const config = computed(() => props.data.config)
const years = computed(() => props.data.years)
const latest = computed(() => years.value[years.value.length - 1])
const trend = computed(() => props.data.trends[props.categoryKey])

const accessor = (d: NonNullable<typeof years.value[0]>) => d[props.categoryKey]

// Baseline average for this category
const baselineAvg = computed(() => {
  const bl = years.value.filter(
    y => y.year >= config.value.baselineStart && y.year <= config.value.baselineEnd,
  )
  if (bl.length === 0) return 0
  return bl.reduce((sum, y) => sum + accessor(y), 0) / bl.length
})

const trendWord = computed(() => {
  if (trend.value === 'strengthening') return 'strengthening'
  if (trend.value === 'weakening') return 'weakening'
  return 'stable'
})

// Category-specific narratives
const narrative = computed(() => {
  const name = cat.value.label
  const currentVal = accessor(latest.value!).toFixed(0)
  const blAvg = baselineAvg.value.toFixed(0)

  switch (props.categoryKey) {
    case 'academic':
      return `${name} currently scores ${currentVal}/100 (up from a baseline average of ${blAvg}), measuring the annual rate of new scholarly citations and publications. The chart above shows cumulative totals — the patient record of accumulated recognition — while the annual score (colored line) reflects how active each year was. ${trend.value === 'strengthening' ? 'Recent years show accelerating academic engagement.' : trend.value === 'weakening' ? 'The rate of new academic activity has slowed in recent years, even as the cumulative base continues to grow.' : 'The pace of new academic engagement has been relatively steady.'}`

    case 'media':
      if (Number(currentVal) === 0) {
        return `${name} remains at zero, as there are no recorded media interviews or public lectures in the dataset. This suggests the research team's public engagement activities have not yet been systematically tracked or have not yet begun.`
      }
      return `${name} currently scores ${currentVal}/100 (up from a baseline average of ${blAvg}), measuring the annual rate of new media interviews and public lectures. The chart above shows cumulative totals — the growing record of public engagement — while the annual score (colored line) reflects each year's activity level. ${trend.value === 'strengthening' ? 'The strengthening trend suggests increasing public visibility for the research.' : trend.value === 'weakening' ? 'The rate of new media activity has slowed in recent years, even as the cumulative record continues to build.' : 'The pace of media engagement has been relatively steady.'}`

    case 'awareness':
      return `${name} measures public search interest via Google Trends, serving as a proxy for how much the general public is engaging with the research topic. Currently at ${currentVal}/100, ${Number(currentVal) < 50 ? 'this is the category where conditions are most constrained — public engagement has not kept pace with academic and media growth.' : 'public engagement is moderate and ' + trendWord.value + '.'} Google Trends data captures search behavior, which correlates with but does not directly measure awareness.`

    case 'opinion':
      const carriedCount = years.value.filter(y => y.opinionCarriedForward).length
      return `${name} measures public sentiment toward policy action in this domain, drawing from survey data (GSS, ANES, and Stimson Policy Mood indices). Currently at ${currentVal}/100, this dimension reflects the broader climate of public receptivity to policy change. Note that survey data is collected at irregular intervals — ${carriedCount} of ${years.value.length} years in this series use carried-forward values from the most recent available survey. Dashed line segments in the chart above indicate interpolated years.`

    case 'policy': {
      const policyLatest = props.data.policySummary[props.data.policySummary.length - 1]
      const totalCitations = props.data.policySummary.reduce((sum, p) => sum + p.total, 0)
      const totalGov = props.data.policySummary.reduce((sum, p) => sum + p.gov, 0)
      const totalNgo = props.data.policySummary.reduce((sum, p) => sum + p.ngo, 0)
      const govPct = totalCitations > 0 ? Math.round((totalGov / totalCitations) * 100) : 0
      return `${name} tracks formal citations of the research in policy documents, sourced from the Sage/Overton database. Currently at ${currentVal}/100 with ${policyLatest?.total ?? 0} citations in ${latest.value!.year}. ${trend.value === 'weakening' ? 'The recent decline from peak levels may reflect natural citation cycles rather than diminishing policy relevance.' : 'The trajectory indicates ' + trendWord.value + ' policy engagement.'} The chart above separates government and legislative citations (${totalGov.toLocaleString()} total, ${govPct}%) — the strongest signals of direct policy influence — from think tank, IGO, and NGO citations (${totalNgo.toLocaleString()} total) which reflect the broader policy conversation. Across all years, ${totalCitations.toLocaleString()} policy citations have been identified.`
    }

    default:
      return ''
  }
})
</script>

<template>
  <div>
    <p class="text-[14px] leading-[1.7] text-vs-text/90">
      {{ narrative }}
    </p>
  </div>
</template>
