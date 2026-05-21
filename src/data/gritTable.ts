// Соответствие гритностей по стандартам FEPA-F, JIS, ГОСТ 9206

export interface GritRow {
  fepa: number
  jis: number
  gost: string    // формат МК_VALUES: 'X/Y'
  microns: number // средний размер зерна (мкм)
}

export const GRIT_TABLE: GritRow[] = [
  { microns: 275,  fepa: 60,   jis: 60,    gost: '315/250' },
  { microns: 230,  fepa: 70,   jis: 70,    gost: '250/200' },
  { microns: 195,  fepa: 80,   jis: 80,    gost: '200/160' },
  { microns: 165,  fepa: 90,   jis: 90,    gost: '200/160' },
  { microns: 135,  fepa: 100,  jis: 100,   gost: '160/125' },
  { microns: 115,  fepa: 120,  jis: 120,   gost: '125/100' },
  { microns: 95,   fepa: 150,  jis: 150,   gost: '100/80'  },
  { microns: 80,   fepa: 180,  jis: 180,   gost: '80/63'   },
  { microns: 70,   fepa: 220,  jis: 220,   gost: '80/63'   },
  { microns: 60,   fepa: 220,  jis: 240,   gost: '63/50'   },
  { microns: 55,   fepa: 230,  jis: 240,   gost: '63/50'   },
  { microns: 50,   fepa: 230,  jis: 280,   gost: '60/40'   },
  { microns: 45,   fepa: 240,  jis: 280,   gost: '60/40'   },
  { microns: 42,   fepa: 240,  jis: 320,   gost: '50/40'   },
  { microns: 40,   fepa: 240,  jis: 320,   gost: '50/40'   },
  { microns: 37,   fepa: 280,  jis: 320,   gost: '40/28'   },
  { microns: 35,   fepa: 280,  jis: 360,   gost: '40/28'   },
  { microns: 30,   fepa: 320,  jis: 400,   gost: '40/28'   },
  { microns: 26,   fepa: 320,  jis: 500,   gost: '28/20'   },
  { microns: 24,   fepa: 360,  jis: 500,   gost: '28/20'   },
  { microns: 20,   fepa: 360,  jis: 600,   gost: '28/20'   },
  { microns: 18,   fepa: 400,  jis: 700,   gost: '20/14'   },
  { microns: 14,   fepa: 400,  jis: 800,   gost: '20/14'   },
  { microns: 13,   fepa: 500,  jis: 800,   gost: '14/10'   },
  { microns: 12,   fepa: 500,  jis: 1000,  gost: '14/10'   },
  { microns: 10,   fepa: 600,  jis: 1200,  gost: '10/7'    },
  { microns: 8,    fepa: 600,  jis: 1500,  gost: '10/7'    },
  { microns: 7,    fepa: 800,  jis: 2000,  gost: '7/5'     },
  { microns: 6,    fepa: 900,  jis: 2500,  gost: '7/5'     },
  { microns: 5,    fepa: 1000, jis: 2500,  gost: '5/3'     },
  { microns: 4,    fepa: 1000, jis: 3000,  gost: '5/3'     },
  { microns: 3,    fepa: 1200, jis: 4000,  gost: '3/2'     },
  { microns: 2,    fepa: 1500, jis: 6000,  gost: '2/1'     },
  { microns: 1.5,  fepa: 2000, jis: 8000,  gost: '2/1'     },
  { microns: 1,    fepa: 3000, jis: 10000, gost: '1/0'     },
]

import type { GritSource } from '../db/db'

// ─── Хелперы для создания камней — единственное место конвертации ─────────────

export interface GritFields {
  gritFepa?: number
  gritJis?: number
  gritMicrons?: number
  gritMk?: string
  gritSource: GritSource
}

export function fromFepa(fepa: number): GritFields {
  const row = GRIT_TABLE.find(r => r.fepa === fepa)
  if (row) return { gritFepa: fepa, gritJis: row.jis, gritMicrons: row.microns, gritMk: row.gost, gritSource: 'fepa' }
  // Значение не в таблице (напр. FEPA 325, 8000) — берём мкм ближайшей строки для сортировки
  const nearest = GRIT_TABLE.reduce((b, r) => Math.abs(r.fepa - fepa) < Math.abs(b.fepa - fepa) ? r : b)
  return { gritFepa: fepa, gritMicrons: nearest.microns, gritSource: 'fepa' }
}

export function fromJis(jis: number): GritFields {
  const row = GRIT_TABLE.find(r => r.jis === jis)
  if (row) return { gritJis: jis, gritFepa: row.fepa, gritMicrons: row.microns, gritMk: row.gost, gritSource: 'jis' }
  // Значение не в таблице (напр. JIS 5000, 16000) — берём мкм ближайшей строки для сортировки
  const nearest = GRIT_TABLE.reduce((b, r) => Math.abs(r.jis - jis) < Math.abs(b.jis - jis) ? r : b)
  return { gritJis: jis, gritMicrons: nearest.microns, gritSource: 'jis' }
}

