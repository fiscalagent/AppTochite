import type { Steel } from '../db/db'
import { bigramSim, levSim } from './voiceMatch'

// Нормализация марок стали для матчинга. В отличие от voiceMatch.normForMatch
// (фонетический: х→h, под распознавание речи), здесь свёртка ВИЗУАЛЬНО-
// КОНВЕНЦИОНАЛЬНАЯ: кириллица приводится к латинице так, как марки реально
// пишут вперемешку. Критично х→x (а не h!), иначе «95Х18» ≠ «95x18».
//
// Покрытые кейсы:
//   95x18 (лат.) → 95Х18 (кир.)  — латинская x ↔ кириллическая х
//   X12MF (лат.) → Х12МФ (кир.)  — полная марка латиницей
//   Д2           → D2            — русское имя американской марки (Д→d)
const STEEL_TRANSLIT: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh',
  'з':'z','и':'i','й':'i','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'c',
  'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
}

export function normSteel(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(c => STEEL_TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]/g, '')
}

// Близость двух марок в [0..1]. Точное равенство нормализованных форм → 1.
// Иначе равновес bigram (хорош для длинных) + Левенштейн (хорош для коротких
// и одиночных опечаток: 95x18 ↔ 95x17).
export function steelSim(a: string, b: string): number {
  const na = normSteel(a)
  const nb = normSteel(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  return bigramSim(na, nb) * 0.5 + levSim(na, nb) * 0.5
}

export type SteelMatchKind = 'exact' | 'fuzzy' | 'none'

export interface SteelMatch {
  kind: SteelMatchKind
  // Лучшая справочная сталь (для exact/fuzzy). Для none — undefined.
  steel?: Steel
  score: number
  // Ранжированные кандидаты-подсказки для ручного выбора в превью
  // (для fuzzy/none; первый совпадает со steel при fuzzy).
  suggestions: Steel[]
}

// Порог, выше которого несовпадение считаем «похожим» (предлагаем подтвердить),
// а не «совсем чужим». Подобрано так, чтобы опечатка в одном символе короткой
// марки (95Х18→95Х17 ≈ 0.78) попадала в fuzzy, а случайный текст — в none.
const FUZZY_THRESHOLD = 0.5
const MAX_SUGGESTIONS = 5

export function matchSteel(input: string, steels: Steel[]): SteelMatch {
  const trimmed = input.trim()
  if (!trimmed || steels.length === 0) {
    return { kind: 'none', score: 0, suggestions: [] }
  }

  const scored = steels
    .map(steel => ({ steel, score: steelSim(trimmed, steel.name) }))
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  const suggestions = scored
    .filter(s => s.score > 0)
    .slice(0, MAX_SUGGESTIONS)
    .map(s => s.steel)

  if (best.score >= 1) {
    return { kind: 'exact', steel: best.steel, score: best.score, suggestions }
  }
  if (best.score >= FUZZY_THRESHOLD) {
    return { kind: 'fuzzy', steel: best.steel, score: best.score, suggestions }
  }
  return { kind: 'none', score: best.score, suggestions }
}
