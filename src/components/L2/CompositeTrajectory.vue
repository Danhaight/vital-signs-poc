<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import type { ClientData, CategoryKey } from '../../data/types'
import { CATEGORY_MAP } from '../../data/types'
import { useChartDimensions } from '../../composables/useChartDimensions'

const props = defineProps<{
  data: ClientData
}>()

// Neutral composite color — warm gray, distinct from all categories
const COMPOSITE_COLOR = '#C8C3B8'

const containerRef = ref<HTMLElement | null>(null)
// Slightly taller ratio to accommodate the ribbon beneath
const { dimensions } = useChartDimensions(
  containerRef,
  { top: 36, right: 56, bottom: 44, left: 48 },
  0.42,
)

const svgRef = ref<SVGSVGElement | null>(null)

// Derived data
const years = computed(() => props.data.years)
const config = computed(() => props.data.config)
const latestYear = computed(() => years.value[years.value.length - 1])

// Baseline average
const baselineAvg = computed(() => {
  const bl = years.value.filter(
    y => y.year >= config.value.baselineStart && y.year <= config.value.baselineEnd,
  )
  if (bl.length === 0) return 0
  return bl.reduce((sum, y) => sum + y.composite, 0) / bl.length
})

// Ribbon height = thin colored line (not a bar chart)
const ribbonHeight = computed(() => 6)
const chartHeight = computed(() => dimensions.value.innerHeight - ribbonHeight.value - 6) // 6px gap

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
  if (!chartHeight.value) return null
  return d3.scaleLinear().domain([0, 100]).range([chartHeight.value, 0])
})

// Path generators
const linePath = computed(() => {
  if (!xScale.value || !yScale.value) return ''
  const gen = d3
    .line<typeof years.value[0]>()
    .x(d => xScale.value!(d.year))
    .y(d => yScale.value!(d.composite))
    .curve(d3.curveMonotoneX)
  return gen(years.value) ?? ''
})

const areaPath = computed(() => {
  if (!xScale.value || !yScale.value) return ''
  const gen = d3
    .area<typeof years.value[0]>()
    .x(d => xScale.value!(d.year))
    .y0(chartHeight.value)
    .y1(d => yScale.value!(d.composite))
    .curve(d3.curveMonotoneX)
  return gen(years.value) ?? ''
})

// Baseline band
const baselineBand = computed(() => {
  if (!xScale.value || !yScale.value) return null
  const x1 = xScale.value(config.value.baselineStart)
  const x2 = xScale.value(config.value.baselineEnd)
  return {
    x: x1,
    width: x2 - x1,
    height: chartHeight.value,
  }
})

// Launch marker
const launchX = computed(() => {
  if (!xScale.value) return 0
  return xScale.value(config.value.launchYear)
})

// Endpoint annotation
const endpointPos = computed(() => {
  if (!xScale.value || !yScale.value || !latestYear.value) return null
  return {
    x: xScale.value(latestYear.value.year),
    y: yScale.value(latestYear.value.composite),
  }
})

// ─── Primary Driver Ribbon ───
// Use a 3-year rolling mode to smooth single-year flickers
const smoothedDrivers = computed(() => {
  const yrs = years.value
  if (yrs.length === 0) return []

  return yrs.map((yr, i) => {
    // Gather a window of up to 3 years centered on i
    const windowStart = Math.max(0, i - 1)
    const windowEnd = Math.min(yrs.length - 1, i + 1)
    const window = yrs.slice(windowStart, windowEnd + 1)

    // Count how often each category is primary driver in the window
    const counts: Partial<Record<CategoryKey, number>> = {}
    for (const w of window) {
      counts[w.primaryDriver] = (counts[w.primaryDriver] ?? 0) + 1
    }

    // Pick the most frequent; on tie, prefer the center year's driver
    let best: CategoryKey = yr.primaryDriver
    let bestCount = 0
    for (const [key, count] of Object.entries(counts) as [CategoryKey, number][]) {
      if (count > bestCount || (count === bestCount && key === yr.primaryDriver)) {
        best = key
        bestCount = count
      }
    }

    return { year: yr.year, driver: best }
  })
})

// Build ribbon segments (contiguous runs of the same driver)
const ribbonSegments = computed(() => {
  if (!xScale.value) return []
  const drivers = smoothedDrivers.value
  if (drivers.length === 0) return []

  const segments: { x: number; width: number; color: string; label: string }[] = []
  let segStart = 0

  for (let i = 1; i <= drivers.length; i++) {
    if (i === drivers.length || drivers[i]!.driver !== drivers[segStart]!.driver) {
      const startYear = drivers[segStart]!.year
      const endYear = drivers[i - 1]!.year
      const cat = CATEGORY_MAP[drivers[segStart]!.driver]

      // Extend segments to fill the space between data points
      const x1 = segStart === 0
        ? xScale.value!(startYear)
        : xScale.value!((startYear + drivers[segStart - 1]!.year) / 2)
      const x2 = i === drivers.length
        ? xScale.value!(endYear)
        : xScale.value!((endYear + drivers[i]!.year) / 2)

      segments.push({
        x: x1,
        width: x2 - x1,
        color: cat.color,
        label: cat.label,
      })

      segStart = i
    }
  }

  return segments
})

// Y-axis ticks
const yTicks = [0, 25, 50, 75, 100]

// X-axis ticks
const xTicks = computed(() => {
  const [start, end] = config.value.yearRange
  const span = end - start
  const step = span > 12 ? 4 : span > 8 ? 2 : 1
  const ticks: number[] = []
  for (let y = start; y <= end; y += step) {
    ticks.push(y)
  }
  if (ticks[ticks.length - 1] !== end) ticks.push(end)
  return ticks
})

