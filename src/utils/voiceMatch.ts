const TRANSLIT: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
  'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
  'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
}

export function transliterate(text: string): string {
  return text.toLowerCase().split('').map(c => TRANSLIT[c] ?? c).join('')
}

export function normForMatch(text: string): string {
  return transliterate(text).replace(/[^a-z0-9]/g, '')
}

export function bigramSim(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const bgs = (s: string) => {
    const set = new Set<string>()
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
    return set
  }
  const ba = bgs(a), bb = bgs(b)
  if (ba.size === 0 || bb.size === 0) return 0
  let hit = 0
  for (const bg of ba) if (bb.has(bg)) hit++
  return (2 * hit) / (ba.size + bb.size)
}

// Normalized Levenshtein similarity, in [0..1]. Robust to single phonetic
// substitutions ("вашита"→vashita vs "washita" differ by 1 char → 0.86).
// O(n*m) with rolling row, fine for our string lengths (<30).
export function levSim(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const m = a.length, n = b.length
  const max = Math.max(m, n)
  const dp = new Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return 1 - dp[n] / max
}

// Collapse Russian/English phonetic noise common in voice → text mismatches.
// Examples handled implicitly via levSim+bigram; this is for the worst offenders:
//  - doubled consonants in english brand names (Steele, Bess, Suehiro)
//  - silent trailing 'e' (Cerax-e, Stone-e)
//  - h ⇄ х already covered by translit (х→h)
function phoneticNorm(s: string): string {
  // Collapse doubled letters: 'naniwa' stays, 'belgian' stays, 'wessstone'→'westone'
  return s
    .replace(/(.)\1+/g, '$1')
    // Drop trailing 'e' if previous char is a consonant (silent-e in English brands)
    .replace(/([bcdfghjklmnpqrstvwxyz])e$/, '$1')
}

// Tokenize on non-letter, non-digit chars. Works for Cyrillic because JS \b
// only treats ASCII word chars as word chars — we split manually instead.
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

function hasWholeWord(text: string, word: string): boolean {
  if (!word) return false
  return tokenize(text).includes(word.toLowerCase())
}

function scoreCandidate(vNorm: string, vNormW: string, voiceGrit: string | undefined, sug: string): number {
  const sLow = sug.toLowerCase()
  const sNorm = normForMatch(sLow)
  const vPh = phoneticNorm(vNorm)
  const sPh = phoneticNorm(sNorm)
  let score = 0
  // Grit hit — strong signal, word boundary by manual tokenization (avoid 1000 ⊂ 10000)
  if (voiceGrit && hasWholeWord(sLow, voiceGrit)) score += 40
  if (sNorm.includes(vNorm) || vNorm.includes(sNorm)) score += 35
  // Bigram similarity (good for long strings, partial word overlap)
  score += bigramSim(vNorm, sNorm) * 50
  // Levenshtein (good for single-char phonetic substitutions: вашита↔washita)
  score += levSim(vNorm, sNorm) * 40
  // v→w substitution: russian "в" often = english "w"
  if (vNormW !== vNorm) {
    score += bigramSim(vNormW, sNorm) * 15
    score += levSim(vNormW, sNorm) * 25
  }
  // Phonetic-normalized comparison (handles silent-e, doubled consonants)
  if (vPh !== vNorm || sPh !== sNorm) {
    score += levSim(vPh, sPh) * 15
  }
  return score
}

