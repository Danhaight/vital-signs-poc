// === Impact Tracker — Type Definitions ===

export type ClientId = 'oi' | 'ku'
export type CategoryKey = 'academic' | 'media' | 'awareness' | 'opinion' | 'policy'
export type TrendDirection = 'strengthening' | 'stable' | 'weakening'
export type OpinionQuality = 'full' | 'partial' | 'stimson-only' | 'missing'

export interface ClientConfig {
  id: ClientId
  name: string
  toolName: string
  launchYear: number
  baselineStart: number
  baselineEnd: number
  construct: string
  yearRange: [number, number]
}

/** Raw data as extracted from spreadsheets — one row per year */
export interface OIRawYear {
  year: number
  pubsCum: number
  citesCum: number
  intCum: number
  lecCum: number
  mediaIdx: number
  gOA: number
  gOI: number
  gEM: number
  helppoor: number | null
  eqwlth: number | null
  anes: number | null
  stimson: number | null
  opinionZ: number | null
}

export interface KURawYear {
  year: number
  pubsCum: number
  citesCum: number
  intCum: number
  lecCum: number
  mediaIdx: number
  gTrends: number
  fehome: number | null
  natchld: number | null
  stimson: number | null
  opinionZ: number | null
  dataQuality: string | null
}

export interface PolicySummaryYear {
  year: number
  oiCore: number
  oiOther: number
  oiTotal: number
  kuCore: number
  kuOther: number
  kuTotal: number
  oiCoreOrgs: number
  kuCoreOrgs: number
  // Government (incl. Legislative & Judicial) vs NGO/Think Tank/IGO
  oiGov: number
  oiNgo: number
  kuGov: number
  kuNgo: number
}

/** Computed scores per year (0–100 for each category) */
export interface ComputedYear {
  year: number
  academic: number
  media: number
  awareness: number
  opinion: number
  policy: number
  composite: number
  // Weighted contributions (absolute points contributed to composite)
  contributions: Record<CategoryKey, number>
  // Primary driver: category contributing most to the composite this year
  primaryDriver: CategoryKey
  // Flags
  opinionCarriedForward: boolean
  opinionQuality: OpinionQuality
}

/** Full processed dataset for one client */
export interface ClientData {
  config: ClientConfig
  years: ComputedYear[]
  trends: Record<CategoryKey | 'composite', TrendDirection>
  // Raw data preserved for L3 drill-down
  rawOI?: OIRawYear[]
  rawKU?: KURawYear[]
  // Policy citation counts by year (from Sage)
  policySummary: { year: number; core: number; other: number; total: number; coreOrgs: number; gov: number; ngo: number }[]
}

/** Policy citation record for L3 detail view */
export interface PolicyCitation {
  researcher: string
  client: string
  topic: string
  coreTopic: boolean
  citedPaperTitle: string
  citedPaperYear: number
  citedPaperDOI: string
  policyDocTitle: string
  policyDocYear: number
  policyDocType: string
  citingOrg: string
  country: string
  orgType: string
  url: string
}

/** Category metadata */
export interface CategoryMeta {
  key: CategoryKey
  label: string
  weight: number
  color: string
  description: string
  sources: string[]
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: 'academic',
    label: 'Academic Foundation',
    weight: 0.15,
    color: '#7B9EBD',
    description: 'Peer-reviewed publications and scholarly citations',
    sources: ['Google Scholar', 'Semantic Scholar'],
  },
  {
    key: 'media',
    label: 'Media Amplification',
    weight: 0.15,
    color: '#C4956A',
    description: 'Research team media appearances and public lectures',
    sources: ['Client records', 'Media monitoring'],
  },
  {
    key: 'awareness',
    label: 'Public Awareness',
    weight: 0.15,
    color: '#8DB580',
    description: 'Public search interest in the research topic',
    sources: ['Google Trends'],
  },
  {
    key: 'opinion',
    label: 'Opinion & Receptivity',
    weight: 0.20,
    color: '#B8A0CC',
    description: 'Public and elite sentiment toward policy action',
    sources: ['GSS', 'ANES', 'Stimson Policy Mood'],
  },
  {
    key: 'policy',
    label: 'Policy Adoption',
    weight: 0.35,
    color: '#D4A85C',
    description: 'Formal policy citations of the research',
    sources: ['Overton (Sage)', 'Congressional records'],
  },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c])
) as Record<CategoryKey, CategoryMeta>
