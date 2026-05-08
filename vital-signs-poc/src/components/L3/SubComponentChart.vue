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
  { top: 28, right: 72, bottom: 36, left: 48 },
  0.40,
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
  dashed?: boolean
  isArea?: boolean
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

      const chartFilterActive = pf ? pf.hasChartFilter.value : false

      if (chartFilterActive && pf && !pf.loading.value && pf.allCitations.value.length > 0) {
        const maxVal = pf.maxTotal.value
        const byYear = pf.filteredByYear.value
        const yearMap = new Map(byYear.map(d => [d.year, d.count]))

        const parts: string[] = []
        if (pf.filterOrgTier.value === 'legislative') parts.push('Legislative')
        else if (pf.filterOrgTier.value === 'gov') parts.push('Government')
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


// ─── Scales ───

// Collect all years present in any series
const allYears = computed(() => {
  const yearSet = new Set<number>()
  for (const s of series.value) {
    for (const v of s.values) yearSet.add(v.year)
  }
  return [...yearSet].sort((a, b) => a - b)
})

// Band scale for stacked columns
const xBand = computed(() => {
  const d = dimensions.value
  if (!d.innerWidth || !allYears.value.length) return null
  return d3
    .scaleBand<number>()
    .domain(allYears.value)
    .range([0, d.innerWidth])
    .padding(0.2)
})

// Y scale — for stacked bars the max is the sum of all series at each year
const stackMax = computed(() => {
  const yrs = allYears.value
  let max = 0
  for (const yr of yrs) {
    let sum = 0
    for (const s of series.value) {
      const point = s.values.find(v => v.year === yr)
      sum += point?.value ?? 0
    }
    if (sum > max) max = sum
  }
  return Math.max(max, 1)
})

const yScale = computed(() => {
  const d = dimensions.value
  if (!d.innerHeight) return null
  // Use the stacked max (or 100 if it's smaller, to keep a sensible ceiling)
  const domainMax = Math.max(stackMax.value, 10)
  return d3.scaleLinear().domain([0, domainMax]).range([d.innerHeight, 0])
})

// ─── Stacked bar data ───

interface StackedBar {
  year: number
  seriesKey: string
  color: string
  y0: number // bottom of segment (value)
  y1: number // top of segment (value)
  x: number  // pixel x
  barWidth: number
  yPx: number  // pixel y (top)
  heightPx: number // pixel height
  isPreLaunch: boolean
}

const stackedBars = computed<StackedBar[]>(() => {
  if (!xBand.value || !yScale.value) return []
  const bars: StackedBar[] = []
  const bw = xBand.value.bandwidth()

  for (const yr of allYears.value) {
    let cumulative = 0
    for (const s of series.value) {
      const point = s.values.find(v => v.year === yr)
      const val = point?.value ?? 0
      const y0 = cumulative
      const y1 = cumulative + val
      cumulative = y1

      const yPxTop = yScale.value!(y1)
      const yPxBottom = yScale.value!(y0)

      bars.push({
        year: yr,
        seriesKey: s.key,
        color: s.color,
        y0,
        y1,
        x: xBand.value!(yr)!,
        barWidth: bw,
        yPx: yPxTop,
        heightPx: Math.max(yPxBottom - yPxTop, 0),
        isPreLaunch: yr < config.value.launchYear,
      })
    }
  }
  return bars
})

// ─── Opinion: keep as line (single series, special treatment) ───

const opinionSegments = computed(() => {
  if (props.categoryKey !== 'opinion' || !xBand.value || !yScale.value) return []
  const years = props.data.years
  const bw = xBand.value.bandwidth()
  const segments: { path: string; dashed: boolean }[] = []

  let currentSegment: typeof years = []
  let isDashed = years[0]?.opinionCarriedForward ?? false

  for (let i = 0; i < years.length; i++) {
    const yr = years[i]!
    const yrDashed = yr.opinionCarriedForward

    if (yrDashed !== isDashed && currentSegment.length > 0) {
      const gen = d3
        .line<typeof years[0]>()
        .x(d => {
          const bx = xBand.value!(d.year)
          return (bx != null ? bx : 0) + bw / 2
        })
        .y(d => yScale.value!(d.opinion))
        .curve(d3.curveMonotoneX)
      const path = gen(currentSegment) ?? ''
      if (path) segments.push({ path, dashed: isDashed })

      currentSegment = [years[i - 1]!, yr]
      isDashed = yrDashed
    } else {
      currentSegment.push(yr)
    }
  }

  if (currentSegment.length > 0) {
    const gen = d3
      .line<typeof years[0]>()
      .x(d => {
        const bx = xBand.value!(d.year)
        return (bx != null ? bx : 0) + bw / 2
      })
      .y(d => yScale.value!(d.opinion))
      .curve(d3.curveMonotoneX)
    const path = gen(currentSegment) ?? ''
    if (path) segments.push({ path, dashed: isDashed })
  }

  return segments
})

// ─── Launch marker ───
const launchX = computed(() => {
  if (!xBand.value) return 0
  const bx = xBand.value(config.value.launchYear)
  return bx != null ? bx : 0
})

// Baseline band
const baselineBand = computed(() => {
  if (!xBand.value) return null
  const step = xBand.value.step()
  const pad = xBand.value.paddingOuter() * step
  const x1 = xBand.value(config.value.baselineStart)
  const x2end = xBand.value(config.value.baselineEnd)
  if (x1 == null || x2end == null) return null
  return { x: x1 - pad * 0.5, width: x2end - x1 + xBand.value.bandwidth() + pad * 0.5 }
})

// ─── Y ticks (dynamic based on stacked max) ───
const yTicks = computed(() => {
  const max = stackMax.value
  if (max <= 100) return [0, 25, 50, 75, 100]
  // For stacked values that exceed 100, generate nice ticks
  const step = max <= 200 ? 50 : max <= 500 ? 100 : 200
  const ticks: number[] = []
  for (let v = 0; v <= max; v += step) ticks.push(v)
  return ticks
})

const xTicks = computed(() => {
  const [start, end] = config.value.yearRange
  const span = end - start
  const step = span > 12 ? 4 : span > 8 ? 2 : 1
  const ticks: number[] = []
  for (let y = start; y <= end; y += step) ticks.push(y)
  const last = ticks[ticks.length - 1]!
  if (last !== end && (end - last) > step / 2) {
    ticks.push(end)
  }
  return ticks
})

function renderAxes() {
  if (!svgRef.value || !xBand.value || !yScale.value) return
  const svg = d3.select(svgRef.value)
  const chartArea = svg.select('.chart-area')

  // X axis — use band center positions
  chartArea.select('.x-axis').remove()
  const xAxisScale = d3
    .scaleLinear()
    .domain([config.value.yearRange[0], config.value.yearRange[1]])
    .range([0, dimensions.value.innerWidth])

  chartArea
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${dimensions.value.innerHeight})`)
    .call(
      d3.axisBottom(xAxisScale)
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

  // Y axis
  chartArea.select('.y-axis').remove()
  chartArea
    .append('g')
    .attr('class', 'y-axis')
    .call(
      d3.axisLeft(yScale.value)
        .tickValues(yTicks.value)
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

// ─── Tooltip ───
const hoverYear = ref<number | null>(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

function onChartMouseMove(event: MouseEvent) {
  if (!xBand.value || !svgRef.value) return
  const rect = svgRef.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left - dimensions.value.margin.left

  // Find nearest band
  const years = allYears.value
  let nearest = years[0]!
  let minDist = Infinity
  for (const yr of years) {
    const bx = xBand.value(yr)!
    const center = bx + xBand.value.bandwidth() / 2
    const dist = Math.abs(mouseX - center)
    if (dist < minDist) {
      minDist = dist
      nearest = yr
    }
  }
  hoverYear.value = nearest
  tooltipX.value = event.clientX - rect.left
  tooltipY.value = event.clientY - rect.top
}

function onChartMouseLeave() {
  hoverYear.value = null
}

const tooltipData = computed(() => {
  if (hoverYear.value === null) return null
  const yr = hoverYear.value
  const seriesValues = series.value.map(s => {
    const point = s.values.find(v => v.year === yr)
    return { label: s.label, color: s.color, value: point?.value ?? null }
  })
  return {
    year: yr,
    series: seriesValues,
  }
})
</script>

<template>
  <div class="w-full">
    <!-- Legend -->
    <div class="flex items-center gap-4 mb-4 flex-wrap">
      <div
        v-for="s in series"
        :key="s.key"
        class="flex items-center gap-1.5"
      >
        <span
          class="w-3.5 h-2.5 rounded-[2px]"
          :style="{ backgroundColor: s.color, opacity: 0.75 }"
        ></span>
        <span class="text-[11px] text-vs-muted">{{ s.label }}</span>
      </div>
      <!-- Opinion dashed key -->
      <div
        v-if="categoryKey === 'opinion'"
        class="flex items-center gap-1.5 border-l border-vs-border/40 pl-4"
      >
        <span class="w-4 h-0.5 border-t-2 border-dashed" :style="{ borderColor: '#B8A0CC' }"></span>
        <span class="text-[11px] text-vs-dim">Carried forward</span>
      </div>
    </div>

    <div ref="containerRef" class="w-full relative">
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
            <!-- Stacked column bars (for all categories except opinion) -->
            <template v-if="categoryKey !== 'opinion'">
              <rect
                v-for="bar in stackedBars"
                :key="bar.year + '-' + bar.seriesKey"
                :x="bar.x"
                :y="bar.yPx"
                :width="bar.barWidth"
                :height="bar.heightPx"
                :rx="Math.min(bar.barWidth * 0.12, 2)"
                :ry="Math.min(bar.barWidth * 0.12, 2)"
                :fill="bar.color"
                :opacity="bar.isPreLaunch ? 0.35 : 0.8"
              />
            </template>

            <!-- Opinion: keep as segmented line -->
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
              <template v-if="xBand && yScale">
                <circle
                  v-for="yr in data.years"
                  :key="yr.year"
                  :cx="(xBand(yr.year) ?? 0) + xBand.bandwidth() / 2"
                  :cy="yScale(yr.opinion)"
                  :r="yr.opinionCarriedForward ? 2 : 3"
                  :fill="yr.opinionCarriedForward ? 'none' : '#B8A0CC'"
                  :stroke="yr.opinionCarriedForward ? '#B8A0CC' : '#151821'"
                  :stroke-width="yr.opinionCarriedForward ? 1 : 1.5"
                  :opacity="yr.opinionCarriedForward ? 0.5 : 1"
                />
              </template>
            </template>

          </g>

          <!-- Hover overlay -->
          <rect
            :width="dimensions.innerWidth"
            :height="dimensions.innerHeight"
            fill="transparent"
            @mousemove="onChartMouseMove"
            @mouseleave="onChartMouseLeave"
            style="cursor: crosshair"
          />
          <!-- Hover highlight on the active column -->
          <rect
            v-if="hoverYear !== null && xBand"
            :x="(xBand(hoverYear) ?? 0) - 2"
            :y="0"
            :width="xBand.bandwidth() + 4"
            :height="dimensions.innerHeight"
            fill="#C8C3B8"
            opacity="0.04"
            pointer-events="none"
            rx="2"
          />
        </g>
      </svg>

      <!-- Tooltip -->
      <div
        v-if="tooltipData"
        class="absolute pointer-events-none vs-tooltip rounded-xl px-3.5 py-3 z-10 min-w-[160px]"
        :style="{
          left: (tooltipX > dimensions.width * 0.7 ? tooltipX - 14 : tooltipX + 14) + 'px',
          top: Math.max(0, tooltipY - 20) + 'px',
          transform: tooltipX > dimensions.width * 0.7 ? 'translateX(-100%)' : 'none',
        }"
      >
        <div class="text-xs font-mono font-semibold text-vs-text mb-2">{{ tooltipData.year }}</div>
        <div v-for="s in tooltipData.series" :key="s.label" class="flex items-center gap-2.5 text-[11px] leading-relaxed">
          <span class="w-2 h-2 rounded-[3px] shrink-0" :style="{ backgroundColor: s.color, opacity: 0.65 }"></span>
          <span class="text-vs-muted flex-1">{{ s.label }}</span>
          <span class="text-vs-text font-mono tabular-nums">{{ s.value !== null ? s.value.toFixed(1) : '—' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
