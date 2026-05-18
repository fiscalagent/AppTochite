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

const STEP1_FIELDS: ReadonlySet<FieldKey> = new Set(['client', 'knife', 'steel', 'hrc', 'condition', 'notes'])
const STEP2_FIELDS: ReadonlySet<FieldKey> = new Set(['stone', 'angle', 'price', 'notes'])

const FIELD_BY_PREFIX: Record<string, FieldKey> = {
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

const CLEAR_FIELD_MAP: Record<string, FieldKey> = {
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

const CONDITION_VALUES: ReadonlySet<string> = new Set(['заточка', 'правка', 'правка рк', 'ремонт'])

const FILLERS: ReadonlySet<string> = new Set(['эм', 'ээ', 'эээ', 'мм', 'ммм', 'ну'])

const ORDINALS: ReadonlySet<string> = new Set([
  'первый', 'второй', 'третий', 'четвёртый', 'четвертый',
  'пятый', 'шестой', 'седьмой', 'восьмой', 'девятый', 'десятый',
])

const PICK_NUM_WORDS: ReadonlySet<string> = new Set([
  'один', 'два', 'три', 'четыре', 'пять',
  'шесть', 'семь', 'восемь', 'девять', 'десять',
])

const NUMBER_WORDS: Record<string, number> = {
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

function isFieldAllowedAtStep(field: FieldKey, step: 1 | 2): boolean {
  return (step === 1 ? STEP1_FIELDS : STEP2_FIELDS).has(field)
}

function parseNumber(text: string): number | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  const parts = t.split(/\s+/)
  let sum = 0
  for (const p of parts) {
    if (/^\d+$/.test(p)) {
      sum += parseInt(p, 10)
    } else if (p in NUMBER_WORDS) {
      sum += NUMBER_WORDS[p]
    } else {
      return null
    }
  }
  return sum
}

function isPickHint(lcTokens: string[]): boolean {
  if (lcTokens.length !== 1) return false
  const t = lcTokens[0]
  if (/^\d+$/.test(t)) return true
  if (ORDINALS.has(t)) return true
  if (PICK_NUM_WORDS.has(t)) return true
  return false
}

export function parseCommand(rawText: string, ctx: CommandContext): Command {
  const cleaned = (rawText ?? '')
    .replace(/[.,!?;:"'«»]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return { kind: 'unknown' }

  let tokens = cleaned.split(' ')
  while (tokens.length > 0 && FILLERS.has(tokens[0].toLowerCase())) tokens.shift()
  if (tokens.length === 0) return { kind: 'unknown' }

  const lc = tokens.map((t) => t.toLowerCase())
  const first = lc[0]

  if (ctx.awaitingCancelConfirm && lc.length === 1 && first === 'да') {
    return { kind: 'confirmCancel' }
  }

  if (lc.length === 1) {
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
  }

  if (lc.length === 2 && lc[0] === 'что' && lc[1] === 'услышал') {
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

  if (lc.length >= 2 && (lc[0] === 'сотри' || lc[0] === 'очисти')) {
    const target = lc.slice(1).join(' ')
    const field = CLEAR_FIELD_MAP[target]
    if (field) return { kind: 'clear', field }
    return { kind: 'unknown' }
  }

  const field = FIELD_BY_PREFIX[first]
  if (field && tokens.length >= 2) {
    if (!isFieldAllowedAtStep(field, ctx.step)) return { kind: 'unknown' }

    const restOriginal = tokens.slice(1).join(' ')
    const restLc = lc.slice(1).join(' ')

    if (field === 'condition') {
      if (CONDITION_VALUES.has(restLc)) {
        return { kind: 'field', field, value: restLc }
      }
      return { kind: 'unknown' }
    }

    if (field === 'angle' || field === 'price' || field === 'hrc') {
      const n = parseNumber(restLc)
      if (n === null) return { kind: 'unknown' }
      return { kind: 'field', field, value: String(n) }
    }

    return { kind: 'field', field, value: restOriginal }
  }

  if (ctx.awaitingListField && isPickHint(lc)) {
    return { kind: 'pickFromList', hint: lc.join(' ') }
  }

  return { kind: 'unknown' }
}
