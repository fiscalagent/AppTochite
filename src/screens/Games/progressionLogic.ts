// Чистая логика игры «Собери прогрессию» — без React и DOM, чтобы покрыть тестом.
// Камни берутся из справочника приложения, микроны — каноническая физическая
// шкала (gritMicrons, выход конвертера from*()).
import type { Stone } from '../../db/instance'

export const ROUND_SIZE = 4
export const GAP = 1.25 // минимальный разрыв по микронам между соседями — иначе порядок спорный

export type Scale = 'microns' | 'mk' | 'jis' | 'fepa'

// Микроны камня или null, если зернистость в микронах неизвестна.
export function micronOf(stone: Stone): number | null {
  const m = stone.gritMicrons
  return typeof m === 'number' && Number.isFinite(m) && m > 0 ? m : null
}

// Штатная шкала камня — как он подписан на бруске (gritSource). Игра намеренно
// смешивает разные шкалы в одном наборе, чтобы игрок ориентировался на микроны,
// а не на «голые» числа подписи.
export function scaleOf(st: Stone): Scale {
  const src = st.gritSource
  if (src === 'fepa' || src === 'jis' || src === 'mk' || src === 'microns') return src
  if (st.gritMk) return 'mk'
  if (st.gritFepa != null) return 'fepa'
  if (st.gritJis != null) return 'jis'
  return 'microns'
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Сколько разных штатных шкал в наборе — критерий «интересности» раунда.
export function scaleVariety(stones: Stone[]): number {
  return new Set(stones.map(scaleOf)).size
}

// Набор отсортирован правильно, если микроны не возрастают (грубое → финишное).
export function isSolved(stones: Stone[]): boolean {
  return stones.every((st, i) => i === 0 || micronOf(stones[i - 1])! >= micronOf(st)!)
}

// Случайный набор из ROUND_SIZE камней с разрывом >= GAP по микронам.
// Несколько попыток со случайным порядком перебора — поэтому наборы не
// повторяются от раунда к раунду; из них берём самый разнообразный по шкалам.
// На вход допускаются любые камни — без известных микрон отбрасываются.
export function pickRound(pool: Stone[]): Stone[] {
  const usable = pool.filter(st => micronOf(st) != null)
  let best: Stone[] = []

  for (let attempt = 0; attempt < 40; attempt++) {
    const picked: Stone[] = []
    for (const st of shuffle(usable)) {
      if (picked.length >= ROUND_SIZE) break
      const m = micronOf(st)!
      const fits = picked.every(p => {
        const a = micronOf(p)!
        return Math.max(a, m) / Math.min(a, m) >= GAP
      })
      if (fits) picked.push(st)
    }

    const better =
      picked.length > best.length ||
      (picked.length === best.length && scaleVariety(picked) > scaleVariety(best))
    if (better) best = picked

    // полный набор с максимумом доступных шкал (в сиде их 3: JIS/FEPA/ГОСТ) — хватит
    if (best.length === ROUND_SIZE && scaleVariety(best) >= Math.min(4, ROUND_SIZE)) break
  }

  return shuffle(best)
}
