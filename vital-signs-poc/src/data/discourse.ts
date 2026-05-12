/**
 * Discourse Data (Mock)
 *
 * "Discourse" represents the overall activity level in a topic area —
 * the broader ecosystem of research, media, public attention, opinion,
 * and policy activity, whether directly associated with this research
 * program or from other actors in the same space.
 *
 * Values are on an arbitrary 0–100 index (normalized internally).
 * The shape/trajectory matters more than the absolute values.
 * Discourse is by definition >= the org's direct impact.
 */

import type { CategoryKey, ClientId } from './types'

export interface DiscourseYear {
  year: number
  value: number
}

export type DiscourseData = Record<CategoryKey, DiscourseYear[]>

// ─── OI Discourse (2008–2025) ───
// OI works in economic mobility / opportunity — a topic area that has
// seen significant growth in academic and public awareness discourse,
// especially post-2016 (Opportunity Atlas launch, inequality debates).

const OI_DISCOURSE: DiscourseData = {
  // Academic: steady growth in mobility research — accelerating post-2014
  academic: [
    { year: 2008, value: 18 },
    { year: 2009, value: 20 },
    { year: 2010, value: 22 },
    { year: 2011, value: 24 },
    { year: 2012, value: 28 },
    { year: 2013, value: 32 },
    { year: 2014, value: 38 },
    { year: 2015, value: 43 },
    { year: 2016, value: 48 },
    { year: 2017, value: 55 },
    { year: 2018, value: 64 },
    { year: 2019, value: 72 },
    { year: 2020, value: 76 },
    { year: 2021, value: 80 },
    { year: 2022, value: 85 },
    { year: 2023, value: 89 },
    { year: 2024, value: 93 },
    { year: 2025, value: 96 },
  ],

  // Media: big spike around 2018–2020 (inequality in media), then plateauing
  media: [
    { year: 2008, value: 10 },
    { year: 2009, value: 12 },
    { year: 2010, value: 14 },
    { year: 2011, value: 15 },
    { year: 2012, value: 18 },
    { year: 2013, value: 22 },
    { year: 2014, value: 28 },
    { year: 2015, value: 32 },
    { year: 2016, value: 40 },
    { year: 2017, value: 52 },
    { year: 2018, value: 68 },
    { year: 2019, value: 78 },
    { year: 2020, value: 85 },
    { year: 2021, value: 80 },
    { year: 2022, value: 74 },
    { year: 2023, value: 70 },
    { year: 2024, value: 66 },
    { year: 2025, value: 63 },
  ],

  // Awareness: rapid growth — inequality/mobility became a defining topic
  awareness: [
    { year: 2008, value: 8 },
    { year: 2009, value: 10 },
    { year: 2010, value: 12 },
    { year: 2011, value: 14 },
    { year: 2012, value: 18 },
    { year: 2013, value: 24 },
    { year: 2014, value: 30 },
    { year: 2015, value: 36 },
    { year: 2016, value: 45 },
    { year: 2017, value: 56 },
    { year: 2018, value: 70 },
    { year: 2019, value: 80 },
    { year: 2020, value: 85 },
    { year: 2021, value: 88 },
    { year: 2022, value: 90 },
    { year: 2023, value: 92 },
    { year: 2024, value: 94 },
    { year: 2025, value: 95 },
  ],

  // Opinion: gradual shift — public concern about inequality rising steadily
  opinion: [
    { year: 2008, value: 30 },
    { year: 2009, value: 32 },
    { year: 2010, value: 34 },
    { year: 2011, value: 38 },
    { year: 2012, value: 42 },
    { year: 2013, value: 45 },
    { year: 2014, value: 48 },
    { year: 2015, value: 52 },
    { year: 2016, value: 56 },
    { year: 2017, value: 60 },
    { year: 2018, value: 65 },
    { year: 2019, value: 70 },
    { year: 2020, value: 75 },
    { year: 2021, value: 78 },
    { year: 2022, value: 80 },
    { year: 2023, value: 82 },
    { year: 2024, value: 83 },
    { year: 2025, value: 84 },
  ],

  // Policy: strong growth — inequality policy activity surging post-2016
  policy: [
    { year: 2008, value: 12 },
    { year: 2009, value: 14 },
    { year: 2010, value: 16 },
    { year: 2011, value: 18 },
    { year: 2012, value: 22 },
    { year: 2013, value: 26 },
    { year: 2014, value: 32 },
    { year: 2015, value: 38 },
    { year: 2016, value: 48 },
    { year: 2017, value: 58 },
    { year: 2018, value: 70 },
    { year: 2019, value: 80 },
    { year: 2020, value: 88 },
    { year: 2021, value: 82 },
    { year: 2022, value: 78 },
    { year: 2023, value: 75 },
    { year: 2024, value: 72 },
    { year: 2025, value: 70 },
  ],
}

