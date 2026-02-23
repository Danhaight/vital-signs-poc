<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import * as d3 from 'd3'
import type { ClientData, CategoryKey } from '../../data/types'
import { CATEGORY_MAP } from '../../data/types'
import { useChartDimensions } from '../../composables/useChartDimensions'
import { POLICY_FILTERS_KEY } from '../../composables/usePolicyFilters'

const props = defineProps<{
  data: ClientData
  categoryKey: CategoryKey
}>()

const cat = computed(() => CATEGORY_MAP[props.categoryKey])
const config = computed(() => props.data.config)
const isOI = computed(() => props.data.config.id === 'oi')

const containerRef = ref<HTMLElement | null>(null)
const { dimensions } = useChartDimensions(
  containerRef,
  { top: 36, right: 72, bottom: 44, left: 48 },
  0.4,
)
const svgRef = ref<SVGSVGElement | null>(null)

// Policy filter state (injected from CategoryBreakout, null for non-policy categories)
const policyFilters = inject(POLICY_FILTERS_KEY, null)

// ─── Sub-component series definitions per category ───

interface SeriesDef {
  key: string
  label: string
  weight?: string
  color: string
  values: { year: number; value: number }[]
  dashed?: boolean // for carried-forward opinion
  isArea?: boolean // true for cumulative/stock series at L3
}

const series = computed<SeriesDef[]>(() => {
  const rawOI = props.data.rawOI ?? []
  const rawKU = props.data.rawKU ?? []
  const years = props.data.years

  switch (props.categoryKey) {
    case 'academic': {
      const raw = isOI.value ? rawOI : rawKU
      const maxPubs = Math.max(...raw.map(d => d.pubsCum), 1)
      const maxCites = Math.max(...raw.map(d => d.citesCum), 1)
      return [
        {
          key: 'citations',
          label: 'Citations (cumulative)',
          weight: '70%',
          color: '#9BB8D4',
          values: raw.map(d => ({ year: d.year, value: (d.citesCum / maxCites) * 100 })),
          isArea: true,
        },
        {
          key: 'publications',
          label: 'Publications (cumulative)',
          weight: '30%',
          color: '#5E7E9E',
          values: raw.map(d => ({ year: d.year, value: (d.pubsCum / maxPubs) * 100 })),
          isArea: true,
        },
      ]
    }

    case 'media': {
      const raw = isOI.value ? rawOI : rawKU
      const maxInt = Math.max(...raw.map(d => d.intCum), 1)
      const maxLec = Math.max(...raw.map(d => d.lecCum), 1)
      return [
        {
          key: 'interviews',
          label: 'Interviews (cumulative)',
          weight: '65%',
          color: '#D4AD7E',
          values: raw.map(d => ({ year: d.year, value: maxInt > 0 ? (d.intCum / maxInt) * 100 : 0 })),
          isArea: true,
        },
        {
          key: 'lectures',
          label: 'Lectures (cumulative)',
          weight: '35%',
          color: '#A07040',
          values: raw.map(d => ({ year: d.year, value: maxLec > 0 ? (d.lecCum / maxLec) * 100 : 0 })),
          isArea: true,
        },
      ]
    }

    case 'awareness': {
      if (isOI.value) {
        const raw = rawOI
        return [
          {
            key: 'gOA',
            label: 'Opportunity Atlas',
            color: '#A8D49E',
            values: raw.map(d => ({ year: d.year, value: d.gOA })),
          },
          {
            key: 'gOI',
            label: 'Opportunity Insights',
            color: '#6DAF5E',
            values: raw.map(d => ({ year: d.year, value: d.gOI })),
          },
          {
            key: 'gEM',
            label: 'Economic Mobility',
            color: '#437038',
            values: raw.map(d => ({ year: d.year, value: d.gEM })),
          },
        ]
      } else {
        const raw = rawKU
        return [
          {
            key: 'gTrends',
            label: 'Google Trends',
            color: '#8DB580',
            values: raw.map(d => ({ year: d.year, value: d.gTrends })),
          },
        ]
      }
    }

    case 'opinion': {
      // Show the composite z-score rescaled, with carried-forward marking
      return [
        {
          key: 'opinion',
          label: 'Survey Composite',
          color: '#B8A0CC',
          values: years.map(y => ({ year: y.year, value: y.opinion })),
        },
      ]
    }

    case 'policy': {
      const ps = props.data.policySummary
      const pf = policyFilters

      // Check if chart-relevant filters are active (orgTier or core)
      const chartFilterActive = pf
        ? pf.hasChartFilter.value
        : false

      if (chartFilterActive && pf && !pf.loading.value && pf.allCitations.value.length > 0) {
        // Filtered mode: single line from raw citation aggregation
        const maxVal = pf.maxTotal.value
        const byYear = pf.filteredByYear.value
        const yearMap = new Map(byYear.map(d => [d.year, d.count]))

        // Build descriptive label from active filters
        const parts: string[] = []
        if (pf.filterOrgTier.value === 'gov') parts.push('Government')
        else if (pf.filterOrgTier.value === 'ngo') parts.push('Think Tanks/IGOs')
        if (pf.filterCore.value === true) parts.push('Core')
        else if (pf.filterCore.value === false) parts.push('Other')
        const label = parts.join(' · ') || 'Filtered'

        return [
          {
            key: 'filtered',
            label,
            color: '#D4A85C',
            values: ps.map(p => ({
              year: p.year,
              value: ((yearMap.get(p.year) ?? 0) / maxVal) * 100,
            })),
          },
        ]
      }

      // Default: unfiltered gov vs ngo split from pre-aggregated data
      const maxTotal = Math.max(...ps.map(p => p.total), 1)
      return [
        {
          key: 'gov',
          label: 'Government & Legislative',
          color: '#D4A85C',
          values: ps.map(p => ({ year: p.year, value: (p.gov / maxTotal) * 100 })),
        },
        {
          key: 'ngo',
          label: 'Think Tanks, IGOs & NGOs',
          color: '#9A7830',
          values: ps.map(p => ({ year: p.year, value: (p.ngo / maxTotal) * 100 })),
        },
      ]
    }

    default:
      return []
  }
})

