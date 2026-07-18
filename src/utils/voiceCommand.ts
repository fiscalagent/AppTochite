import type { Locale } from '../i18n'

export type FieldKey =
  | 'client'
  | 'knife'
  | 'steel'
  | 'condition'
  | 'notes'
  | 'stone'
  | 'angle'
  | 'price'
  | 'hrc'

export type Command =
  | { kind: 'field'; field: FieldKey; value: string }
  | { kind: 'addStone' }
  | { kind: 'removeLastStone' }
  | { kind: 'clear'; field: FieldKey }
  | { kind: 'nav'; action: 'next' | 'prev' | 'cancel' }
  | { kind: 'submit'; markDone: boolean }
  | { kind: 'stop' }
  | { kind: 'confirmCancel' }
  | { kind: 'pickFromList'; hint: string }
  | { kind: 'repeat' }
  | { kind: 'unknown' }

export interface CommandContext {
  step: 1 | 2
  awaitingListField: FieldKey | null
  awaitingCancelConfirm: boolean
}

// step 1 = экран приёмки Z-1, step 2 = экран заточки Z-2
const STEP1_FIELDS: ReadonlySet<FieldKey> = new Set(['client', 'knife', 'steel', 'hrc', 'condition', 'price'])
const STEP2_FIELDS: ReadonlySet<FieldKey> = new Set(['stone', 'angle', 'notes'])

// ── Russian grammar ──────────────────────────────────────────────────────────

const RU_FIELD_BY_PREFIX: Record<string, FieldKey> = {
  'клиент': 'client',
  'нож': 'knife',
  'сталь': 'steel',
  'камень': 'stone',
  'камни': 'stone',
  'требуется': 'condition',
  'примечание': 'notes',
  'комментарий': 'notes',
  'комментарии': 'notes',
  'угол': 'angle',
  'цена': 'price',
  'твёрдость': 'hrc',
  'твердость': 'hrc',
  'hrc': 'hrc',
  'хрц': 'hrc',
}

const RU_CLEAR_FIELD_MAP: Record<string, FieldKey> = {
  'клиент': 'client',
  'клиента': 'client',
  'нож': 'knife',
  'сталь': 'steel',
  'требуется': 'condition',
  'примечание': 'notes',
  'примечания': 'notes',
  'комментарий': 'notes',
  'комментарии': 'notes',
  'камень': 'stone',
  'камни': 'stone',
  'угол': 'angle',
  'цена': 'price',
  'цену': 'price',
  'твёрдость': 'hrc',
  'твердость': 'hrc',
  'hrc': 'hrc',
  'хрц': 'hrc',
}

// Canonical DB keys for condition (Russian strings stored in DB)
const RU_CONDITION_VALUES: ReadonlySet<string> = new Set(['заточка', 'правка', 'правка рк', 'ремонт'])

// Maps voice-heard value → canonical DB key
const RU_CONDITION_CANONICAL: Record<string, string> = {
  'заточка': 'заточка',
  'правка': 'правка РК',
  'правка рк': 'правка РК',
  'ремонт': 'ремонт',
}

const RU_FILLERS: ReadonlySet<string> = new Set(['эм', 'ээ', 'эээ', 'мм', 'ммм', 'ну'])

const RU_ORDINALS: ReadonlySet<string> = new Set([
  'первый', 'второй', 'третий', 'четвёртый', 'четвертый',
  'пятый', 'шестой', 'седьмой', 'восьмой', 'девятый', 'десятый',
])

const RU_PICK_NUM_WORDS: ReadonlySet<string> = new Set([
  'один', 'два', 'три', 'четыре', 'пять',
  'шесть', 'семь', 'восемь', 'девять', 'десять',
])

const RU_NUMBER_WORDS: Record<string, number> = {
  'ноль': 0, 'один': 1, 'одна': 1, 'два': 2, 'две': 2, 'три': 3, 'четыре': 4,
  'пять': 5, 'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,
  'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14,
  'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19,
  'двадцать': 20, 'тридцать': 30, 'сорок': 40, 'пятьдесят': 50,
  'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90,
  'сто': 100, 'двести': 200, 'триста': 300, 'четыреста': 400, 'пятьсот': 500,
  'шестьсот': 600, 'семьсот': 700, 'восемьсот': 800, 'девятьсот': 900,
  'тысяча': 1000, 'тысячу': 1000, 'тысячи': 1000,
}