export function fromMk(mk: string): GritFields {
  const row = GRIT_TABLE.find(r => r.gost === mk)
  return { gritMk: mk, gritFepa: row?.fepa, gritJis: row?.jis, gritMicrons: row?.microns, gritSource: 'mk' }
}

export function fromMicrons(microns: number): GritFields {
  const row = GRIT_TABLE.reduce((best, r) =>
    Math.abs(r.microns - microns) < Math.abs(best.microns - microns) ? r : best
  )
  return { gritMicrons: row.microns, gritFepa: row.fepa, gritJis: row.jis, gritMk: row.gost, gritSource: 'microns' }
}

// ─── Отображение ──────────────────────────────────────────────────────────────

export type GritDisplayMode = 'native' | 'fepa' | 'jis' | 'gost'

export type StoneForDisplay = {
  gritFepa?: number
  gritJis?: number
  gritMicrons?: number
  gritMk?: string
  gritSource?: GritSource
}

export function getGritDisplay(
  stone: StoneForDisplay,
  mode: GritDisplayMode
): { mainValue: string; mainUnit: string; alts: string[] } {
  const { gritFepa, gritJis, gritMicrons, gritMk, gritSource } = stone

  const fmt = (v: string | number, u: string) => `${v} ${u}`
  const f = gritFepa    != null ? fmt(gritFepa,    'FEPA') : null
  const j = gritJis     != null ? fmt(gritJis,     'JIS')  : null
  const g = gritMk               ? fmt(gritMk,     'мк')   : null
  const m = gritMicrons != null ? fmt(gritMicrons, 'мкм')  : null

  const nativeValue =
    gritSource === 'mk'      ? (gritMk      ?? '') :
    gritSource === 'fepa'    ? String(gritFepa    ?? '') :
    gritSource === 'jis'     ? String(gritJis     ?? '') :
    gritSource === 'microns' ? String(gritMicrons ?? '') :
    // Fallback без gritSource
    gritMk ?? (gritFepa != null ? String(gritFepa) : gritJis != null ? String(gritJis) : '')
  const nativeUnit =
    gritSource === 'mk'      ? 'мк'   :
    gritSource === 'fepa'    ? 'FEPA' :
    gritSource === 'jis'     ? 'JIS'  :
    gritSource === 'microns' ? 'мкм'  :
    gritMk ? 'мк' : gritFepa != null ? 'FEPA' : gritJis != null ? 'JIS' : ''

  if (mode === 'native') {
    const alts = [
      gritSource !== 'fepa'    ? f : null,
      gritSource !== 'jis'     ? j : null,
      gritSource !== 'mk'      ? g : null,
      gritSource !== 'microns' ? m : null,
    ].filter((x): x is string => x !== null)
    return { mainValue: nativeValue, mainUnit: nativeUnit, alts }
  }

  if (mode === 'fepa') {
    if (gritFepa == null) return { mainValue: nativeValue, mainUnit: nativeUnit, alts: [] }
    return { mainValue: String(gritFepa), mainUnit: 'FEPA', alts: [j, g].filter((x): x is string => x !== null) }
  }
  if (mode === 'jis') {
    if (gritJis == null) return { mainValue: nativeValue, mainUnit: nativeUnit, alts: [] }
    return { mainValue: String(gritJis), mainUnit: 'JIS', alts: [f, g].filter((x): x is string => x !== null) }
  }
  // mode === 'gost'
  if (!gritMk) return { mainValue: nativeValue, mainUnit: nativeUnit, alts: [] }
  return { mainValue: gritMk, mainUnit: 'мк', alts: [f, j].filter((x): x is string => x !== null) }
}

export function getGritSortValue(stone: StoneForDisplay, mode: GritDisplayMode): number {
  const mkToNum = (s: string) => { const [a, b] = s.split('/').map(Number); return (a + b) / 2 }
  if (mode === 'fepa') return stone.gritFepa    ?? Infinity
  if (mode === 'jis')  return stone.gritJis     ?? Infinity
  if (mode === 'gost') return stone.gritMk ? mkToNum(stone.gritMk) : Infinity
  // native — сортируем по мкм убыв (грубее первые), если нет — по FEPA
  if (stone.gritMicrons != null) return -stone.gritMicrons
  if (stone.gritMk) return -mkToNum(stone.gritMk)
  return stone.gritFepa ?? stone.gritJis ?? Infinity
}

/** Обратная совместимость с SharpeningForm */
export function getAltGrits(stone: StoneForDisplay): string[] {
  return getGritDisplay(stone, 'native').alts
}
