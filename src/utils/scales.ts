import * as d3 from 'd3'
import type { ComputedYear } from '../data/types'

/** Time scale for x-axis from year range */
export function createTimeScale(
  years: ComputedYear[],
  width: number,
) {
  return d3
    .scaleLinear()
    .domain([years[0]!.year, years[years.length - 1]!.year])
    .range([0, width])
}

/** Standard 0–100 score scale for y-axis */
export function createScoreScale(height: number) {
  return d3.scaleLinear().domain([0, 100]).range([height, 0])
}

/** Line generator for score data */
export function createLineGenerator(
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  accessor: (d: ComputedYear) => number,
) {
  return d3
    .line<ComputedYear>()
    .x(d => xScale(d.year))
    .y(d => yScale(accessor(d)))
    .curve(d3.curveMonotoneX)
}

/** Area generator for fills beneath lines */
export function createAreaGenerator(
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  accessor: (d: ComputedYear) => number,
  height: number,
) {
  return d3
    .area<ComputedYear>()
    .x(d => xScale(d.year))
    .y0(height)
    .y1(d => yScale(accessor(d)))
    .curve(d3.curveMonotoneX)
}
