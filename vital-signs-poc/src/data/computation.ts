/**
 * Impact Tracker Computation Pipeline
 *
 * All five categories now produce FLOW (point-in-time) scores at L2:
 * - Academic & Media use annual marginal values (new pubs/cites/interviews this year)
 * - Awareness uses Google Trends (already point-in-time)
 * - Opinion uses z-score rescaled (already point-in-time)
 * - Policy uses annual citation counts (already point-in-time)
 *
 * Cumulative (stock) data is preserved in raw arrays for L3 drill-down.
 */

import type {
  ClientId,
  ClientConfig,
  ComputedYear,
  ClientData,
  CategoryKey,
  TrendDirection,
  OpinionQuality,
} from './types'
import { OI_RAW, OI_CONFIG } from './oi'
import { KU_RAW, KU_CONFIG } from './ku'
import { POLICY_SUMMARY } from './policy-summary'

// === Category weights (Policy Impact archetype) ===
const WEIGHTS: Record<CategoryKey, number> = {
  academic: 0.15,
  media: 0.15,
  awareness: 0.15,
  opinion: 0.20,
  policy: 0.35,
}

// === Sub-component weights ===
const W_ACADEMIC = { citations: 0.70, publications: 0.30 }
const W_MEDIA = { interviews: 0.65, lectures: 0.35 }

// === Trend detection threshold (on 0–100 scale) ===
const TREND_THRESHOLD = 5

// ─────────────────────────────────────────────
// Normalization helpers
// ─────────────────────────────────────────────

/** Max-observed normalization → 0–100 */
function maxNorm(value: number, maxVal: number): number {
  if (maxVal <= 0) return 0
  return (value / maxVal) * 100
}

/** Min-max rescale of z-scores → 0–100 */
function minMaxRescale(z: number, minZ: number, maxZ: number): number {
  if (maxZ === minZ) return 50
  return ((z - minZ) / (maxZ - minZ)) * 100
}

/** Compute annual marginal (delta) from cumulative series.
 *  Clamps to 0 — cumulative data may contain corrections (non-monotonic),
 *  but negative "new publications" etc. are meaningless for scoring. */
function annualDelta(values: number[]): number[] {
  return values.map((v, i) => (i === 0 ? v : Math.max(0, v - values[i - 1]!)))
}

/** Compute contributions and primary driver */
function computeContributions(scores: Record<CategoryKey, number>): {
  contributions: Record<CategoryKey, number>
  primaryDriver: CategoryKey
} {
  const contributions = {} as Record<CategoryKey, number>
  let maxContrib = -1
  let driver: CategoryKey = 'policy'

  for (const key of Object.keys(WEIGHTS) as CategoryKey[]) {
    const c = WEIGHTS[key] * scores[key]
    contributions[key] = round2(c)
    if (c > maxContrib) {
      maxContrib = c
      driver = key
    }
  }

  return { contributions, primaryDriver: driver }
}

// ─────────────────────────────────────────────
// OI computation
// ─────────────────────────────────────────────