// ── English grammar ──────────────────────────────────────────────────────────

const EN_FIELD_BY_PREFIX: Record<string, FieldKey> = {
  'client': 'client',
  'knife': 'knife',
  'steel': 'steel',
  'stone': 'stone',
  'condition': 'condition',
  'required': 'condition',
  'note': 'notes',
  'notes': 'notes',
  'comment': 'notes',
  'angle': 'angle',
  'price': 'price',
  'hardness': 'hrc',
  'hrc': 'hrc',
}

const EN_CLEAR_FIELD_MAP: Record<string, FieldKey> = {
  'client': 'client',
  'knife': 'knife',
  'steel': 'steel',
  'condition': 'condition',
  'required': 'condition',
  'note': 'notes',
  'notes': 'notes',
  'comment': 'notes',
  'stone': 'stone',
  'angle': 'angle',
  'price': 'price',
  'hardness': 'hrc',
  'hrc': 'hrc',
}

// EN voice → canonical Russian DB key (condition values are stored in Russian)
const EN_CONDITION_TO_CANONICAL: Record<string, string> = {
  'sharpening': 'заточка',
  'edge': 'правка РК',
  'edge touch-up': 'правка РК',
  'touch-up': 'правка РК',
  'repair': 'ремонт',
}

const EN_FILLERS: ReadonlySet<string> = new Set(['um', 'uh', 'er', 'hmm'])

const EN_ORDINALS: ReadonlySet<string> = new Set([
  'first', 'second', 'third', 'fourth', 'fifth',
  'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
])

const EN_PICK_NUM_WORDS: ReadonlySet<string> = new Set([
  'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
])

const EN_NUMBER_WORDS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
  'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  'hundred': 100, 'thousand': 1000,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isFieldAllowedAtStep(field: FieldKey, step: 1 | 2): boolean {
  return (step === 1 ? STEP1_FIELDS : STEP2_FIELDS).has(field)
}

// Составные числительные: «сто»/«hundred» и «тысяча»/«thousand» — множители,
// а не слагаемые. «две тысячи» = 2×1000, а не 2+1000 (было бы 1002).
// «three hundred» = 3×100, а не 3+100 (было бы 103, актуально для EN — в RU
// сотни свои слова: двести/триста/…/девятьсот, уже плоские записи в таблице).
function parseNumber(text: string, numberWords: Record<string, number>): number | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  const parts = t.split(/\s+/)
  let total = 0
  let current = 0
  for (const p of parts) {
    if (/^\d+$/.test(p)) {
      current += parseInt(p, 10)
    } else if (p in numberWords) {
      const v = numberWords[p]
      if (v === 100 || v === 1000) {
        current = (current || 1) * v
        if (v === 1000) { total += current; current = 0 }
      } else {
        current += v
      }
    } else {
      return null
    }
  }
  return total + current
}

