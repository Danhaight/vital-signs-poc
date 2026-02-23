import type { KURawYear, ClientConfig } from './types'

export const KU_CONFIG: ClientConfig = {
  id: 'ku',
  name: 'KU — The Care Board',
  toolName: 'The Care Board',
  launchYear: 2025,
  baselineStart: 2020,
  baselineEnd: 2021,
  construct: 'Unpaid care is a significant part of the economy; government policy should recognize and support it.',
  yearRange: [2009, 2025],
}

export const KU_RAW: KURawYear[] = [
  { year: 2009, pubsCum: 0, citesCum: 7, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: null, natchld: null, stimson: 66.70, opinionZ: null, dataQuality: 'Stimson only' },
  { year: 2010, pubsCum: 2, citesCum: 18, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: 75.00, natchld: null, stimson: 49.60, opinionZ: 0.06, dataQuality: 'Partial' },
  { year: 2012, pubsCum: 3, citesCum: 34, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: 74.00, natchld: 57.60, stimson: 61.50, opinionZ: -0.23, dataQuality: 'Full' },
  { year: 2013, pubsCum: 4, citesCum: 45, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: null, natchld: null, stimson: 51.90, opinionZ: -0.13, dataQuality: 'Stimson only' },
  { year: 2014, pubsCum: 5, citesCum: 69, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: 74.30, natchld: 60.00, stimson: 57.00, opinionZ: -0.03, dataQuality: 'Full' },
  { year: 2015, pubsCum: 5, citesCum: 96, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: null, natchld: null, stimson: 63.00, opinionZ: -0.05, dataQuality: 'Stimson only' },
  { year: 2016, pubsCum: 8, citesCum: 128, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: 74.70, natchld: 65.20, stimson: 74.10, opinionZ: 0.41, dataQuality: 'Full' },
  { year: 2017, pubsCum: 11, citesCum: 166, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: null, natchld: null, stimson: 91.10, opinionZ: 0.15, dataQuality: 'Stimson only' },
  { year: 2018, pubsCum: 12, citesCum: 244, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: 75.30, natchld: 69.60, stimson: 94.10, opinionZ: 0.78, dataQuality: 'Full' },
  { year: 2019, pubsCum: 15, citesCum: 331, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: null, natchld: null, stimson: 81.50, opinionZ: 0.08, dataQuality: 'Stimson only' },
  { year: 2020, pubsCum: 21, citesCum: 448, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: null, natchld: null, stimson: 100.00, opinionZ: 0.21, dataQuality: 'Stimson only' },
  { year: 2021, pubsCum: 23, citesCum: 630, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: 82.00, natchld: 78.30, stimson: 40.70, opinionZ: 0.97, dataQuality: 'Full' },
  { year: 2022, pubsCum: 24, citesCum: 834, intCum: 0, lecCum: 0, mediaIdx: 0.0, gTrends: 0, fehome: 81.00, natchld: 73.90, stimson: 29.60, opinionZ: 0.67, dataQuality: 'Full' },
  { year: 2023, pubsCum: 30, citesCum: 1039, intCum: 10, lecCum: 2, mediaIdx: 7.2, gTrends: 42, fehome: null, natchld: null, stimson: 39.30, opinionZ: -0.22, dataQuality: 'Stimson only' },
  { year: 2024, pubsCum: 30, citesCum: 1224, intCum: 1, lecCum: 2, mediaIdx: 1.4, gTrends: 50, fehome: null, natchld: null, stimson: 42.20, opinionZ: -0.20, dataQuality: 'Stimson only' },
  { year: 2025, pubsCum: 35, citesCum: 1393, intCum: 4, lecCum: 4, mediaIdx: 4.0, gTrends: 100, fehome: null, natchld: null, stimson: null, opinionZ: null, dataQuality: null },
]
