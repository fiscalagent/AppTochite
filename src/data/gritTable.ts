// Соответствие гритностей по стандартам FEPA-F, JIS, ГОСТ 9206
// Источник: https://tsprof.ru/table.html

export interface GritRow {
  fepa: number
  jis: number
  gost: string    // формат МК_VALUES: 'X/Y'
  microns: number // D50 среднее, New JIS R 6001 (источник: Naniwa / imcclains.com)
}

export const GRIT_TABLE: GritRow[] = [
  { fepa: 60,   jis: 60,    gost: '315/250', microns: 250  },
  { fepa: 70,   jis: 70,    gost: '250/200', microns: 210  },
  { fepa: 80,   jis: 80,    gost: '200/160', microns: 165  },
  { fepa: 100,  jis: 100,   gost: '160/125', microns: 122  },
  { fepa: 120,  jis: 120,   gost: '125/100', microns: 102  },
  { fepa: 150,  jis: 150,   gost: '100/80',  microns: 89   },
  { fepa: 220,  jis: 220,   gost: '80/63',   microns: 63   },
  { fepa: 230,  jis: 240,   gost: '63/50',   microns: 57   },
  { fepa: 240,  jis: 280,   gost: '50/40',   microns: 48   },
  { fepa: 240,  jis: 280,   gost: '60/40',   microns: 48   },
  { fepa: 280,  jis: 360,   gost: '40/28',   microns: 35   },
  { fepa: 320,  jis: 400,   gost: '40/28',   microns: 35   },
  { fepa: 360,  jis: 500,   gost: '28/20',   microns: 25   },
  { fepa: 400,  jis: 600,   gost: '20/14',   microns: 17   },
  { fepa: 400,  jis: 700,   gost: '20/14',   microns: 17   },
  { fepa: 500,  jis: 800,   gost: '14/10',   microns: 11.5 },
  { fepa: 600,  jis: 1000,  gost: '14/10',   microns: 11.5 },
  { fepa: 600,  jis: 1200,  gost: '10/7',    microns: 9.5  },
  { fepa: 800,  jis: 1500,  gost: '10/7',    microns: 8    },
  { fepa: 800,  jis: 2000,  gost: '7/5',     microns: 5.5  },
  { fepa: 1000, jis: 2500,  gost: '7/5',     microns: 5.5  },
  { fepa: 1000, jis: 3000,  gost: '5/3',     microns: 4    },
  { fepa: 1200, jis: 4000,  gost: '3/2',     microns: 3    },
  { fepa: 1500, jis: 6000,  gost: '2/1',     microns: 1.2  },
  { fepa: 2000, jis: 8000,  gost: '2/1',     microns: 1.2  },
  { fepa: 3000, jis: 10000, gost: '1/0',     microns: 1    },
]

/** FEPA → JIS. Возвращает undefined если нет точного соответствия. */
export function fepaToJis(fepa: number): number | undefined {
  return GRIT_TABLE.find(r => r.fepa === fepa)?.jis
}

/** JIS → FEPA. Возвращает ближайший FEPA для данного JIS. */
export function jisToFepa(jis: number): number | undefined {
  return GRIT_TABLE.find(r => r.jis === jis)?.fepa
}

/** FEPA → ГОСТ (строка МК). */
export function fepaToGost(fepa: number): string | undefined {
  return GRIT_TABLE.find(r => r.fepa === fepa)?.gost
}

/** JIS → ГОСТ (строка МК). */
export function jisToGost(jis: number): string | undefined {
  return GRIT_TABLE.find(r => r.jis === jis)?.gost
}

export type GritDisplayMode = 'native' | 'fepa' | 'jis' | 'gost'

type StoneForDisplay = {
  grit?: number
  gritUnit?: string
  gritMk?: string
}

