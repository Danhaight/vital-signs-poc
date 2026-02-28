<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import type { ClientData, CategoryKey } from '../../data/types'
import { CATEGORY_MAP } from '../../data/types'
import { useChartDimensions } from '../../composables/useChartDimensions'

const props = defineProps<{
  data: ClientData
}>()

// Category stack order — bottom to top
// Policy (largest weight) at bottom for visual stability, academic on top
// Stack order bottom to top: Academic → Media → Awareness → Opinion → Policy
const STACK_KEYS: CategoryKey[] = ['academic', 'media', 'awareness', 'opinion', 'policy']

const containerRef = ref<HTMLElement | null>(null)
const { dimensions } = useChartDimensions(
  containerRef,
  { top: 24, right: 64, bottom: 32, left: 56 },
  0.38,
)

const svgRef = ref<SVGSVGElement | null>(null)

// Derived data
const years = computed(() => props.data.years)
const config = computed(() => props.data.config)
const latestYear = computed(() => years.value[years.value.length - 1])

// Delta from baseline (still uses point-in-time composite for the callout)
const baselineAvg = computed(() => {
  const bl = years.value.filter(
    y => y.year >= config.value.baselineStart && y.year <= config.value.baselineEnd,
  )
  if (bl.length === 0) return 0
  return bl.reduce((sum, y) => sum + y.composite, 0) / bl.length
})

const deltaFromBaseline = computed(() => {
  if (!latestYear.value) return 0
  return latestYear.value.composite - baselineAvg.value
})

// ── Cumulative stack data ──
// Running sum of each category's weighted contribution over time
const cumulativeStackData = computed(() => {
  const running: Record<CategoryKey, number> = {
    policy: 0, opinion: 0, awareness: 0, media: 0, academic: 0,
  }
  return years.value.map(y => {
    for (const key of STACK_KEYS) {
      running[key] += y.contributions[key]
    }
    return {
      year: y.year,
      policy: Math.round(running.policy * 100) / 100,
      opinion: Math.round(running.opinion * 100) / 100,
      awareness: Math.round(running.awareness * 100) / 100,
      media: Math.round(running.media * 100) / 100,
      academic: Math.round(running.academic * 100) / 100,
    }
  })
})

// Cumulative composite total per year (sum of all cumulative categories)
const cumulativeComposite = computed(() => {
  return cumulativeStackData.value.map(d => ({
    year: d.year,
    total: d.policy + d.opinion + d.awareness + d.media + d.academic,
  }))
})

const maxCumulative = computed(() => {
  if (cumulativeComposite.value.length === 0) return 100
  return Math.max(...cumulativeComposite.value.map(d => d.total))
})

const latestCumulative = computed(() => {
  const cc = cumulativeComposite.value
  return cc.length > 0 ? cc[cc.length - 1]!.total : 0
})

// D3 stack generator
const stackGenerator = computed(() => {
  return d3.stack<typeof cumulativeStackData.value[0]>()
    .keys(STACK_KEYS)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone)
})

