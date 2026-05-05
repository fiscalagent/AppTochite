// Соответствие гритностей по стандартам FEPA-F, JIS, ГОСТ 9206
// Источник: https://tsprof.ru/table.html

export interface GritRow {
  fepa: number
  jis: number
  gost: string  // формат МК_VALUES: 'X/Y'
}

export const GRIT_TABLE: GritRow[] = [
  { fepa: 60,   jis: 60,    gost: '250/200' },
  { fepa: 80,   jis: 100,   gost: '200/160' },
  { fepa: 100,  jis: 100,   gost: '160/125' },
  { fepa: 120,  jis: 120,   gost: '125/100' },
  { fepa: 150,  jis: 150,   gost: '100/80'  },
  { fepa: 180,  jis: 180,   gost: '80/63'   },
  { fepa: 220,  jis: 220,   gost: '63/50'   },
  { fepa: 240,  jis: 360,   gost: '50/40'   },
  { fepa: 280,  jis: 400,   gost: '40/28'   },
  { fepa: 320,  jis: 600,   gost: '28/20'   },
  { fepa: 400,  jis: 1000,  gost: '20/14'   },
  { fepa: 600,  jis: 2000,  gost: '14/10'   },
  { fepa: 800,  jis: 3000,  gost: '10/7'    },
  { fepa: 1000, jis: 5000,  gost: '7/5'     },
  { fepa: 1200, jis: 6000,  gost: '5/3'     },
  { fepa: 2000, jis: 8000,  gost: '3/2'     },
  { fepa: 2500, jis: 10000, gost: '2/1'     },
  { fepa: 4000, jis: 15000, gost: '1/0'     },
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
  gritFepaOverride?: number
  gritJisOverride?: number
  gritMkOverride?: string
}

/**
 * Разрешает значение гритности по каждой шкале с приоритетом:
 * 1) явное поле камня (native или override)
 * 2) таблица соответствий
 * 3) undefined
 */
function resolveGrits(stone: StoneForDisplay): { fepa?: number; jis?: number; mk?: string } {
  const { grit, gritUnit, gritMk } = stone
  let row: GritRow | undefined
  if (gritUnit === 'fepa' && grit != null) row = GRIT_TABLE.find(r => r.fepa === grit)
  else if (gritUnit === 'jis' && grit != null) row = GRIT_TABLE.find(r => r.jis === grit)
  else if (gritUnit === 'mk' && gritMk) row = GRIT_TABLE.find(r => r.gost === gritMk)

  const fepa = gritUnit === 'fepa' ? grit : (stone.gritFepaOverride ?? row?.fepa)
  const jis  = gritUnit === 'jis'  ? grit : (stone.gritJisOverride  ?? row?.jis)
  const mk   = gritUnit === 'mk'   ? gritMk : (stone.gritMkOverride ?? row?.gost)
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