// ─── KU Discourse (2009–2025) ───
// KU works in a more stable/mature topic area — discourse is flatter,
// with moderate growth in some areas and stability in others.

const KU_DISCOURSE: DiscourseData = {
  // Academic: mature field — steady but not accelerating
  academic: [
    { year: 2009, value: 40 },
    { year: 2010, value: 42 },
    { year: 2011, value: 43 },
    { year: 2012, value: 45 },
    { year: 2013, value: 47 },
    { year: 2014, value: 48 },
    { year: 2015, value: 50 },
    { year: 2016, value: 52 },
    { year: 2017, value: 54 },
    { year: 2018, value: 55 },
    { year: 2019, value: 57 },
    { year: 2020, value: 56 },
    { year: 2021, value: 58 },
    { year: 2022, value: 59 },
    { year: 2023, value: 60 },
    { year: 2024, value: 61 },
    { year: 2025, value: 62 },
  ],

  // Media: relatively flat — not a hot media topic
  media: [
    { year: 2009, value: 25 },
    { year: 2010, value: 26 },
    { year: 2011, value: 27 },
    { year: 2012, value: 28 },
    { year: 2013, value: 30 },
    { year: 2014, value: 32 },
    { year: 2015, value: 33 },
    { year: 2016, value: 34 },
    { year: 2017, value: 35 },
    { year: 2018, value: 36 },
    { year: 2019, value: 38 },
    { year: 2020, value: 42 },
    { year: 2021, value: 40 },
    { year: 2022, value: 38 },
    { year: 2023, value: 37 },
    { year: 2024, value: 36 },
    { year: 2025, value: 35 },
  ],

  // Awareness: moderate growth — some increased public interest
  awareness: [
    { year: 2009, value: 20 },
    { year: 2010, value: 22 },
    { year: 2011, value: 23 },
    { year: 2012, value: 25 },
    { year: 2013, value: 28 },
    { year: 2014, value: 30 },
    { year: 2015, value: 33 },
    { year: 2016, value: 36 },
    { year: 2017, value: 40 },
    { year: 2018, value: 44 },
    { year: 2019, value: 48 },
    { year: 2020, value: 50 },
    { year: 2021, value: 52 },
    { year: 2022, value: 54 },
    { year: 2023, value: 55 },
    { year: 2024, value: 56 },
    { year: 2025, value: 57 },
  ],

  // Opinion: very stable — well-established public views
  opinion: [
    { year: 2009, value: 45 },
    { year: 2010, value: 46 },
    { year: 2011, value: 46 },
    { year: 2012, value: 47 },
    { year: 2013, value: 48 },
    { year: 2014, value: 48 },
    { year: 2015, value: 49 },
    { year: 2016, value: 50 },
    { year: 2017, value: 50 },
    { year: 2018, value: 51 },
    { year: 2019, value: 52 },
    { year: 2020, value: 53 },
    { year: 2021, value: 53 },
    { year: 2022, value: 54 },
    { year: 2023, value: 54 },
    { year: 2024, value: 55 },
    { year: 2025, value: 55 },
  ],

  // Policy: this is where KU's topic area is growing — new policy attention
  policy: [
    { year: 2009, value: 15 },
    { year: 2010, value: 18 },
    { year: 2011, value: 20 },
    { year: 2012, value: 24 },
    { year: 2013, value: 28 },
    { year: 2014, value: 34 },
    { year: 2015, value: 40 },
    { year: 2016, value: 48 },
    { year: 2017, value: 56 },
    { year: 2018, value: 64 },
    { year: 2019, value: 72 },
    { year: 2020, value: 78 },
    { year: 2021, value: 82 },
    { year: 2022, value: 85 },
    { year: 2023, value: 88 },
    { year: 2024, value: 90 },
    { year: 2025, value: 92 },
  ],
}

export function getDiscourseData(clientId: ClientId): DiscourseData {
  return clientId === 'oi' ? OI_DISCOURSE : KU_DISCOURSE
}
