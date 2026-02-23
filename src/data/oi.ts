import type { OIRawYear, ClientConfig } from './types'

export const OI_CONFIG: ClientConfig = {
  id: 'oi',
  name: 'Opportunity Insights',
  toolName: 'Opportunity Atlas',
  launchYear: 2018,
  baselineStart: 2008,
  baselineEnd: 2012,
  construct: 'Opportunity should be equalized; the government has a role in ensuring economic mobility.',
  yearRange: [2008, 2025],
}

export const OI_RAW: OIRawYear[] = [
  { year: 2008, pubsCum: 31, citesCum: 213, intCum: 0, lecCum: 0, mediaIdx: 0.0, gOA: 0, gOI: 0, gEM: 0, helppoor: 55.50, eqwlth: 57.50, anes: 59.70, stimson: 77.80, opinionZ: -0.50 },
  { year: 2009, pubsCum: 39, citesCum: 540, intCum: 0, lecCum: 0, mediaIdx: 0.0, gOA: 0, gOI: 0, gEM: 0, helppoor: null, eqwlth: null, anes: null, stimson: 66.70, opinionZ: 0.10 },
  { year: 2010, pubsCum: 48, citesCum: 965, intCum: 0, lecCum: 0, mediaIdx: 0.0, gOA: 0, gOI: 0, gEM: 0, helppoor: 57.00, eqwlth: 59.20, anes: null, stimson: 49.60, opinionZ: -0.07 },
  { year: 2011, pubsCum: 57, citesCum: 1617, intCum: 0, lecCum: 0, mediaIdx: 0.0, gOA: 0, gOI: 0, gEM: 0, helppoor: null, eqwlth: null, anes: null, stimson: 44.40, opinionZ: -0.23 },
  { year: 2012, pubsCum: 66, citesCum: 2467, intCum: 1, lecCum: 0, mediaIdx: 0.7, gOA: 0, gOI: 0, gEM: 22, helppoor: 58.00, eqwlth: 60.00, anes: 60.30, stimson: 61.50, opinionZ: 0.70 },
  { year: 2013, pubsCum: 80, citesCum: 3540, intCum: 1, lecCum: 0, mediaIdx: 0.7, gOA: 3, gOI: 0, gEM: 26, helppoor: null, eqwlth: null, anes: null, stimson: 51.90, opinionZ: -0.12 },
  { year: 2014, pubsCum: 98, citesCum: 5196, intCum: 3, lecCum: 0, mediaIdx: 1.9, gOA: 0, gOI: 12, gEM: 29, helppoor: 56.30, eqwlth: 58.00, anes: null, stimson: 57.00, opinionZ: -0.27 },
  { year: 2015, pubsCum: 104, citesCum: 7213, intCum: 5, lecCum: 1, mediaIdx: 3.6, gOA: 0, gOI: 0, gEM: 32, helppoor: null, eqwlth: null, anes: null, stimson: 63.00, opinionZ: 0.04 },
  { year: 2016, pubsCum: 122, citesCum: 10068, intCum: 5, lecCum: 3, mediaIdx: 4.3, gOA: 0, gOI: 13, gEM: 25, helppoor: 57.50, eqwlth: 58.70, anes: 58.00, stimson: 74.10, opinionZ: -0.62 },
  { year: 2017, pubsCum: 129, citesCum: 13490, intCum: 7, lecCum: 4, mediaIdx: 6.0, gOA: 0, gOI: 0, gEM: 30, helppoor: null, eqwlth: null, anes: null, stimson: 91.10, opinionZ: 0.47 },
  { year: 2018, pubsCum: 142, citesCum: 17603, intCum: 7, lecCum: 4, mediaIdx: 6.0, gOA: 100, gOI: 24, gEM: 33, helppoor: 58.80, eqwlth: 59.70, anes: null, stimson: 94.10, opinionZ: 1.23 },
  { year: 2019, pubsCum: 156, citesCum: 22217, intCum: 9, lecCum: 6, mediaIdx: 8.0, gOA: 18, gOI: 38, gEM: 32, helppoor: null, eqwlth: null, anes: null, stimson: 81.50, opinionZ: 0.32 },
  { year: 2020, pubsCum: 172, citesCum: 27759, intCum: 11, lecCum: 7, mediaIdx: 9.6, gOA: 8, gOI: 39, gEM: 100, helppoor: null, eqwlth: null, anes: 61.70, stimson: 100.00, opinionZ: 1.48 },
  { year: 2021, pubsCum: 175, citesCum: 33829, intCum: 12, lecCum: 9, mediaIdx: 10.9, gOA: 15, gOI: 30, gEM: 46, helppoor: 61.30, eqwlth: 61.70, anes: null, stimson: 40.70, opinionZ: 1.38 },
  { year: 2022, pubsCum: 181, citesCum: 40320, intCum: 14, lecCum: 10, mediaIdx: 12.6, gOA: 16, gOI: 26, gEM: 50, helppoor: 60.50, eqwlth: 60.80, anes: null, stimson: 29.60, opinionZ: 0.86 },
  { year: 2023, pubsCum: 183, citesCum: 46915, intCum: 16, lecCum: 13, mediaIdx: 14.9, gOA: 7, gOI: 44, gEM: 55, helppoor: null, eqwlth: null, anes: null, stimson: 39.30, opinionZ: -0.31 },
  { year: 2024, pubsCum: 186, citesCum: 54011, intCum: 16, lecCum: 13, mediaIdx: 14.9, gOA: 7, gOI: 53, gEM: 57, helppoor: null, eqwlth: null, anes: 60.80, stimson: 42.20, opinionZ: 0.18 },
  { year: 2025, pubsCum: 188, citesCum: 60974, intCum: 16, lecCum: 17, mediaIdx: 16.4, gOA: 17, gOI: 100, gEM: 57, helppoor: null, eqwlth: null, anes: null, stimson: null, opinionZ: null },
]
