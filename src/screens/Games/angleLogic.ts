// Чистая логика игры «Угадай угол» — без React и DOM, чтобы покрыть тестом.
// Ключевое понятие: угол заточки НА СТОРОНУ (полу-угол клина). Полный = ×2.
// Наклон фигуры (хард-режим) только мешает оценить, но на истинный угол и
// засчёт НЕ влияет — это инвариант, который проверяется тестом.

export const ANGLE_MIN = 10
export const ANGLE_MAX = 35
export const TOL_PERFECT = 1 // промах ≤1° — «в точку»
export const TOL_OK = 3 // промах ≤3° — «засчитано», серия растёт

export type Verdict = 'perfect' | 'ok' | 'bad'

// Случайный целевой угол на сторону в рабочем диапазоне.
export function rndAngle(rnd: () => number = Math.random): number {
  return Math.round(ANGLE_MIN + rnd() * (ANGLE_MAX - ANGLE_MIN))
}

// Вердикт по модулю промаха в градусах.
export function verdictOf(diff: number): Verdict {
  if (diff <= TOL_PERFECT) return 'perfect'
  if (diff <= TOL_OK) return 'ok'
  return 'bad'
}

// Промах засчитан (серия не обнуляется), если попал в допуск TOL_OK.
export function isHit(diff: number): boolean {
  return diff <= TOL_OK
}

// Звания по рекорду серии: порог `at` и уровень наклона `tilt` хард-режима.
// Индекс в массиве совпадает с индексом подписи звания в словаре (ranks[]).
export const RANKS = [
  { at: 0, tilt: 0 }, // без наклона
  { at: 3, tilt: 1 }, // лёгкий наклон ~15°
  { at: 6, tilt: 2 }, // сильный наклон ~28°
  { at: 10, tilt: 2 },
] as const

// Индекс звания по серии/рекорду (наибольший достигнутый порог).
export function rankIndex(streak: number): number {
  let idx = 0
  RANKS.forEach((r, i) => {
    if (streak >= r.at) idx = i
  })
  return idx
}

// Уровень наклона, разблокированный текущей серией.
export function tiltLevel(streak: number): number {
  return RANKS[rankIndex(streak)].tilt
}

// Наклон всей фигуры клина к горизонту на раунд (в градусах, знак случайный).
// Зависит от текущей серии: чем выше звание, тем сильнее сбивающий наклон.
export function tiltForRound(streak: number, rnd: () => number = Math.random): number {
  const lvl = tiltLevel(streak)
  if (lvl === 0) return 0
  const base = lvl === 1 ? 15 : 28
  const jitter = rnd() * 8 - 4 // ±4°
  const sign = rnd() < 0.5 ? -1 : 1
  return sign * (base + jitter)
}

// Раунд считается наклонным (зажигается бейдж), если наклон заметен.
export function isTilted(tiltDeg: number): boolean {
  return Math.abs(tiltDeg) >= 1
}

// Контекст применения по истинному углу — типовой инструмент для этой геометрии.
export type ContextKey = 'razor' | 'jpKitchen' | 'euKitchen' | 'edc' | 'tourist' | 'axe' | 'work'

const CONTEXT: { lo: number; hi: number; key: ContextKey }[] = [
  { lo: 10, hi: 14, key: 'razor' },
  { lo: 15, hi: 17, key: 'jpKitchen' },
  { lo: 18, hi: 20, key: 'euKitchen' },
  { lo: 21, hi: 25, key: 'edc' },
  { lo: 26, hi: 30, key: 'tourist' },
  { lo: 31, hi: 35, key: 'axe' },
]

export function contextKey(angle: number): ContextKey {
  for (const c of CONTEXT) if (angle >= c.lo && angle <= c.hi) return c.key
  return 'work'
}

// ─── Геометрия клина (вид сбоку) ───
// Вершина РК слева в (cx,cy). Ось-биссектриса наклонена к горизонту на tilt.
// Экранный Y растёт вниз, поэтому «вверх» = минус, ось = −tilt.
// Грани = ось ± угол_на_сторону. Истинный угол между гранями = 2·angleSide
// и НЕ зависит от наклона — проверяется тестом.
export function wedgeAngles(angleSide: number, tilt: number) {
  const axis = -tilt
  const rad = (deg: number) => (deg * Math.PI) / 180
  return {
    axis: rad(axis),
    upper: rad(axis - angleSide),
    lower: rad(axis + angleSide),
  }
}

// Полный угол раствора клина (в градусах) — истинный угол заточки.
export function fullAngle(angleSide: number, tilt: number): number {
  const { upper, lower } = wedgeAngles(angleSide, tilt)
  return Math.abs((lower - upper) * 180) / Math.PI
}