export function findAllMatches(voiceText: string, suggestions: string[], minScore = 30): string[] {
  const vLow = voiceText.toLowerCase()
  const vNorm = normForMatch(vLow)
  const vNormW = vNorm.replace(/v/g, 'w')
  const gritMatch = vLow.match(/\b(\d{3,5})\b/)
  const voiceGrit = gritMatch?.[1]

  const scored: { name: string; score: number }[] = []
  for (const sug of suggestions) {
    const score = scoreCandidate(vNorm, vNormW, voiceGrit,sug)
    if (score >= minScore) scored.push({ name: sug, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 8).map(x => x.name)
}

export function findBestMatch(voiceText: string, suggestions: string[], minScore = 28): string | null {
  const vLow = voiceText.toLowerCase()
  const vNorm = normForMatch(vLow)
  const vNormW = vNorm.replace(/v/g, 'w')
  const gritMatch = vLow.match(/\b(\d{3,5})\b/)
  const voiceGrit = gritMatch?.[1]

  let best: { name: string; score: number } | null = null
  for (const s of suggestions) {
    const score = scoreCandidate(vNorm, vNormW, voiceGrit,s)
    if (!best || score > best.score) best = { name: s, score }
  }
  return best && best.score >= minScore ? best.name : null
}

const RU_NUM: Record<string, number> = {
  'ноль': 0, 'нуль': 0,
  'один': 1, 'одна': 1, 'первый': 1, 'первая': 1, 'первое': 1,
  'два': 2, 'две': 2, 'второй': 2, 'вторая': 2, 'второе': 2,
  'три': 3, 'третий': 3, 'третья': 3, 'третье': 3,
  'четыре': 4, 'четвёртый': 4, 'четвертый': 4, 'четвёртая': 4, 'четвертая': 4,
  'пять': 5, 'пятый': 5, 'пятая': 5,
  'шесть': 6, 'шестой': 6, 'шестая': 6,
  'семь': 7, 'седьмой': 7, 'седьмая': 7,
  'восемь': 8, 'восьмой': 8, 'восьмая': 8,
  'девять': 9, 'девятый': 9, 'девятая': 9,
  'десять': 10, 'десятый': 10, 'десятая': 10,
  'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14, 'пятнадцать': 15,
  'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19, 'двадцать': 20,
  'тридцать': 30, 'сорок': 40, 'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90,
  'сто': 100, 'двести': 200, 'триста': 300, 'четыреста': 400, 'пятьсот': 500,
  'шестьсот': 600, 'семьсот': 700, 'восемьсот': 800, 'девятьсот': 900,
  'тысяча': 1000, 'тысячу': 1000, 'тысячи': 1000,
}

// Parse a Russian/digit number from speech, supports compound numerals like "сто пятьдесят".
// Returns string (so callers can keep input type=number raw) or '' if not found.
export function extractNumber(text: string): string {
  const lower = text.toLowerCase()
  const digitMatch = lower.match(/\d+(?:[.,]\d+)?/)
  if (digitMatch) return digitMatch[0].replace(',', '.')

  const words = lower.split(/[^а-яё]+/).filter(Boolean)
  let sum = 0
  let hasAny = false
  let pendingThousands = 0
  for (const w of words) {
    if (w === 'тысяча' || w === 'тысячи' || w === 'тысячу') {
      // Multiply accumulated by 1000
      sum = (sum === 0 ? 1 : sum) * 1000
      pendingThousands = sum
      sum = 0
      hasAny = true
      continue
    }
    const v = RU_NUM[w]
    if (v !== undefined) {
      sum += v
      hasAny = true
    }
  }
  const total = pendingThousands + sum
  return hasAny ? String(total) : ''
}

// Narrow a list to all items matching a refining token (digit, ordinal, or
// fuzzy substring). Returns possibly-many items — caller decides whether to
// auto-select on length===1 or keep narrowing on length>1.
// Order of precedence:
//   1. Russian numeral word ("сто двадцать" or "первый") matches digits in
//      item names, or falls back to ordinal index when no name has that digit.
//   2. Plain digit ("120") matches whole-word digit in item names.
//   3. Fuzzy fallback — drop-in findAllMatches against the filtered list.
export function narrowFromFiltered(text: string, items: string[]): string[] {
  if (items.length === 0) return []
  const tokens = tokenize(text)

  // Russian numerals first — for "сто двадцать" / "двадцать пять" we get the
  // composed number via extractNumber and match by content.
  const composedNum = extractNumber(text)
  if (composedNum) {
    const byContent = items.filter(it => hasWholeWord(it, composedNum))
    if (byContent.length > 0) return byContent
    const n = Number(composedNum)
    if (n >= 1 && n <= items.length) return [items[n - 1]]
  }

  // Single-word ordinal/cardinal (covers "первый", "второй", … as ordinal index).
  for (const [word, num] of Object.entries(RU_NUM)) {
    if (tokens.includes(word)) {
      const numStr = String(num)
      const byContent = items.filter(it => hasWholeWord(it, numStr))
      if (byContent.length > 0) return byContent
      if (num >= 1 && num <= items.length) return [items[num - 1]]
    }
  }

  // Fuzzy substring narrowing
  return findAllMatches(text, items)
}

// Pick an item from a pre-filtered list by ordinal/number/fuzzy.
// Used in phase 2 of two-phase voice flow.
export function pickFromFiltered(text: string, items: string[]): string | null {
  if (items.length === 0) return null
  const tokens = tokenize(text)

  // Russian ordinal/cardinal word → index
  for (const [word, num] of Object.entries(RU_NUM)) {
    if (tokens.includes(word)) {
      const numStr = String(num)
      const byContent = items.find(it => hasWholeWord(it, numStr))
      if (byContent) return byContent
      if (num >= 1 && num <= items.length) return items[num - 1]
    }
  }

  // Digit (digits work with native \b since they're ASCII word chars)
  const digitMatch = text.match(/\b(\d+)\b/)
  if (digitMatch) {
    const num = Number(digitMatch[1])
    const byContent = items.find(it => hasWholeWord(it, digitMatch[1]))
    if (byContent) return byContent
    if (num >= 1 && num <= items.length) return items[num - 1]
  }

  return findBestMatch(text, items)
}

// Fuzzy match for client names (handles "Я", short nicknames, partial speech).
// Returns the best client by score, or null if score is too low / ambiguous.
// Bidirectional substring is dangerous for short names like "Я" — we require
// at least one word-boundary token match or strong bigram similarity.
export function findClientMatch(voiceText: string, names: string[], minScore = 30): string | null {
  const vLow = voiceText.toLowerCase().trim()
  if (!vLow) return null
  const vNorm = normForMatch(vLow)
  const vTokens = tokenize(vLow)
  // For matching against names, drop single-letter voice tokens — they cause
  // false matches against short names. Exception: if the voice is *exactly* a
  // single letter (e.g. user said only "я"), keep it so "Я" can match.
  const vTokensForMatch = vTokens.length === 1 ? vTokens : vTokens.filter(t => t.length >= 2)

  let best: { name: string; score: number } | null = null
  for (const name of names) {
    const nLow = name.toLowerCase()
    const nNorm = normForMatch(nLow)
    const nTokens = tokenize(nLow)
    let score = 0

    if (nLow === vLow) score += 100
    for (const tok of vTokensForMatch) {
      if (nTokens.includes(tok)) score += 40
    }
    for (const nameTok of nTokens) {
      if (nameTok.length >= 2 && vTokens.includes(nameTok)) score += 35
    }
    score += bigramSim(vNorm, nNorm) * 50

    if (!best || score > best.score) best = { name, score }
  }
  return best && best.score >= minScore ? best.name : null
}

export const DONE_KEYWORDS = ['готово', 'готов', 'выполнено', 'сделано', 'закончил', 'завершено']

export function containsDoneKeyword(text: string): boolean {
  const tokens = tokenize(text)
  return DONE_KEYWORDS.some(kw => tokens.includes(kw))
}