function computeOI(): ComputedYear[] {
  const raw = OI_RAW
  const policyByYear = getPolicyByYear('oi')

  // Compute annual marginals from cumulative data
  const pubsAnnual = annualDelta(raw.map(d => d.pubsCum))
  const citesAnnual = annualDelta(raw.map(d => d.citesCum))
  const intAnnual = annualDelta(raw.map(d => d.intCum))
  const lecAnnual = annualDelta(raw.map(d => d.lecCum))

  // Find maxes of ANNUAL values for max-observed normalization
  const maxPubsA = Math.max(...pubsAnnual)
  const maxCitesA = Math.max(...citesAnnual)
  const maxIntA = Math.max(...intAnnual)
  const maxLecA = Math.max(...lecAnnual)

  // Policy: max of annual totals
  const policyTotals = raw.map(d => policyByYear.get(d.year)?.total ?? 0)
  const maxPolicy = Math.max(...policyTotals)

  // Opinion: collect valid z-scores for min-max bounds
  const validZ = raw.filter(d => d.opinionZ !== null).map(d => d.opinionZ!)
  const minZ = Math.min(...validZ)
  const maxZ = Math.max(...validZ)

  // Carry-forward opinion z-scores
  let lastOpinionZ: number | null = null
  const opinionFilled: { z: number; carried: boolean; quality: OpinionQuality }[] = raw.map(d => {
    if (d.opinionZ !== null) {
      lastOpinionZ = d.opinionZ
      const hasGSS = d.helppoor !== null
      const hasANES = d.anes !== null
      const hasStimson = d.stimson !== null
      let quality: OpinionQuality = 'missing'
      if (hasGSS && hasStimson) quality = 'full'
      else if (hasStimson && !hasGSS) quality = 'stimson-only'
      else if (hasGSS || hasANES) quality = 'partial'
      return { z: d.opinionZ, carried: false, quality }
    } else if (lastOpinionZ !== null) {
      return { z: lastOpinionZ, carried: true, quality: 'missing' as OpinionQuality }
    } else {
      return { z: 0, carried: true, quality: 'missing' as OpinionQuality }
    }
  })

  return raw.map((d, i) => {
    // Academic: ANNUAL new citations 70% + new publications 30%
    const academic =
      W_ACADEMIC.citations * maxNorm(citesAnnual[i]!, maxCitesA) +
      W_ACADEMIC.publications * maxNorm(pubsAnnual[i]!, maxPubsA)

    // Media: ANNUAL new interviews 65% + new lectures 35%
    const media =
      (maxIntA > 0 ? W_MEDIA.interviews * maxNorm(intAnnual[i]!, maxIntA) : 0) +
      (maxLecA > 0 ? W_MEDIA.lectures * maxNorm(lecAnnual[i]!, maxLecA) : 0)

    // Awareness: 3 Google Trends tiers, equal weight (already flow)
    const awareness = (d.gOA + d.gOI + d.gEM) / 3

    // Opinion: z-score rescaled to 0–100 (already flow)
    const opinion = minMaxRescale(opinionFilled[i]!.z, minZ, maxZ)

    // Policy: annual Sage citation totals (already flow)
    const policyAnnual = policyByYear.get(d.year)?.total ?? 0
    const policy = maxNorm(policyAnnual, maxPolicy)

    // Clamp all category scores to [0, 100] before compositing
    const cAcademic = clamp100(academic)
    const cMedia = clamp100(media)
    const cAwareness = clamp100(awareness)
    const cOpinion = clamp100(opinion)
    const cPolicy = clamp100(policy)

    const scores: Record<CategoryKey, number> = {
      academic: round2(cAcademic),
      media: round2(cMedia),
      awareness: round2(cAwareness),
      opinion: round2(cOpinion),
      policy: round2(cPolicy),
    }

    // Composite (from clamped values)
    const composite =
      WEIGHTS.academic * cAcademic +
      WEIGHTS.media * cMedia +
      WEIGHTS.awareness * cAwareness +
      WEIGHTS.opinion * cOpinion +
      WEIGHTS.policy * cPolicy

    const { contributions, primaryDriver } = computeContributions(scores)

    return {
      year: d.year,
      ...scores,
      composite: round2(composite),
      contributions,
      primaryDriver,
      opinionCarriedForward: opinionFilled[i]!.carried,
      opinionQuality: opinionFilled[i]!.quality,
    }
  })
}

// ─────────────────────────────────────────────
// KU computation
// ─────────────────────────────────────────────

function computeKU(): ComputedYear[] {
  const raw = KU_RAW
  const policyByYear = getPolicyByYear('ku')

  // Compute annual marginals
  const pubsAnnual = annualDelta(raw.map(d => d.pubsCum))
  const citesAnnual = annualDelta(raw.map(d => d.citesCum))
  const intAnnual = annualDelta(raw.map(d => d.intCum))
  const lecAnnual = annualDelta(raw.map(d => d.lecCum))

  const maxPubsA = Math.max(...pubsAnnual)
  const maxCitesA = Math.max(...citesAnnual)
  const maxIntA = Math.max(...intAnnual)
  const maxLecA = Math.max(...lecAnnual)

  const policyTotals = raw.map(d => policyByYear.get(d.year)?.total ?? 0)
  const maxPolicy = Math.max(...policyTotals)

  const validZ = raw.filter(d => d.opinionZ !== null).map(d => d.opinionZ!)
  const minZ = Math.min(...validZ)
  const maxZ = Math.max(...validZ)

  let lastOpinionZ: number | null = null
  const opinionFilled: { z: number; carried: boolean; quality: OpinionQuality }[] = raw.map(d => {
    if (d.opinionZ !== null) {
      lastOpinionZ = d.opinionZ
      const dq = d.dataQuality?.toLowerCase() ?? ''
      let quality: OpinionQuality = 'missing'
      if (dq.includes('full')) quality = 'full'
      else if (dq.includes('partial')) quality = 'partial'
      else if (dq.includes('stimson')) quality = 'stimson-only'
      return { z: d.opinionZ, carried: false, quality }
    } else if (lastOpinionZ !== null) {
      return { z: lastOpinionZ, carried: true, quality: 'missing' as OpinionQuality }
    } else {
      return { z: 0, carried: true, quality: 'missing' as OpinionQuality }
    }
  })

  return raw.map((d, i) => {
    // Academic: ANNUAL marginals
    const academic =
      W_ACADEMIC.citations * maxNorm(citesAnnual[i]!, maxCitesA) +
      W_ACADEMIC.publications * maxNorm(pubsAnnual[i]!, maxPubsA)

    // Media: ANNUAL marginals
    const media =
      (maxIntA > 0 ? W_MEDIA.interviews * maxNorm(intAnnual[i]!, maxIntA) : 0) +
      (maxLecA > 0 ? W_MEDIA.lectures * maxNorm(lecAnnual[i]!, maxLecA) : 0)

    // Awareness: single Google Trends (already 0–100 flow)
    const awareness = d.gTrends

    const opinion = minMaxRescale(opinionFilled[i]!.z, minZ, maxZ)

    const policyAnnualVal = policyByYear.get(d.year)?.total ?? 0
    const policy = maxPolicy > 0 ? maxNorm(policyAnnualVal, maxPolicy) : 0

    // Clamp all category scores to [0, 100] before compositing
    const cAcademic = clamp100(academic)
    const cMedia = clamp100(media)
    const cAwareness = clamp100(awareness)
    const cOpinion = clamp100(opinion)
    const cPolicy = clamp100(policy)

    const scores: Record<CategoryKey, number> = {
      academic: round2(cAcademic),
      media: round2(cMedia),
      awareness: round2(cAwareness),
      opinion: round2(cOpinion),
      policy: round2(cPolicy),
    }

    const composite =
      WEIGHTS.academic * cAcademic +
      WEIGHTS.media * cMedia +
      WEIGHTS.awareness * cAwareness +
      WEIGHTS.opinion * cOpinion +
      WEIGHTS.policy * cPolicy

    const { contributions, primaryDriver } = computeContributions(scores)

    return {
      year: d.year,
      ...scores,
      composite: round2(composite),
      contributions,
      primaryDriver,
      opinionCarriedForward: opinionFilled[i]!.carried,
      opinionQuality: opinionFilled[i]!.quality,
    }
  })
}