// Category composite line (weighted flow score from L2)
const compositeSeries = computed<SeriesDef>(() => ({
  key: 'composite',
  label: 'Annual Score (L2)',
  color: cat.value.color,
  values: props.data.years.map(y => ({
    year: y.year,
    value: y[props.categoryKey],
  })),
}))

// Scales
const xScale = computed(() => {
  const d = dimensions.value
  if (!d.innerWidth) return null
  return d3
    .scaleLinear()
    .domain([config.value.yearRange[0], config.value.yearRange[1]])
    .range([0, d.innerWidth])
})

const yScale = computed(() => {
  const d = dimensions.value
  if (!d.innerHeight) return null
  return d3.scaleLinear().domain([0, 100]).range([d.innerHeight, 0])
})

// Line generator factory (curveLinear to prevent overshoot below 0)
function makeLine(vals: { year: number; value: number }[]) {
  if (!xScale.value || !yScale.value) return ''
  const gen = d3
    .line<{ year: number; value: number }>()
    .x(d => xScale.value!(d.year))
    .y(d => yScale.value!(d.value))
    .curve(d3.curveLinear)
  return gen(vals) ?? ''
}


// Area generator factory (for cumulative/stock series — uses linear to avoid overshoot below 0)
function makeArea(vals: { year: number; value: number }[]) {
  if (!xScale.value || !yScale.value) return ''
  const gen = d3
    .area<{ year: number; value: number }>()
    .x(d => xScale.value!(d.year))
    .y0(dimensions.value.innerHeight)
    .y1(d => yScale.value!(d.value))
    .curve(d3.curveLinear)
  return gen(vals) ?? ''
}

// For opinion: generate segments (solid for observed, dashed for carried)
const opinionSegments = computed(() => {
  if (props.categoryKey !== 'opinion' || !xScale.value || !yScale.value) return []
  const years = props.data.years
  const segments: { path: string; dashed: boolean }[] = []

  let currentSegment: typeof years = []
  let isDashed = years[0]?.opinionCarriedForward ?? false

  for (let i = 0; i < years.length; i++) {
    const yr = years[i]!
    const yrDashed = yr.opinionCarriedForward

    if (yrDashed !== isDashed && currentSegment.length > 0) {
      // End current segment, start new one with overlap at boundary
      const gen = d3
        .line<typeof years[0]>()
        .x(d => xScale.value!(d.year))
        .y(d => yScale.value!(d.opinion))
        .curve(d3.curveMonotoneX)
      const path = gen(currentSegment) ?? ''
      if (path) segments.push({ path, dashed: isDashed })

      // Start new segment including the boundary point
      currentSegment = [years[i - 1]!, yr]
      isDashed = yrDashed
    } else {
      currentSegment.push(yr)
    }
  }

  // Flush final segment
  if (currentSegment.length > 0) {
    const gen = d3
      .line<typeof years[0]>()
      .x(d => xScale.value!(d.year))
      .y(d => yScale.value!(d.opinion))
      .curve(d3.curveMonotoneX)
    const path = gen(currentSegment) ?? ''
    if (path) segments.push({ path, dashed: isDashed })
  }

  return segments
})