function isPickHint(
  lcTokens: string[],
  ordinals: ReadonlySet<string>,
  pickNumWords: ReadonlySet<string>,
): boolean {
  if (lcTokens.length !== 1) return false
  const t = lcTokens[0]
  if (/^\d+$/.test(t)) return true
  if (ordinals.has(t)) return true
  if (pickNumWords.has(t)) return true
  return false
}

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseCommand(rawText: string, ctx: CommandContext, locale: Locale = 'ru'): Command {
  const cleaned = (rawText ?? '')
    .replace(/[.,!?;:"'«»]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return { kind: 'unknown' }

  const tokens = cleaned.split(' ')

  const isEn = locale === 'en'
  const fillers = isEn ? EN_FILLERS : RU_FILLERS
  const fieldByPrefix = isEn ? EN_FIELD_BY_PREFIX : RU_FIELD_BY_PREFIX
  const clearFieldMap = isEn ? EN_CLEAR_FIELD_MAP : RU_CLEAR_FIELD_MAP
  const numberWords = isEn ? EN_NUMBER_WORDS : RU_NUMBER_WORDS
  const ordinals = isEn ? EN_ORDINALS : RU_ORDINALS
  const pickNumWords = isEn ? EN_PICK_NUM_WORDS : RU_PICK_NUM_WORDS

  while (tokens.length > 0 && fillers.has(tokens[0].toLowerCase())) tokens.shift()
  if (tokens.length === 0) return { kind: 'unknown' }

  const lc = tokens.map((t) => t.toLowerCase())
  const first = lc[0]

  if (ctx.awaitingCancelConfirm && lc.length === 1 && first === 'да') {
    return { kind: 'confirmCancel' }
  }
  if (isEn && ctx.awaitingCancelConfirm && lc.length === 1 && first === 'yes') {
    return { kind: 'confirmCancel' }
  }

  if (lc.length === 1) {
    if (!isEn) {
      switch (first) {
        case 'добавить': return { kind: 'addStone' }
        case 'повтори':
        case 'повтор': return { kind: 'repeat' }
        case 'стоп':
        case 'пауза': return { kind: 'stop' }
        case 'отмена': return { kind: 'nav', action: 'cancel' }
        case 'дальше':
        case 'далее':
        case 'следующее': return { kind: 'nav', action: 'next' }
        case 'назад': return { kind: 'nav', action: 'prev' }
        case 'сохранить': return { kind: 'submit', markDone: false }
        case 'готово': return { kind: 'submit', markDone: true }
      }
    } else {
      switch (first) {
        case 'add': return { kind: 'addStone' }
        case 'repeat': return { kind: 'repeat' }
        case 'stop':
        case 'pause': return { kind: 'stop' }
        case 'cancel': return { kind: 'nav', action: 'cancel' }
        case 'next': return { kind: 'nav', action: 'next' }
        case 'back':
        case 'previous': return { kind: 'nav', action: 'prev' }
        case 'save': return { kind: 'submit', markDone: false }
        case 'done': return { kind: 'submit', markDone: true }
      }
    }
  }

  if (!isEn && lc.length === 2 && lc[0] === 'что' && lc[1] === 'услышал') {
    return { kind: 'repeat' }
  }
  if (isEn && lc.length === 3 && lc[0] === 'what' && lc[1] === 'did' && lc[2] === 'you') {
    return { kind: 'repeat' }
  }
  if (isEn && lc.length === 4 && lc[0] === 'what' && lc[1] === 'did' && lc[2] === 'you' && lc[3] === 'hear') {
    return { kind: 'repeat' }
  }

  if (
    lc.length === 3 &&
    (lc[0] === 'удали' || lc[0] === 'удалить') &&
    lc[1] === 'последний' &&
    lc[2] === 'камень'
  ) {
    return { kind: 'removeLastStone' }
  }
  if (
    isEn &&
    lc.length === 3 &&
    (lc[0] === 'remove' || lc[0] === 'delete') &&
    lc[1] === 'last' &&
    lc[2] === 'stone'
  ) {
    return { kind: 'removeLastStone' }
  }

  if (!isEn && lc.length >= 2 && (lc[0] === 'сотри' || lc[0] === 'очисти')) {
    const target = lc.slice(1).join(' ')
    const field = clearFieldMap[target]
    if (field && isFieldAllowedAtStep(field, ctx.step)) return { kind: 'clear', field }
    return { kind: 'unknown' }
  }
  if (isEn && lc.length >= 2 && (lc[0] === 'clear' || lc[0] === 'erase')) {
    const target = lc.slice(1).join(' ')
    const field = clearFieldMap[target]
    if (field && isFieldAllowedAtStep(field, ctx.step)) return { kind: 'clear', field }
    return { kind: 'unknown' }
  }

  const field = fieldByPrefix[first]
  if (field && tokens.length >= 2) {
    if (!isFieldAllowedAtStep(field, ctx.step)) return { kind: 'unknown' }

    const restOriginal = tokens.slice(1).join(' ')
    const restLc = lc.slice(1).join(' ')

    if (field === 'condition') {
      if (!isEn) {
        if (RU_CONDITION_VALUES.has(restLc)) {
          return { kind: 'field', field, value: RU_CONDITION_CANONICAL[restLc] ?? restLc }
        }
      } else {
        const canonical = EN_CONDITION_TO_CANONICAL[restLc]
        if (canonical) return { kind: 'field', field, value: canonical }
      }
      return { kind: 'unknown' }
    }

    if (field === 'angle' || field === 'price' || field === 'hrc') {
      const n = parseNumber(restLc, numberWords)
      if (n === null) return { kind: 'unknown' }
      return { kind: 'field', field, value: String(n) }
    }

    return { kind: 'field', field, value: restOriginal }
  }

  if (ctx.awaitingListField && isPickHint(lc, ordinals, pickNumWords)) {
    return { kind: 'pickFromList', hint: lc.join(' ') }
  }

  return { kind: 'unknown' }
}
