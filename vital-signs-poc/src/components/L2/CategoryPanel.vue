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
const { dimensions } = useChartDimensions(
  containerRef,
  { top: 4, right: 6, bottom: 4, left: 6 },
  0.55,
)

const svgRef = ref<SVGSVGElement | null>(null)
const isHovered = ref(false)

// Accessor for this category's score
const accessor = (d: ComputedYear): number => d[props.categoryKey]

// Latest value
const latestValue = computed(() => {
  const last = props.years[props.years.length - 1]
  return last ? accessor(last) : 0
})

// Band scale for columns — maps each year to an evenly-spaced band
const xBand = computed(() => {
  const d = dimensions.value
  if (!d.innerWidth || !props.years.length) return null
  return d3
    .scaleBand<number>()
    .domain(props.years.map(y => y.year))
    .range([0, d.innerWidth])
    .padding(0.2)
})

// Linear y scale (0–100 score)
const yScale = computed(() => {
  const d = dimensions.value
  if (!d.innerHeight) return null
  return d3.scaleLinear().domain([0, 100]).range([d.innerHeight, 0])
})

// Bar data: x, y, width, height, and whether this is the latest year
const bars = computed(() => {
  if (!xBand.value || !yScale.value) return []
  const h = dimensions.value.innerHeight
  return props.years.map((d, i) => {
    const val = accessor(d)
    const barY = yScale.value!(val)
    return {
      year: d.year,
      x: xBand.value!.bandwidth() < 1 ? i : xBand.value!(d.year)!,
      y: barY,
      width: Math.max(xBand.value!.bandwidth(), 1),
      height: h - barY,
      value: val,
      isLast: i === props.years.length - 1,
      isBaseline: d.year >= props.config.baselineStart && d.year <= props.config.baselineEnd,
      isPreLaunch: d.year < props.config.launchYear,
    }
  })
})

// Launch marker — positioned at left edge of the launch-year bar
const launchX = computed(() => {
  if (!xBand.value) return 0
  const x = xBand.value(props.config.launchYear)
  return x != null ? x - xBand.value.step() * xBand.value.paddingOuter() * 0.5 : 0
})

const trendColor = computed(() => {
  if (props.trend === 'strengthening') return '#7DBF6C'
  if (props.trend === 'weakening') return '#D06666'
  return '#8b8e99'
})

// The most recent bar (for highlight glow)
const lastBar = computed(() => bars.value.length > 0 ? bars.value[bars.value.length - 1] : null)

// Subtle horizontal gridline at the midpoint
function renderGridlines() {
  if (!svgRef.value || !yScale.value) return
  const svg = d3.select(svgRef.value)
  const chartArea = svg.select('.chart-area')

  chartArea.select('.gridlines').remove()
  const g = chartArea.append('g').attr('class', 'gridlines')

  g.append('line')
    .attr('x1', 0)
    .attr('x2', dimensions.value.innerWidth)
    .attr('y1', yScale.value(50))
    .attr('y2', yScale.value(50))
    .attr('stroke', '#1e2333')
    .attr('stroke-dasharray', '2,3')
}

onMounted(renderGridlines)
watch(() => [dimensions.value, props.years], renderGridlines, { deep: true })
</script>

<template>
  <button
    @click="emit('select', categoryKey)"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    class="vs-glass rounded-xl p-3.5 pb-2
           hover:-translate-y-0.5
           transition-all duration-250 cursor-pointer text-left
           group relative overflow-hidden"
    :style="{
      boxShadow: isHovered
        ? `0 0 0 1px ${cat.color}22, 0 4px 20px -4px rgba(0,0,0,0.3), 0 0 30px -10px ${cat.color}15`
        : '0 0 0 1px rgba(255,255,255,0.02) inset, 0 1px 2px rgba(0,0,0,0.15)',
      borderColor: isHovered ? cat.color + '30' : undefined,
    }"
  >
    <!-- Subtle category-colored glow on hover -->
    <div
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      :style="{ background: `radial-gradient(ellipse at 50% 0%, ${cat.color}08, transparent 70%)` }"
    ></div>

    <!-- Header: color dot + mixed-case name + score + trend -->
    <div class="flex items-center justify-between mb-1.5 relative">
      <div class="flex items-center gap-1.5">
        <span
          class="w-1.5 h-1.5 rounded-full transition-shadow duration-300"
          :style="{
            backgroundColor: cat.color,
            boxShadow: isHovered ? `0 0 6px ${cat.color}60` : 'none',
          }"
        ></span>
        <span class="text-[10px] text-vs-muted group-hover:text-vs-text transition-colors duration-200">
          {{ cat.label }}
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <span
          class="font-mono text-xs font-semibold tabular-nums"
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

    <!-- Column chart -->
    <div ref="containerRef" class="w-full relative">
      <svg
        v-if="dimensions.width > 0"
        ref="svgRef"
        :width="dimensions.width"
        :height="dimensions.height"
        class="overflow-visible"
      >
        <defs>
          <!-- Vertical gradient for columns: vivid at top → fades toward baseline -->
          <linearGradient :id="'bar-grad-' + categoryKey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="cat.color" stop-opacity="0.85"/>
            <stop offset="100%" :stop-color="cat.color" stop-opacity="0.35"/>
          </linearGradient>
          <!-- Dimmed gradient for pre-launch bars -->
          <linearGradient :id="'bar-grad-dim-' + categoryKey" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="cat.color" stop-opacity="0.30"/>
            <stop offset="100%" :stop-color="cat.color" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <g
          class="chart-area"
          :transform="`translate(${dimensions.margin.left}, ${dimensions.margin.top})`"
        >
          <!-- Launch divider line -->
          <line
            :x1="launchX"
            :y1="0"
            :x2="launchX"
            :y2="dimensions.innerHeight"
            :stroke="cat.color"
            stroke-width="1"
            stroke-dasharray="3,3"
            opacity="0.2"
          />

          <!-- Column bars -->
          <rect
            v-for="bar in bars"
            :key="bar.year"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="Math.max(bar.height, 0)"
            :rx="Math.min(bar.width * 0.2, 2.5)"
            :ry="Math.min(bar.width * 0.2, 2.5)"
            :fill="bar.isPreLaunch
              ? `url(#bar-grad-dim-${categoryKey})`
              : `url(#bar-grad-${categoryKey})`"
          />

          <!-- Highlight glow on the latest bar -->
          <rect
            v-if="lastBar"
            :x="lastBar.x - 1"
            :y="lastBar.y - 1"
            :width="lastBar.width + 2"
            :height="Math.max(lastBar.height + 1, 0)"
            :rx="Math.min(lastBar.width * 0.2, 2.5)"
            :fill="cat.color"
            opacity="0.12"
          />
        </g>
      </svg>
    </div>

    <!-- Expand hint on hover -->
    <div class="flex items-center justify-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <span class="text-[9px] text-vs-dim flex items-center gap-1">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 3L4 6L7 3" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        explore
      </span>
    </div>
  </button>
</template>