// Launch marker
const launchX = computed(() => {
  if (!xScale.value) return 0
  return xScale.value(config.value.launchYear)
})

// Baseline band
const baselineBand = computed(() => {
  if (!xScale.value) return null
  const x1 = xScale.value(config.value.baselineStart)
  const x2 = xScale.value(config.value.baselineEnd)
  return { x: x1, width: x2 - x1 }
})

const yTicks = [0, 25, 50, 75, 100]

const xTicks = computed(() => {
  const [start, end] = config.value.yearRange
  const span = end - start
  const step = span > 12 ? 4 : span > 8 ? 2 : 1
  const ticks: number[] = []
  for (let y = start; y <= end; y += step) ticks.push(y)
  if (ticks[ticks.length - 1] !== end) ticks.push(end)
  return ticks
})

function renderAxes() {
  if (!svgRef.value || !xScale.value || !yScale.value) return
  const svg = d3.select(svgRef.value)
  const chartArea = svg.select('.chart-area')

  chartArea.select('.x-axis').remove()
  chartArea
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${dimensions.value.innerHeight})`)
    .call(
      d3.axisBottom(xScale.value)
        .tickValues(xTicks.value)
        .tickFormat(d => String(d))
        .tickSize(0)
        .tickPadding(12),
    )
    .call(g => g.select('.domain').remove())
    .selectAll('text')
    .style('fill', '#4d5162')
    .style('font-family', "'DM Mono', monospace")
    .style('font-size', '11px')

  chartArea.select('.y-axis').remove()
  chartArea
    .append('g')
    .attr('class', 'y-axis')
    .call(
      d3.axisLeft(yScale.value)
        .tickValues(yTicks)
        .tickSize(-dimensions.value.innerWidth)
        .tickPadding(8),
    )
    .call(g => g.select('.domain').remove())
    .call(g =>
      g.selectAll('.tick line')
        .attr('stroke', '#262a38')
        .attr('stroke-dasharray', '2,3'),
    )
    .selectAll('text')
    .style('fill', '#4d5162')
    .style('font-family', "'DM Mono', monospace")
    .style('font-size', '10px')
}

onMounted(renderAxes)
watch(() => [dimensions.value, props.data, props.categoryKey], renderAxes, { deep: true })
</script>

<template>
  <div class="w-full">
    <!-- Direct labels (legend replacement) -->
    <div class="flex items-center gap-4 mb-4 flex-wrap">
      <div
        v-for="s in series"
        :key="s.key"
        class="flex items-center gap-1.5"
      >
        <!-- Area swatch for cumulative/stock series, line swatch for flow -->
        <span
          v-if="s.isArea"
          class="w-4 h-2.5 rounded-sm"
          :style="{ backgroundColor: s.color, opacity: 0.3 }"
        ></span>
        <span
          v-else
          class="w-4 h-0.5 rounded"
          :style="{ backgroundColor: s.color }"
        ></span>
        <span class="text-xs font-mono text-vs-muted">{{ s.label }}</span>
      </div>
      <div class="flex items-center gap-1.5 border-l border-vs-border pl-4">
        <span class="w-4 h-[2px] rounded" :style="{ backgroundColor: cat.color }"></span>
        <span class="text-xs font-mono text-vs-text font-medium">Annual Score (L2)</span>
      </div>
      <!-- Opinion dashed key -->
      <div
        v-if="categoryKey === 'opinion'"
        class="flex items-center gap-1.5 border-l border-vs-border pl-4"
      >
        <span class="w-4 h-0.5 border-t-2 border-dashed" :style="{ borderColor: '#B8A0CC' }"></span>
        <span class="text-xs font-mono text-vs-dim">Carried forward</span>
      </div>
    </div>

    <div ref="containerRef" class="w-full">
      <svg
        v-if="dimensions.width > 0"
        ref="svgRef"
        :width="dimensions.width"
        :height="dimensions.height"
      >
        <g
          class="chart-area"
          :transform="`translate(${dimensions.margin.left}, ${dimensions.margin.top})`"
        >
          <!-- Baseline band -->
          <rect
            v-if="baselineBand"
            :x="baselineBand.x"
            :y="0"
            :width="baselineBand.width"
            :height="dimensions.innerHeight"
            :fill="cat.color"
            opacity="0.05"
          />
          <text
            v-if="baselineBand"
            :x="baselineBand.x + baselineBand.width / 2"
            :y="-8"
            text-anchor="middle"
            fill="#4d5162"
            font-size="9"
            font-family="'DM Mono', monospace"
          >BASELINE</text>

          <!-- Launch marker -->
          <line
            :x1="launchX" :y1="0" :x2="launchX" :y2="dimensions.innerHeight"
            :stroke="cat.color"
            stroke-width="1.5"
            stroke-dasharray="6,4"
            opacity="0.5"
          />
          <text
            :x="launchX" :y="-8"
            text-anchor="middle"
            :fill="cat.color"
            font-size="9"
            font-family="'DM Mono', monospace"
            font-weight="500"
          >LAUNCH {{ config.launchYear }}</text>

          <!-- Chart content -->
          <g>
            <!-- Sub-component series -->
            <template v-if="categoryKey !== 'opinion'">
              <!-- Area fills for cumulative/stock series (rendered first, behind lines) -->
              <template v-for="s in series" :key="s.key + '-area'">
                <path
                  v-if="s.isArea"
                  :d="makeArea(s.values)"
                  :fill="s.color"
                  opacity="0.08"
                  stroke="none"
                />
              </template>
              <!-- Lines for all series (area series get stroke on top of fill) -->
              <path
                v-for="s in series"
                :key="s.key"
                :d="makeLine(s.values)"
                fill="none"
                :stroke="s.color"
                :stroke-width="s.isArea ? 2 : 1.5"
                stroke-linecap="round"
                :opacity="s.isArea ? 0.9 : 0.8"
              />
            </template>

            <!-- Opinion: segmented line with dashed for carried-forward -->
            <template v-if="categoryKey === 'opinion'">
              <path
                v-for="(seg, idx) in opinionSegments"
                :key="idx"
                :d="seg.path"
                fill="none"
                stroke="#B8A0CC"
                :stroke-width="seg.dashed ? 1.5 : 2"
                stroke-linecap="round"
                :stroke-dasharray="seg.dashed ? '6,4' : 'none'"
                :opacity="seg.dashed ? 0.5 : 0.8"
              />
              <!-- Data quality dots -->
              <circle
                v-for="yr in data.years"
                :key="yr.year"
                :cx="xScale?.(yr.year) ?? 0"
                :cy="yScale?.(yr.opinion) ?? 0"
                :r="yr.opinionCarriedForward ? 2 : 3"
                :fill="yr.opinionCarriedForward ? 'none' : '#B8A0CC'"
                :stroke="yr.opinionCarriedForward ? '#B8A0CC' : '#151821'"
                :stroke-width="yr.opinionCarriedForward ? 1 : 1.5"
                :opacity="yr.opinionCarriedForward ? 0.5 : 1"
              />
            </template>

            <!-- Weighted composite line (thicker, category color, linear for flow data) -->
            <template v-if="categoryKey !== 'opinion'">
              <path
                :d="makeLine(compositeSeries.values)"
                fill="none"
                :stroke="cat.color"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </template>
          </g>

          <!-- Endpoint annotations for each series -->
          <template v-for="s in series" :key="s.key + '-label'">
            <text
              v-if="s.values.length > 0 && xScale && yScale"
              :x="xScale(s.values[s.values.length - 1]!.year) + 8"
              :y="yScale(s.values[s.values.length - 1]!.value) + 4"
              :fill="s.color"
              font-size="10"
              font-family="'DM Mono', monospace"
            >
              {{ s.values[s.values.length - 1]!.value.toFixed(0) }}
            </text>
          </template>

          <!-- Composite endpoint -->
          <template v-if="categoryKey !== 'opinion' && compositeSeries.values.length > 0 && xScale && yScale">
            <circle
              :cx="xScale(compositeSeries.values[compositeSeries.values.length - 1]!.year)"
              :cy="yScale(compositeSeries.values[compositeSeries.values.length - 1]!.value)"
              r="4"
              :fill="cat.color"
              stroke="#151821"
              stroke-width="2"
            />
            <text
              :x="xScale(compositeSeries.values[compositeSeries.values.length - 1]!.year) + 8"
              :y="yScale(compositeSeries.values[compositeSeries.values.length - 1]!.value) + 4"
              :fill="cat.color"
              font-size="12"
              font-family="'DM Mono', monospace"
              font-weight="600"
            >
              {{ compositeSeries.values[compositeSeries.values.length - 1]!.value.toFixed(1) }}
            </text>
          </template>
        </g>
      </svg>
    </div>
  </div>
</template>
