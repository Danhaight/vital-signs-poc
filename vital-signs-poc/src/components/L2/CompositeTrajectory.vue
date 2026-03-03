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
  return CATEGORY_MAP[key as CategoryKey]?.color ?? '#CCC7BB'
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
  // Only append end year if sufficiently far from the last tick to avoid cramped labels
  const last = ticks[ticks.length - 1]!
  if (last !== end && (end - last) > step / 2) {
    ticks.push(end)
  }
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
    .style('fill', '#4a4e5e')
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
        .attr('stroke', '#1e2333')
        .attr('stroke-dasharray', '2,3'),
    )
    .selectAll('text')
    .style('fill', '#4a4e5e')
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

// ─── Tooltip ───
const hoverYear = ref<number | null>(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

function onChartMouseMove(event: MouseEvent) {
  if (!xScale.value || !svgRef.value) return
  const rect = svgRef.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left - dimensions.value.margin.left
  const [start, end] = config.value.yearRange
  const rawYear = xScale.value.invert(mouseX)
  const nearestYear = Math.round(Math.max(start, Math.min(end, rawYear)))
  hoverYear.value = nearestYear
  tooltipX.value = event.clientX - rect.left
  tooltipY.value = event.clientY - rect.top
}

function onChartMouseLeave() {
  hoverYear.value = null
}

const tooltipData = computed(() => {
  if (hoverYear.value === null) return null
  const yr = hoverYear.value
  const cumRow = cumulativeStackData.value.find(d => d.year === yr)
  const cumComp = cumulativeComposite.value.find(d => d.year === yr)
  const yearRow = years.value.find(y => y.year === yr)

  // Per-category cumulative breakdowns (reversed for top-to-bottom display)
  const categories = [...STACK_KEYS].reverse().map(key => ({
    label: CATEGORY_MAP[key].label.split(' ')[0]!,
    color: CATEGORY_MAP[key].color,
    value: cumRow ? cumRow[key] : null,
  }))

  return {
    year: yr,
    categories,
    cumulativeTotal: cumComp ? cumComp.total : null,
    annualComposite: yearRow ? yearRow.composite : null,
  }
})
</script>

<template>
  <div class="w-full">
    <!-- Header with title + score callout -->
    <div class="flex items-start justify-between mb-5">
      <div>
        <h3 class="text-xs font-semibold text-vs-muted uppercase tracking-[0.12em]">
          Cumulative Impact Score
        </h3>
        <!-- Inline legend -->
        <div class="flex items-center gap-3 mt-2.5 flex-wrap">
          <div
            v-for="item in legendItems"
            :key="item.key"
            class="flex items-center gap-1.5"
          >
            <span
              class="w-2 h-2 rounded-[3px] inline-block"
              :style="{ backgroundColor: item.color, opacity: 0.65 }"
            />
            <span class="text-[10px] text-vs-dim">
              {{ item.label.split(' ')[0] }}
            </span>
          </div>
        </div>
      </div>

      <!-- Score callout — current composite as hero, cumulative secondary -->
      <div v-if="latestYear" class="text-right">
        <div class="flex items-baseline justify-end gap-1.5">
          <span class="text-[36px] font-mono font-bold leading-none tracking-tight" style="color: #CCC7BB">
            {{ latestYear.composite.toFixed(1) }}
          </span>
          <span class="text-sm font-mono text-vs-dim/70">/100</span>
        </div>
        <div class="flex items-center justify-end gap-2 mt-1.5">
          <span class="text-[11px] text-vs-dim">current score</span>
          <span
            class="text-[11px] font-mono font-semibold inline-flex items-center gap-0.5"
            :class="deltaFromBaseline >= 0 ? 'text-trend-up' : 'text-trend-down'"
          >
            <svg v-if="deltaFromBaseline >= 0" width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 2L8 6H2L5 2Z" fill="currentColor"/>
            </svg>
            <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 8L2 4H8L5 8Z" fill="currentColor"/>
            </svg>
            {{ Math.abs(deltaFromBaseline).toFixed(1) }}
          </span>
        </div>
        <div class="text-[11px] font-mono text-vs-dim/60 mt-2">
          {{ Math.round(latestCumulative) }} cumulative pts
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
        <!-- Gradient defs for area fills -->
        <defs>
          <linearGradient
            v-for="key in STACK_KEYS"
            :key="'grad-' + key"
            :id="'area-grad-' + key"
            x1="0" y1="0" x2="0" y2="1"
          >
            <stop offset="0%" :stop-color="categoryColor(key)" stop-opacity="0.65"/>
            <stop offset="100%" :stop-color="categoryColor(key)" stop-opacity="0.35"/>
          </linearGradient>

          <!-- Composite line glow -->
          <filter id="composite-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

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
            fill="#CCC7BB"
            opacity="0.03"
          />
          <text
            v-if="baselineBand"
            :x="baselineBand.x + baselineBand.width / 2"
            :y="-8"
            text-anchor="middle"
            fill="#4a4e5e"
            font-size="9"
            font-family="'DM Mono', monospace"
            letter-spacing="0.05em"
          >
            BASELINE
          </text>

          <!-- Launch marker -->
          <line
            :x1="launchX"
            :y1="0"
            :x2="launchX"
            :y2="dimensions.innerHeight"
            stroke="#CCC7BB"
            stroke-width="1"
            stroke-dasharray="4,4"
            opacity="0.35"
          />
          <text
            :x="launchX"
            :y="-8"
            text-anchor="middle"
            fill="#CCC7BB"
            font-size="9"
            font-family="'DM Mono', monospace"
            font-weight="500"
            letter-spacing="0.05em"
          >
            LAUNCH {{ config.launchYear }}
          </text>

          <!-- Stacked area layers (cumulative) with gradients -->
          <path
            v-for="series in stackedSeries"
            :key="series.key"
            :d="areaForSeries(series)"
            :fill="`url(#area-grad-${series.key})`"
          />

          <!-- Thin separator lines between layers -->
          <path
            v-for="series in stackedSeries"
            :key="'line-' + series.key"
            :d="separatorLineForSeries(series)"
            fill="none"
            stroke="#12151e"
            stroke-width="0.5"
            opacity="0.5"
          />

          <!-- Composite top-edge line with glow -->
          <path
            :d="compositeLinePath"
            fill="none"
            stroke="#CCC7BB"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.5"
            filter="url(#composite-glow)"
          />
          <path
            :d="compositeLinePath"
            fill="none"
            stroke="#CCC7BB"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.7"
          />

          <!-- Endpoint dot at cumulative top -->
          <g v-if="endpointPos">
            <!-- Outer glow -->
            <circle
              :cx="endpointPos.x"
              :cy="endpointPos.y"
              r="8"
              fill="#CCC7BB"
              opacity="0.08"
            />
            <circle
              :cx="endpointPos.x"
              :cy="endpointPos.y"
              r="5"
              fill="#CCC7BB"
              stroke="#12151e"
              stroke-width="2"
            />
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
          <!-- Vertical crosshair -->
          <line
            v-if="hoverYear !== null && xScale"
            :x1="xScale(hoverYear)"
            :y1="0"
            :x2="xScale(hoverYear)"
            :y2="dimensions.innerHeight"
            stroke="#CCC7BB"
            stroke-width="1"
            stroke-dasharray="3,3"
            opacity="0.25"
            pointer-events="none"
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
        <!-- Per-category cumulative breakdown -->
        <div v-for="c in tooltipData.categories" :key="c.label" class="flex items-center gap-2.5 text-[11px] leading-relaxed">
          <span class="w-2 h-2 rounded-[3px] shrink-0" :style="{ backgroundColor: c.color, opacity: 0.65 }"></span>
          <span class="text-vs-muted flex-1">{{ c.label }}</span>
          <span class="text-vs-text font-mono tabular-nums">{{ c.value !== null ? c.value.toFixed(1) : '—' }}</span>
        </div>
        <!-- Cumulative total -->
        <div
          v-if="tooltipData.cumulativeTotal !== null"
          class="flex items-center gap-2.5 text-[11px] leading-relaxed mt-1.5 pt-1.5 border-t border-vs-border/40"
        >
          <span class="w-2 h-[2px] rounded shrink-0" style="background-color: #CCC7BB"></span>
          <span class="text-vs-text flex-1 font-medium">Cumulative</span>
          <span class="text-vs-text font-mono font-semibold tabular-nums">{{ tooltipData.cumulativeTotal.toFixed(1) }}</span>
        </div>
        <!-- Annual composite -->
        <div
          v-if="tooltipData.annualComposite !== null"
          class="flex items-center gap-2.5 text-[11px] leading-relaxed mt-0.5"
        >
          <span class="w-2 h-[2px] rounded shrink-0 opacity-40" style="background-color: #CCC7BB"></span>
          <span class="text-vs-dim flex-1">Annual</span>
          <span class="text-vs-dim font-mono tabular-nums">{{ tooltipData.annualComposite.toFixed(1) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