// Render axes with D3
function renderAxes() {
  if (!svgRef.value || !xScale.value || !yScale.value) return
  const svg = d3.select(svgRef.value)

  // X-axis (at bottom of chart area, above ribbon)
  svg.select('.x-axis').remove()
  const xAxisG = svg
    .select('.chart-area')
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${chartHeight.value})`)

  xAxisG
    .call(
      d3
        .axisBottom(xScale.value)
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

  // Y-axis
  svg.select('.y-axis').remove()
  const yAxisG = svg
    .select('.chart-area')
    .append('g')
    .attr('class', 'y-axis')

  yAxisG
    .call(
      d3
        .axisLeft(yScale.value)
        .tickValues(yTicks)
        .tickSize(-dimensions.value.innerWidth)
        .tickPadding(8),
    )
    .call(g => g.select('.domain').remove())
    .call(g =>
      g
        .selectAll('.tick line')
        .attr('stroke', '#262a38')
        .attr('stroke-dasharray', '2,3'),
    )
    .selectAll('text')
    .style('fill', '#4d5162')
    .style('font-family', "'DM Mono', monospace")
    .style('font-size', '10px')
}

onMounted(() => {
  renderAxes()
})

watch(
  () => [dimensions.value, props.data],
  () => {
    renderAxes()
  },
  { deep: true },
)
</script>

<template>
  <div class="w-full">
    <h3 class="text-sm font-semibold text-vs-muted uppercase tracking-wider mb-4 font-mono">
      Composite Vital Signs Index
    </h3>

    <div ref="containerRef" class="w-full relative">
      <svg
        v-if="dimensions.width > 0"
        ref="svgRef"
        :width="dimensions.width"
        :height="dimensions.height"
        class="overflow-visible"
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
            :height="baselineBand.height"
            fill="#C8C3B8"
            opacity="0.06"
          />
          <!-- Baseline label -->
          <text
            v-if="baselineBand"
            :x="baselineBand.x + baselineBand.width / 2"
            :y="-8"
            text-anchor="middle"
            fill="#4d5162"
            font-size="9"
            font-family="'DM Mono', monospace"
          >
            BASELINE
          </text>

          <!-- Launch marker -->
          <line
            :x1="launchX"
            :y1="0"
            :x2="launchX"
            :y2="chartHeight"
            stroke="#C8C3B8"
            stroke-width="1.5"
            stroke-dasharray="6,4"
            opacity="0.5"
          />
          <!-- Launch label -->
          <text
            :x="launchX"
            :y="-8"
            text-anchor="middle"
            fill="#C8C3B8"
            font-size="9"
            font-family="'DM Mono', monospace"
            font-weight="500"
          >
            LAUNCH {{ config.launchYear }}
          </text>

          <!-- Area fill beneath line (very subtle) -->
          <path
            :d="areaPath"
            fill="#C8C3B8"
            opacity="0.04"
          />

          <!-- Main composite line — thick, neutral -->
          <path
            :d="linePath"
            fill="none"
            :stroke="COMPOSITE_COLOR"
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Data points -->
          <circle
            v-for="yr in years"
            :key="yr.year"
            :cx="xScale?.(yr.year) ?? 0"
            :cy="yScale?.(yr.composite) ?? 0"
            r="3"
            :fill="COMPOSITE_COLOR"
            stroke="#151821"
            stroke-width="1.5"
          />

          <!-- Endpoint annotation -->
          <g v-if="endpointPos">
            <circle
              :cx="endpointPos.x"
              :cy="endpointPos.y"
              r="5"
              :fill="COMPOSITE_COLOR"
              stroke="#151821"
              stroke-width="2"
            />
            <text
              :x="endpointPos.x + 12"
              :y="endpointPos.y + 4"
              :fill="COMPOSITE_COLOR"
              font-size="13"
              font-family="'DM Mono', monospace"
              font-weight="600"
            >
              {{ latestYear?.composite.toFixed(1) }}
            </text>
          </g>

          <!-- Baseline average annotation -->
          <line
            v-if="baselineBand && yScale"
            :x1="baselineBand.x"
            :y1="yScale(baselineAvg)"
            :x2="baselineBand.x + baselineBand.width"
            :y2="yScale(baselineAvg)"
            :stroke="COMPOSITE_COLOR"
            stroke-width="1"
            stroke-dasharray="3,2"
            opacity="0.5"
          />
          <text
            v-if="baselineBand && yScale"
            :x="baselineBand.x + baselineBand.width + 4"
            :y="yScale(baselineAvg) + 3"
            fill="#4d5162"
            font-size="9"
            font-family="'DM Mono', monospace"
          >
            avg {{ baselineAvg.toFixed(1) }}
          </text>

          <!-- ═══ Primary Driver Ribbon ═══ -->
          <g :transform="`translate(0, ${chartHeight + 6 + 12})`">
            <!-- Ribbon label -->
            <text
              :x="-4"
              :y="ribbonHeight / 2 + 3"
              text-anchor="end"
              fill="#4d5162"
              font-size="8"
              font-family="'DM Mono', monospace"
            >
            </text>

            <!-- Colored segments -->
            <rect
              v-for="(seg, idx) in ribbonSegments"
              :key="idx"
              :x="seg.x"
              :y="0"
              :width="Math.max(seg.width, 1)"
              :height="ribbonHeight"
              :fill="seg.color"
              opacity="0.7"
              rx="1"
            />
          </g>
        </g>
      </svg>
    </div>

    <!-- Ribbon legend (inline, beneath chart) -->
    <div class="flex items-center gap-1 mt-1 ml-12 text-[8px] font-mono text-vs-dim">
      <span>PRIMARY DRIVER</span>
    </div>
  </div>
</template>
