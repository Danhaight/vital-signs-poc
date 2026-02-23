/** Format a score to one decimal place */
export function fmtScore(n: number): string {
  return n.toFixed(1)
}

/** Format a year as a 4-digit string */
export function fmtYear(n: number): string {
  return String(n)
}

/** Format a score with units */
export function fmtScoreLabel(n: number): string {
  return `${n.toFixed(1)}/100`
}
