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

/**
 * Возвращает альтернативные обозначения гритности в двух других стандартах.
 * Пример: FEPA 1200 → ['6000 JIS', '5/3 мк']
 * Если соответствия нет — пустой массив.
 */
export function getAltGrits(opts: {
  grit?: number
  gritUnit?: string
  gritMk?: string
}): string[] {
  const { grit, gritUnit, gritMk } = opts

  if (gritUnit === 'fepa' && grit != null) {
    const row = GRIT_TABLE.find(r => r.fepa === grit)
    return row ? [`${row.jis} JIS`, `${row.gost} мк`] : []
  }
  if (gritUnit === 'jis' && grit != null) {
    const row = GRIT_TABLE.find(r => r.jis === grit)
    return row ? [`${row.fepa} FEPA`, `${row.gost} мк`] : []
  }
  if (gritUnit === 'mk' && gritMk) {
    const row = GRIT_TABLE.find(r => r.gost === gritMk)
    return row ? [`${row.fepa} FEPA`, `${row.jis} JIS`] : []
  }
  return []
}