function resolveGrits(stone: StoneForDisplay): { fepa?: number; jis?: number; mk?: string } {
  const { grit, gritUnit, gritMk } = stone
  let row: GritRow | undefined
  if (gritUnit === 'fepa' && grit != null) row = GRIT_TABLE.find(r => r.fepa === grit)
  else if (gritUnit === 'jis' && grit != null) row = GRIT_TABLE.find(r => r.jis === grit)
  else if (gritUnit === 'mk' && gritMk) row = GRIT_TABLE.find(r => r.gost === gritMk)

  const fepa = gritUnit === 'fepa' ? grit : row?.fepa
  const jis  = gritUnit === 'jis'  ? grit : row?.jis
  const mk   = gritUnit === 'mk'   ? gritMk : row?.gost
  return { fepa, jis, mk }
}

/**
 * Возвращает главное значение гритности (value + unit раздельно) и
 * альтернативные обозначения в других стандартах.
 *
 * mode='native' — показывать как записано у камня
 * mode='fepa'/'jis'/'gost' — перевести в нужный стандарт
 *
 * При наличии полей gritFepaOverride / gritJisOverride / gritMkOverride они
 * имеют приоритет над таблицей соответствий.
 */
export function getGritDisplay(
  stone: StoneForDisplay,
  mode: GritDisplayMode
): { mainValue: string; mainUnit: string; alts: string[] } {
  const { grit, gritUnit, gritMk } = stone
  const { fepa, jis, mk } = resolveGrits(stone)

  const nativeValue = gritUnit === 'mk' ? (gritMk ?? '') : (grit != null ? String(grit) : '')
  const nativeUnit =
    gritUnit === 'fepa' ? 'FEPA' :
    gritUnit === 'jis'  ? 'JIS'  :
    gritUnit === 'mk'   ? 'мк'   : ''

  const fmt = (v: string, u: string) => `${v} ${u}`
  const f = fepa != null ? fmt(String(fepa), 'FEPA') : null
  const j = jis  != null ? fmt(String(jis),  'JIS')  : null
  const g = mk   != null ? fmt(mk,            'мк')   : null

  if (mode === 'native') {
    const alts = [
      gritUnit !== 'fepa' ? f : null,
      gritUnit !== 'jis'  ? j : null,
      gritUnit !== 'mk'   ? g : null,
    ].filter((x): x is string => x !== null)
    return { mainValue: nativeValue, mainUnit: nativeUnit, alts }
  }

  if (mode === 'fepa') {
    if (fepa == null) return { mainValue: nativeValue, mainUnit: nativeUnit, alts: [] }
    return { mainValue: String(fepa), mainUnit: 'FEPA', alts: [j, g].filter((x): x is string => x !== null) }
  }
  if (mode === 'jis') {
    if (jis == null) return { mainValue: nativeValue, mainUnit: nativeUnit, alts: [] }
    return { mainValue: String(jis), mainUnit: 'JIS', alts: [f, g].filter((x): x is string => x !== null) }
  }
  // mode === 'gost'
  if (mk == null) return { mainValue: nativeValue, mainUnit: nativeUnit, alts: [] }
  return { mainValue: mk, mainUnit: 'мк', alts: [f, j].filter((x): x is string => x !== null) }
}

/**
 * Числовое значение для сортировки в выбранном режиме.
 * Меньше = грубее (для МК — средняя точка диапазона).
 * Камни без соответствия в таблице уходят в конец (Infinity).
 * Учитывает gritFepaOverride / gritJisOverride / gritMkOverride.
 */
export function getGritSortValue(
  stone: StoneForDisplay,
  mode: GritDisplayMode
): number {
  const { grit, gritUnit, gritMk } = stone
  const { fepa, jis, mk } = resolveGrits(stone)

  const mkToNum = (s: string) => {
    const [a, b] = s.split('/').map(Number)
    return (a + b) / 2
  }

  if (mode === 'fepa') return fepa ?? Infinity
  if (mode === 'jis')  return jis  ?? Infinity
  if (mode === 'gost') return mk ? mkToNum(mk) : Infinity
  // native
  if (gritUnit === 'mk') return gritMk ? mkToNum(gritMk) : Infinity
  return grit ?? Infinity
}

/** Оставить для обратной совместимости с SharpeningForm */
export function getAltGrits(opts: StoneForDisplay): string[] {
  return getGritDisplay(opts, 'native').alts
}