const stackedSeries = computed(() => {
  if (cumulativeStackData.value.length === 0) return []
  return stackGenerator.value(cumulativeStackData.value)
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

// Y scale — dynamic domain based on cumulative max, with ~10% headroom
const yScale = computed(() => {
  const d = dimensions.value
  if (!d.innerHeight) return null
  const yMax = Math.ceil(maxCumulative.value * 1.08)
  return d3.scaleLinear().domain([0, yMax]).range([d.innerHeight, 0])
})

// Area generator for stacked layers
function areaForSeries(series: d3.Series<typeof cumulativeStackData.value[0], string>) {
  if (!xScale.value || !yScale.value) return ''
  const gen = d3
    .area<d3.SeriesPoint<typeof cumulativeStackData.value[0]>>()
    .x(d => xScale.value!(d.data.year))
    .y0(d => yScale.value!(d[0]))
    .y1(d => yScale.value!(d[1]))
    .curve(d3.curveMonotoneX)
  return gen(series) ?? ''
}

// Cumulative composite top-edge line
const compositeLinePath = computed(() => {
  if (!xScale.value || !yScale.value) return ''
  const gen = d3
    .line<typeof cumulativeComposite.value[0]>()
    .x(d => xScale.value!(d.year))
    .y(d => yScale.value!(d.total))
    .curve(d3.curveMonotoneX)
  return gen(cumulativeComposite.value) ?? ''
})

// Separator line for each stacked layer
function separatorLineForSeries(series: d3.Series<typeof cumulativeStackData.value[0], string>): string {
  if (!xScale.value || !yScale.value) return ''
  const points: [number, number][] = series.map((point, i) => [
    xScale.value!(cumulativeStackData.value[i]?.year ?? 0),
    yScale.value!(point[1]),
  ])
  const gen = d3.line().curve(d3.curveMonotoneX)
  return gen(points) ?? ''
}

// Color lookup
function categoryColor(key: string): string {
  return CATEGORY_MAP[key as CategoryKey]?.color ?? '#C8C3B8'
}

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

// Endpoint annotation — top of cumulative stack
const endpointPos = computed(() => {
  if (!xScale.value || !yScale.value) return null
  const lastCum = cumulativeComposite.value[cumulativeComposite.value.length - 1]
  if (!lastCum) return null
  return {
    x: xScale.value(lastCum.year),
    y: yScale.value(lastCum.total),
  }
})

// Legend items — show latest cumulative contribution per category
const legendItems = computed(() => {
  const lastCum = cumulativeStackData.value[cumulativeStackData.value.length - 1]
  return [...STACK_KEYS].reverse().map(key => ({
    key,
    label: CATEGORY_MAP[key].label,
    color: CATEGORY_MAP[key].color,
    value: lastCum ? lastCum[key] : 0,
  }))
})

// Y-axis ticks — auto-generated for cumulative scale
const yTicks = computed(() => {
  const max = Math.ceil(maxCumulative.value * 1.08)
  // Aim for ~4-5 ticks
  const rawStep = max / 4
  // Round to a nice number
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const niceSteps = [1, 2, 2.5, 5, 10]
  let step = magnitude
  for (const ns of niceSteps) {
    if (ns * magnitude >= rawStep) {
      step = ns * magnitude
      break
    }
  }
  const ticks: number[] = [0]
  let tick = step
  while (tick < max) {
    ticks.push(Math.round(tick))
    tick += step
  }
  return ticks
})

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
        .tickValues(yTicks.value)
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
      <div>
        <h3 class="text-sm font-semibold text-vs-muted uppercase tracking-wider font-mono">
          Cumulative Vital Signs Impact
        </h3>
        <!-- Inline legend -->
        <div class="flex items-center gap-3 mt-2 flex-wrap">
          <div
            v-for="item in legendItems"
            :key="item.key"
            class="flex items-center gap-1.5"
          >
            <span
              class="w-2.5 h-2.5 rounded-sm inline-block"
              :style="{ backgroundColor: item.color, opacity: 0.7 }"
            />
            <span class="text-[10px] font-mono text-vs-dim">
              {{ item.label.split(' ')[0] }}
            </span>
          </div>
        </div>
      </div>

      <!-- Score callout — cumulative total + current point-in-time -->
      <div v-if="latestYear" class="text-right">
        <div class="text-[28px] font-mono font-bold leading-none" style="color: #C8C3B8">
          {{ Math.round(latestCumulative) }}
        </div>
        <div class="text-[10px] font-mono text-vs-dim mt-1">
          cumulative pts
        </div>
        <div class="text-xs font-mono text-vs-muted mt-1.5">
          {{ latestYear.composite.toFixed(1) }}
          <span class="text-vs-dim">current · </span>
          <span :class="deltaFromBaseline >= 0 ? 'text-trend-up' : 'text-trend-down'">
            {{ deltaFromBaseline >= 0 ? '↑' : '↓' }}{{ Math.abs(deltaFromBaseline).toFixed(1) }}
          </span>
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
          <!-- Baseline band -->
          <rect
            v-if="baselineBand"
            :x="baselineBand.x"
            :y="0"
            :width="baselineBand.width"
            :height="baselineBand.height"
            fill="#C8C3B8"
            opacity="0.03"
          />
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

          <!-- Stacked area layers (cumulative) -->
          <path
            v-for="series in stackedSeries"
            :key="series.key"
            :d="areaForSeries(series)"
            :fill="categoryColor(series.key)"
            :opacity="0.55"
          />

          <!-- Thin separator lines between layers -->
          <path
            v-for="series in stackedSeries"
            :key="'line-' + series.key"
            :d="separatorLineForSeries(series)"
            fill="none"
            stroke="#151821"
            stroke-width="0.5"
            opacity="0.6"
          />

          <!-- Composite top-edge line -->
          <path
            :d="compositeLinePath"
            fill="none"
            stroke="#C8C3B8"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.6"
          />

          <!-- Endpoint dot at cumulative top -->
          <g v-if="endpointPos">
            <circle
              :cx="endpointPos.x"
              :cy="endpointPos.y"
              r="5"
              fill="#C8C3B8"
              stroke="#151821"
              stroke-width="2"
            />
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>
