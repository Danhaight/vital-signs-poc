<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import type { ClientData } from '../../data/types'
import { useChartDimensions } from '../../composables/useChartDimensions'

const props = defineProps<{
  data: ClientData
}>()

// Neutral composite color — warm gray, distinct from all categories
const COMPOSITE_COLOR = '#C8C3B8'

const containerRef = ref<HTMLElement | null>(null)
// Tighter aspect ratio — shorter, less dead space
const { dimensions } = useChartDimensions(
  containerRef,
  { top: 24, right: 56, bottom: 32, left: 48 },
  0.32,
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

// Delta from baseline
const deltaFromBaseline = computed(() => {
  if (!latestYear.value) return 0
  return latestYear.value.composite - baselineAvg.value
})

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
    .y0(dimensions.value.innerHeight)
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
    height: dimensions.value.innerHeight,
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

  // X-axis
  svg.select('.x-axis').remove()
  const xAxisG = svg
    .select('.chart-area')
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${dimensions.value.innerHeight})`)

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
    <!-- Header with title + score callout -->
    <div class="flex items-start justify-between mb-4">
      <h3 class="text-sm font-semibold text-vs-muted uppercase tracking-wider font-mono">
        Composite Vital Signs Index
      </h3>

      <!-- Prominent score callout — the 10-second answer -->
      <div v-if="latestYear" class="text-right">
        <div class="text-[32px] font-mono font-bold leading-none" style="color: #C8C3B8">
          {{ latestYear.composite.toFixed(1) }}
        </div>
        <div class="text-xs font-mono text-vs-dim mt-1">
          {{ deltaFromBaseline >= 0 ? '↑' : '↓' }} {{ Math.abs(deltaFromBaseline).toFixed(1) }} from baseline
        </div>
      </div>
    </div>

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
          <!-- Baseline band (reduced opacity) -->
          <rect
            v-if="baselineBand"
            :x="baselineBand.x"
            :y="0"
            :width="baselineBand.width"
            :height="baselineBand.height"
            fill="#C8C3B8"
            opacity="0.03"
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
            :y2="dimensions.innerHeight"
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

          <!-- Endpoint dot only (no per-year dots — line IS the encoding) -->
          <g v-if="endpointPos">
            <circle
              :cx="endpointPos.x"
              :cy="endpointPos.y"
              r="5"
              :fill="COMPOSITE_COLOR"
              stroke="#151821"
              stroke-width="2"
            />
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
        </g>
      </svg>
    </div>
  </div>
</template>
