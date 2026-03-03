import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export interface ChartDimensions {
  width: number
  height: number
  innerWidth: number
  innerHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
}

export function useChartDimensions(
  containerRef: Ref<HTMLElement | null>,
  margin = { top: 32, right: 24, bottom: 40, left: 48 },
  aspectRatio?: number,
) {
  const dimensions = ref<ChartDimensions>({
    width: 0,
    height: 0,
    innerWidth: 0,
    innerHeight: 0,
    margin,
  })

  let observer: ResizeObserver | null = null

  const update = () => {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    const w = rect.width
    const h = aspectRatio ? w * aspectRatio : rect.height
    dimensions.value = {
      width: w,
      height: h,
      innerWidth: Math.max(0, w - margin.left - margin.right),
      innerHeight: Math.max(0, h - margin.top - margin.bottom),
      margin,
    }
  }

  onMounted(() => {
    if (!containerRef.value) return
    observer = new ResizeObserver(update)
    observer.observe(containerRef.value)
    update()
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { dimensions }
}