// ─────────────────────────────────────────────
// Trend detection
// ─────────────────────────────────────────────

function detectTrend(values: number[]): TrendDirection {
  if (values.length < 4) return 'stable'
  const recent = (values[values.length - 1]! + values[values.length - 2]!) / 2
  const prior = (values[values.length - 3]! + values[values.length - 4]!) / 2
  const delta = recent - prior
  if (delta > TREND_THRESHOLD) return 'strengthening'
  if (delta < -TREND_THRESHOLD) return 'weakening'
  return 'stable'
}

function computeTrends(years: ComputedYear[]): Record<CategoryKey | 'composite', TrendDirection> {
  return {
    academic: detectTrend(years.map(y => y.academic)),
    media: detectTrend(years.map(y => y.media)),
    awareness: detectTrend(years.map(y => y.awareness)),
    opinion: detectTrend(years.map(y => y.opinion)),
    policy: detectTrend(years.map(y => y.policy)),
    composite: detectTrend(years.map(y => y.composite)),
  }
}

// ─────────────────────────────────────────────
// Policy summary helper
// ─────────────────────────────────────────────

function getPolicyByYear(client: ClientId): Map<number, { core: number; other: number; total: number; coreOrgs: number; gov: number; ngo: number }> {
  const map = new Map<number, { core: number; other: number; total: number; coreOrgs: number; gov: number; ngo: number }>()
  for (const row of POLICY_SUMMARY) {
    if (client === 'oi') {
      map.set(row.year, { core: row.oiCore, other: row.oiOther, total: row.oiTotal, coreOrgs: row.oiCoreOrgs, gov: row.oiGov, ngo: row.oiNgo })
    } else {
      map.set(row.year, { core: row.kuCore, other: row.kuOther, total: row.kuTotal, coreOrgs: row.kuCoreOrgs, gov: row.kuGov, ngo: row.kuNgo })
    }
  }
  return map
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Clamp a score to the valid 0–100 range */
function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export function computeClientData(clientId: ClientId): ClientData {
  const config: ClientConfig = clientId === 'oi' ? OI_CONFIG : KU_CONFIG
  const years = clientId === 'oi' ? computeOI() : computeKU()
  const trends = computeTrends(years)
  const policyMap = getPolicyByYear(clientId)

  const policySummary = years.map(y => {
    const p = policyMap.get(y.year)
    return {
      year: y.year,
      core: p?.core ?? 0,
      other: p?.other ?? 0,
      total: p?.total ?? 0,
      coreOrgs: p?.coreOrgs ?? 0,
      gov: p?.gov ?? 0,
      ngo: p?.ngo ?? 0,
    }
  })

  return {
    config,
    years,
    trends,
    policySummary,
    ...(clientId === 'oi' ? { rawOI: OI_RAW } : { rawKU: KU_RAW }),
  }
}
