<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import type { ComputedYear, CategoryKey, CategoryMeta, ClientConfig, TrendDirection } from '../../data/types'
import { CATEGORY_MAP } from '../../data/types'
import { useChartDimensions } from '../../composables/useChartDimensions'

const props = defineProps<{
  categoryKey: CategoryKey
  years: ComputedYear[]
  config: ClientConfig
  trend: TrendDirection
}>()

const emit = defineEmits<{
  select: [key: CategoryKey]
}>()

const cat = computed<CategoryMeta>(() => CATEGORY_MAP[props.categoryKey])

const containerRef = ref<HTMLElement | null>(null)
// Reduced left margin — no y-axis labels. Small right pad for endpoint dot.
const { dimensions } = useChartDimensions(
  containerRef,
  { top: 4, right: 10, bottom: 4, left: 4 },
  0.7,
)

const svgRef = ref<SVGSVGElement | null>(null)

// Accessor for this category's score
const accessor = (d: ComputedYear): number => d[props.categoryKey]

// Latest value
const latestValue = computed(() => {
  const last = props.years[props.years.length - 1]
  return last ? accessor(last) : 0
})

// Scales
const xScale = computed(() => {
  const d = dimensions.value
  if (!d.innerWidth) return null
  return d3
    .scaleLinear()
    .domain([props.config.yearRange[0], props.config.yearRange[1]])
    .range([0, d.innerWidth])
})

const yScale = computed(() => {
  const d = dimensions.value
  if (!d.innerHeight) return null
  return d3.scaleLinear().domain([0, 100]).range([d.innerHeight, 0])
})

// Path
const linePath = computed(() => {
  if (!xScale.value || !yScale.value) return ''
  const gen = d3
    .line<ComputedYear>()
    .x(d => xScale.value!(d.year))
    .y(d => yScale.value!(accessor(d)))
    .curve(d3.curveLinear)
  return gen(props.years) ?? ''
})

// Launch marker
const launchX = computed(() => {
  if (!xScale.value) return 0
  return xScale.value(props.config.launchYear)
})

// Baseline band
const baselineBand = computed(() => {
  if (!xScale.value) return null
  const x1 = xScale.value(props.config.baselineStart)
  const x2 = xScale.value(props.config.baselineEnd)
  return { x: x1, width: x2 - x1 }
})

const trendColor = computed(() => {
  if (props.trend === 'strengthening') return '#8DB580'
  if (props.trend === 'weakening') return '#C47070'
  return '#8a8d97'
})

// Subtle horizontal gridlines — no axis labels, just faint reference marks
function renderGridlines() {
  if (!svgRef.value || !yScale.value) return
  const svg = d3.select(svgRef.value)
  const chartArea = svg.select('.chart-area')

  chartArea.select('.gridlines').remove()
  const g = chartArea.append('g').attr('class', 'gridlines')

  // Just a midpoint reference line at 50
  g.append('line')
    .attr('x1', 0)
    .attr('x2', dimensions.value.innerWidth)
    .attr('y1', yScale.value(50))
    .attr('y2', yScale.value(50))
    .attr('stroke', '#262a38')
    .attr('stroke-dasharray', '2,3')
}

onMounted(renderGridlines)
watch(() => [dimensions.value, props.years], renderGridlines, { deep: true })
</script>

<template>
  <button
    @click="emit('select', categoryKey)"
    class="bg-vs-surface border border-vs-border rounded-lg p-3 pb-2
           hover:border-vs-muted/40 hover:-translate-y-px hover:shadow-lg hover:shadow-black/20
           transition-all duration-150 cursor-pointer text-left
           group relative"
  >
    <!-- Header: color dot + mixed-case name + score + trend -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center gap-1.5">
        <span
          class="w-1.5 h-1.5 rounded-full"
          :style="{ backgroundColor: cat.color }"
        ></span>
        <span class="text-[10px] text-vs-muted group-hover:text-vs-text transition-colors">
          {{ cat.label }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <span
          class="font-mono text-xs font-semibold"
          :style="{ color: cat.color }"
        >
          {{ latestValue.toFixed(0) }}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          :style="{ color: trendColor }"
        >
          <!-- Up arrow -->
          <path
            v-if="trend === 'strengthening'"
            d="M5 2L8 6H2L5 2Z"
            fill="currentColor"
          />
          <!-- Down arrow -->
          <path
            v-else-if="trend === 'weakening'"
            d="M5 8L2 4H8L5 8Z"
            fill="currentColor"
          />
          <!-- Right arrow (stable) -->
          <path
            v-else
            d="M2 5H7M7 5L5 3M7 5L5 7"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <!-- Chart (no y-axis labels — "remove to improve") -->
    <div ref="containerRef" class="w-full">
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
            :height="dimensions.innerHeight"
            :fill="cat.color"
            opacity="0.04"
          />

          <!-- Launch line -->
          <line
            :x1="launchX"
            :y1="0"
            :x2="launchX"
            :y2="dimensions.innerHeight"
            :stroke="cat.color"
            stroke-width="1"
            stroke-dasharray="3,3"
            opacity="0.3"
          />

          <!-- Line -->
          <path
            :d="linePath"
            fill="none"
            :stroke="cat.color"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Endpoint dot -->
          <circle
            v-if="xScale && yScale && years.length > 0"
            :cx="xScale(years[years.length - 1]!.year)"
            :cy="yScale(accessor(years[years.length - 1]!))"
            r="3"
            :fill="cat.color"
            stroke="#151821"
            stroke-width="1.5"
          />
        </g>
      </svg>
    </div>
  </button>
</template>
