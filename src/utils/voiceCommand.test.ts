import { describe, it, expect } from 'vitest'
import { parseCommand, type CommandContext, type FieldKey } from './voiceCommand'

const ctx = (over: Partial<CommandContext> = {}): CommandContext => ({
  step: 1,
  awaitingListField: null,
  awaitingCancelConfirm: false,
  ...over,
})

describe('Команды Приёмки (step=1)', () => {
  it('клиент <имя> → field:client', () => {
    expect(parseCommand('клиент иван', ctx())).toEqual({
      kind: 'field', field: 'client', value: 'иван',
    })
  })

  it('нож <название> → field:knife', () => {
    expect(parseCommand('нож шеф', ctx())).toEqual({
      kind: 'field', field: 'knife', value: 'шеф',
    })
  })

  it('сталь <название> → field:steel', () => {
    expect(parseCommand('сталь d2', ctx())).toEqual({
      kind: 'field', field: 'steel', value: 'd2',
    })
  })

  it('требуется заточка → chip', () => {
    expect(parseCommand('требуется заточка', ctx())).toEqual({
      kind: 'field', field: 'condition', value: 'заточка',
    })
  })

  it('требуется правка → chip', () => {
    expect(parseCommand('требуется правка', ctx())).toEqual({
      kind: 'field', field: 'condition', value: 'правка РК',
    })
  })

  it('требуется правка рк → chip', () => {
    expect(parseCommand('требуется правка рк', ctx())).toEqual({
      kind: 'field', field: 'condition', value: 'правка РК',
    })
  })

  it('требуется ремонт → chip', () => {
    expect(parseCommand('требуется ремонт', ctx())).toEqual({
      kind: 'field', field: 'condition', value: 'ремонт',
    })
  })

  it('требуется с невалидным значением → unknown', () => {
    expect(parseCommand('требуется что-то непонятное', ctx())).toEqual({ kind: 'unknown' })
  })

  it('цена 500 → number=500 (цена на экране приёмки Z-1)', () => {
    expect(parseCommand('цена 500', ctx())).toEqual({
      kind: 'field', field: 'price', value: '500',
    })
  })
})

describe('Команды Заточки (step=2)', () => {
  it('угол 20 → number=20', () => {
    expect(parseCommand('угол 20', ctx({ step: 2 }))).toEqual({
      kind: 'field', field: 'angle', value: '20',
    })
  })

  it('камень <название> → field:stone', () => {
    expect(parseCommand('камень бельгийский', ctx({ step: 2 }))).toEqual({
      kind: 'field', field: 'stone', value: 'бельгийский',
    })
  })

  it('добавить → addStone', () => {
    expect(parseCommand('добавить', ctx({ step: 2 }))).toEqual({ kind: 'addStone' })
  })

  it('удали последний камень → removeLastStone', () => {
    expect(parseCommand('удали последний камень', ctx({ step: 2 }))).toEqual({
      kind: 'removeLastStone',
    })
  })

  it('удалить последний камень (с -ть) → removeLastStone', () => {
    expect(parseCommand('удалить последний камень', ctx({ step: 2 }))).toEqual({
      kind: 'removeLastStone',
    })
  })

  it('примечание <текст> → весь хвост в value (комментарий на экране заточки Z-2)', () => {
    expect(parseCommand('примечание ручка треснула возле обуха', ctx({ step: 2 }))).toEqual({
      kind: 'field', field: 'notes', value: 'ручка треснула возле обуха',
    })
  })
})

describe('Strict по шагу', () => {
  it('угол 20 при step=1 → unknown (не авто-переходим)', () => {
    expect(parseCommand('угол 20', ctx({ step: 1 }))).toEqual({ kind: 'unknown' })
  })

  it('клиент иван при step=2 → unknown', () => {
    expect(parseCommand('клиент иван', ctx({ step: 2 }))).toEqual({ kind: 'unknown' })
  })

  it('камень X при step=1 → unknown', () => {
    expect(parseCommand('камень бельгийский', ctx({ step: 1 }))).toEqual({ kind: 'unknown' })
  })

  it('цена 500 при step=2 → unknown (цена только на Z-1)', () => {
    expect(parseCommand('цена 500', ctx({ step: 2 }))).toEqual({ kind: 'unknown' })
  })

  it('примечание при step=1 → unknown (комментарий только на Z-2)', () => {
    expect(parseCommand('примечание долгая правка', ctx({ step: 1 }))).toEqual({ kind: 'unknown' })
  })

  it('сталь d2 при step=2 → unknown', () => {
    expect(parseCommand('сталь d2', ctx({ step: 2 }))).toEqual({ kind: 'unknown' })
  })
})

describe('Навигация', () => {
  it('дальше → nav:next', () => {
    expect(parseCommand('дальше', ctx())).toEqual({ kind: 'nav', action: 'next' })
  })

  it('следующее → nav:next', () => {
    expect(parseCommand('следующее', ctx())).toEqual({ kind: 'nav', action: 'next' })
  })

  it('далее → nav:next', () => {
    expect(parseCommand('далее', ctx())).toEqual({ kind: 'nav', action: 'next' })
  })

  it('назад → nav:prev', () => {
    expect(parseCommand('назад', ctx({ step: 2 }))).toEqual({ kind: 'nav', action: 'prev' })
  })

  it('сохранить → submit{markDone:false}', () => {
    expect(parseCommand('сохранить', ctx())).toEqual({ kind: 'submit', markDone: false })
  })

  it('готово → submit{markDone:true}', () => {
    expect(parseCommand('готово', ctx())).toEqual({ kind: 'submit', markDone: true })
  })

  it('стоп → stop', () => {
    expect(parseCommand('стоп', ctx())).toEqual({ kind: 'stop' })
  })

  it('пауза → stop', () => {
    expect(parseCommand('пауза', ctx())).toEqual({ kind: 'stop' })
  })

  it('отмена → nav:cancel', () => {
    expect(parseCommand('отмена', ctx())).toEqual({ kind: 'nav', action: 'cancel' })
  })
})

describe('Подтверждение отмены', () => {
  it('awaitingCancelConfirm=true, "да" → confirmCancel', () => {
    expect(parseCommand('да', ctx({ awaitingCancelConfirm: true }))).toEqual({
      kind: 'confirmCancel',
    })
  })

  it('awaitingCancelConfirm=true, другая команда → обычный парс', () => {
    expect(parseCommand('угол 20', ctx({ step: 2, awaitingCancelConfirm: true }))).toEqual({
      kind: 'field', field: 'angle', value: '20',
    })
  })

  it('awaitingCancelConfirm=false, "да" → unknown', () => {
    expect(parseCommand('да', ctx())).toEqual({ kind: 'unknown' })
  })
})

describe('Выбор из списка кандидатов', () => {
  const listCtx = (field: FieldKey, step: 1 | 2 = 1) =>
    ctx({ step, awaitingListField: field })

  it('первый → pickFromList', () => {
    expect(parseCommand('первый', listCtx('steel'))).toEqual({
      kind: 'pickFromList', hint: 'первый',
    })
  })

  it('один → pickFromList', () => {
    expect(parseCommand('один', listCtx('steel'))).toEqual({
      kind: 'pickFromList', hint: 'один',
    })
  })

  it('восемь (значение из списка) → pickFromList', () => {
    expect(parseCommand('восемь', listCtx('steel'))).toEqual({
      kind: 'pickFromList', hint: 'восемь',
    })
  })

  it('цифра "8" → pickFromList', () => {
    expect(parseCommand('8', listCtx('steel'))).toEqual({
      kind: 'pickFromList', hint: '8',
    })
  })

  it('сталь d2 → перезапуск поиска того же поля (field)', () => {
    expect(parseCommand('сталь d2', listCtx('steel'))).toEqual({
      kind: 'field', field: 'steel', value: 'd2',
    })
  })

  it('угол 20 при step=2 со списком → field (отменяет список)', () => {
    expect(parseCommand('угол 20', listCtx('steel', 2))).toEqual({
      kind: 'field', field: 'angle', value: '20',
    })
  })

  it('мусор при висящем списке → unknown', () => {
    expect(parseCommand('абракадабра', listCtx('steel'))).toEqual({ kind: 'unknown' })
  })

  it('awaitingListField=null, "первый" → unknown', () => {
    expect(parseCommand('первый', ctx())).toEqual({ kind: 'unknown' })
  })

  it('стоп при висящем списке → stop', () => {
    expect(parseCommand('стоп', listCtx('steel'))).toEqual({ kind: 'stop' })
  })
})

describe('Коррекции', () => {
  it('сотри сталь → clear:steel', () => {
    expect(parseCommand('сотри сталь', ctx())).toEqual({ kind: 'clear', field: 'steel' })
  })

  it('сотри клиент → clear:client', () => {
    expect(parseCommand('сотри клиент', ctx())).toEqual({ kind: 'clear', field: 'client' })
  })

  it('очисти примечание на step=2 → clear:notes', () => {
    expect(parseCommand('очисти примечание', ctx({ step: 2 }))).toEqual({ kind: 'clear', field: 'notes' })
  })

  it('сотри угол → clear:angle', () => {
    expect(parseCommand('сотри угол', ctx({ step: 2 }))).toEqual({ kind: 'clear', field: 'angle' })
  })

  it('повтори → repeat', () => {
    expect(parseCommand('повтори', ctx())).toEqual({ kind: 'repeat' })
  })

  it('что услышал → repeat', () => {
    expect(parseCommand('что услышал', ctx())).toEqual({ kind: 'repeat' })
  })

  it('сотри невалидное поле → unknown', () => {
    expect(parseCommand('сотри хрень', ctx())).toEqual({ kind: 'unknown' })
  })

  it('сотри камень на step=1 → unknown (поле чужого шага)', () => {
    expect(parseCommand('сотри камень', ctx({ step: 1 }))).toEqual({ kind: 'unknown' })
  })

  it('очисти hrc на step=2 → unknown (поле чужого шага)', () => {
    expect(parseCommand('очисти hrc', ctx({ step: 2 }))).toEqual({ kind: 'unknown' })
  })
})

describe('Числа словами', () => {
  it('угол двадцать → 20', () => {
    expect(parseCommand('угол двадцать', ctx({ step: 2 }))).toEqual({
      kind: 'field', field: 'angle', value: '20',
    })
  })

  it('угол двадцать пять → 25', () => {
    expect(parseCommand('угол двадцать пять', ctx({ step: 2 }))).toEqual({
      kind: 'field', field: 'angle', value: '25',
    })
  })

  it('цена пятьсот → 500', () => {
    expect(parseCommand('цена пятьсот', ctx({ step: 1 }))).toEqual({
      kind: 'field', field: 'price', value: '500',
    })
  })

  it('цена пятьсот пятьдесят → 550', () => {
    expect(parseCommand('цена пятьсот пятьдесят', ctx({ step: 1 }))).toEqual({
      kind: 'field', field: 'price', value: '550',
    })
  })

  it('цена один → 1', () => {
    expect(parseCommand('цена один', ctx({ step: 1 }))).toEqual({
      kind: 'field', field: 'price', value: '1',
    })
  })

  it('угол с нераспознанным словом → unknown', () => {
    expect(parseCommand('угол хрен', ctx({ step: 2 }))).toEqual({ kind: 'unknown' })
  })
})

describe('Шум распознавания', () => {
  it('сталь австрия восемь → field:steel с value «австрия восемь»', () => {
    expect(parseCommand('сталь австрия восемь', ctx())).toEqual({
      kind: 'field', field: 'steel', value: 'австрия восемь',
    })
  })

  it('мусорное слово до префикса (филлер) игнорируется', () => {
    expect(parseCommand('эм сталь d2', ctx())).toEqual({
      kind: 'field', field: 'steel', value: 'd2',
    })
  })

  it('филлер "ну" перед командой игнорируется', () => {
    expect(parseCommand('ну дальше', ctx())).toEqual({ kind: 'nav', action: 'next' })
  })
})

describe('Регистр и пунктуация', () => {
  it('верхний регистр в префиксе', () => {
    expect(parseCommand('КЛИЕНТ Иван', ctx())).toEqual({
      kind: 'field', field: 'client', value: 'Иван',
    })
  })

  it('финальная точка обрезается', () => {
    expect(parseCommand('сталь d2.', ctx())).toEqual({
      kind: 'field', field: 'steel', value: 'd2',
    })
  })

  it('лишние пробелы схлопываются', () => {
    expect(parseCommand('  сталь   d2  ', ctx())).toEqual({
      kind: 'field', field: 'steel', value: 'd2',
    })
  })

  it('Сохранить с большой буквы', () => {
    expect(parseCommand('Сохранить', ctx())).toEqual({ kind: 'submit', markDone: false })
  })
})

describe('Пустой / мусорный ввод', () => {
  it('пустая строка → unknown', () => {
    expect(parseCommand('', ctx())).toEqual({ kind: 'unknown' })
  })

  it('только пробелы → unknown', () => {
    expect(parseCommand('   ', ctx())).toEqual({ kind: 'unknown' })
  })

  it('фраза без префикса (иван) → unknown', () => {
    expect(parseCommand('иван', ctx())).toEqual({ kind: 'unknown' })
  })

  it('абракадабра → unknown', () => {
    expect(parseCommand('xyz', ctx())).toEqual({ kind: 'unknown' })
  })

  it('префикс без значения (один токен "сталь") → unknown', () => {
    expect(parseCommand('сталь', ctx())).toEqual({ kind: 'unknown' })
  })
})

// ── English grammar ──────────────────────────────────────────────────────────

const en = (over: Partial<CommandContext> = {}): CommandContext => ({
  step: 1,
  awaitingListField: null,
  awaitingCancelConfirm: false,
  ...over,
})

describe('EN: field commands (step=1)', () => {
  it('client <name> → field:client', () => {
    expect(parseCommand('client John', en(), 'en')).toEqual({ kind: 'field', field: 'client', value: 'John' })
  })
  it('knife <name> → field:knife', () => {
    expect(parseCommand('knife Mora', en(), 'en')).toEqual({ kind: 'field', field: 'knife', value: 'Mora' })
  })
  it('steel <name> → field:steel', () => {
    expect(parseCommand('steel D2', en(), 'en')).toEqual({ kind: 'field', field: 'steel', value: 'D2' })
  })
  it('hardness <n> → field:hrc', () => {
    expect(parseCommand('hardness 58', en(), 'en')).toEqual({ kind: 'field', field: 'hrc', value: '58' })
  })
  it('hrc <n> → field:hrc', () => {
    expect(parseCommand('hrc 60', en(), 'en')).toEqual({ kind: 'field', field: 'hrc', value: '60' })
  })
  it('price <n> → field:price', () => {
    expect(parseCommand('price 50', en(), 'en')).toEqual({ kind: 'field', field: 'price', value: '50' })
  })
  it('price twenty → field:price 20', () => {
    expect(parseCommand('price twenty', en(), 'en')).toEqual({ kind: 'field', field: 'price', value: '20' })
  })
})

describe('EN: condition → canonical RU key', () => {
  it('condition sharpening → заточка', () => {
    expect(parseCommand('condition sharpening', en(), 'en')).toEqual({ kind: 'field', field: 'condition', value: 'заточка' })
  })
  it('condition edge → правка РК', () => {
    expect(parseCommand('condition edge', en(), 'en')).toEqual({ kind: 'field', field: 'condition', value: 'правка РК' })
  })
  it('condition repair → ремонт', () => {
    expect(parseCommand('condition repair', en(), 'en')).toEqual({ kind: 'field', field: 'condition', value: 'ремонт' })
  })
  it('condition unknown → unknown', () => {
    expect(parseCommand('condition something weird', en(), 'en')).toEqual({ kind: 'unknown' })
  })
})

describe('EN: step=2 fields', () => {
  it('stone <name> → field:stone', () => {
    expect(parseCommand('stone Shapton 1000', en({ step: 2 }), 'en')).toEqual({ kind: 'field', field: 'stone', value: 'Shapton 1000' })
  })
  it('angle 15 → field:angle', () => {
    expect(parseCommand('angle 15', en({ step: 2 }), 'en')).toEqual({ kind: 'field', field: 'angle', value: '15' })
  })
  it('angle fifteen → field:angle 15', () => {
    expect(parseCommand('angle fifteen', en({ step: 2 }), 'en')).toEqual({ kind: 'field', field: 'angle', value: '15' })
  })
  it('note <text> → field:notes', () => {
    expect(parseCommand('note handle cracked', en({ step: 2 }), 'en')).toEqual({ kind: 'field', field: 'notes', value: 'handle cracked' })
  })
  it('comment <text> → field:notes', () => {
    expect(parseCommand('comment long process', en({ step: 2 }), 'en')).toEqual({ kind: 'field', field: 'notes', value: 'long process' })
  })
})

describe('EN: wrong step → unknown', () => {
  it('angle on step=1 → unknown', () => {
    expect(parseCommand('angle 20', en({ step: 1 }), 'en')).toEqual({ kind: 'unknown' })
  })
  it('client on step=2 → unknown', () => {
    expect(parseCommand('client John', en({ step: 2 }), 'en')).toEqual({ kind: 'unknown' })
  })
})

describe('EN: single-word commands', () => {
  it('add → addStone', () => {
    expect(parseCommand('add', en({ step: 2 }), 'en')).toEqual({ kind: 'addStone' })
  })
  it('stop → stop', () => {
    expect(parseCommand('stop', en(), 'en')).toEqual({ kind: 'stop' })
  })
  it('pause → stop', () => {
    expect(parseCommand('pause', en(), 'en')).toEqual({ kind: 'stop' })
  })
  it('next → nav:next', () => {
    expect(parseCommand('next', en(), 'en')).toEqual({ kind: 'nav', action: 'next' })
  })
  it('back → nav:prev', () => {
    expect(parseCommand('back', en(), 'en')).toEqual({ kind: 'nav', action: 'prev' })
  })
  it('previous → nav:prev', () => {
    expect(parseCommand('previous', en(), 'en')).toEqual({ kind: 'nav', action: 'prev' })
  })
  it('cancel → nav:cancel', () => {
    expect(parseCommand('cancel', en(), 'en')).toEqual({ kind: 'nav', action: 'cancel' })
  })
  it('save → submit markDone=false', () => {
    expect(parseCommand('save', en(), 'en')).toEqual({ kind: 'submit', markDone: false })
  })
  it('done → submit markDone=true', () => {
    expect(parseCommand('done', en(), 'en')).toEqual({ kind: 'submit', markDone: true })
  })
  it('repeat → repeat', () => {
    expect(parseCommand('repeat', en(), 'en')).toEqual({ kind: 'repeat' })
  })
})

describe('EN: multi-word commands', () => {
  it('"what did you hear" → repeat', () => {
    expect(parseCommand('what did you hear', en(), 'en')).toEqual({ kind: 'repeat' })
  })
  it('"remove last stone" → removeLastStone', () => {
    expect(parseCommand('remove last stone', en({ step: 2 }), 'en')).toEqual({ kind: 'removeLastStone' })
  })
  it('"delete last stone" → removeLastStone', () => {
    expect(parseCommand('delete last stone', en({ step: 2 }), 'en')).toEqual({ kind: 'removeLastStone' })
  })
})

describe('EN: clear commands', () => {
  it('"clear steel" → clear:steel', () => {
    expect(parseCommand('clear steel', en(), 'en')).toEqual({ kind: 'clear', field: 'steel' })
  })
  it('"erase knife" → clear:knife', () => {
    expect(parseCommand('erase knife', en(), 'en')).toEqual({ kind: 'clear', field: 'knife' })
  })
  it('"clear angle" on step=2 → clear:angle', () => {
    expect(parseCommand('clear angle', en({ step: 2 }), 'en')).toEqual({ kind: 'clear', field: 'angle' })
  })
  it('"clear angle" on step=1 → unknown (wrong step)', () => {
    expect(parseCommand('clear angle', en({ step: 1 }), 'en')).toEqual({ kind: 'unknown' })
  })
})

describe('EN: cancel confirm', () => {
  it('"yes" while awaitingCancelConfirm → confirmCancel', () => {
    expect(parseCommand('yes', en({ awaitingCancelConfirm: true }), 'en')).toEqual({ kind: 'confirmCancel' })
  })
  it('"yes" without awaiting → unknown', () => {
    expect(parseCommand('yes', en(), 'en')).toEqual({ kind: 'unknown' })
  })
})

describe('EN: list picking', () => {
  const listCtx = (f: FieldKey, step: 1 | 2 = 1): CommandContext =>
    en({ awaitingListField: f, step })

  it('"first" → pickFromList', () => {
    expect(parseCommand('first', listCtx('steel'), 'en')).toEqual({ kind: 'pickFromList', hint: 'first' })
  })
  it('"one" → pickFromList', () => {
    expect(parseCommand('one', listCtx('steel'), 'en')).toEqual({ kind: 'pickFromList', hint: 'one' })
  })
  it('"3" → pickFromList', () => {
    expect(parseCommand('3', listCtx('steel'), 'en')).toEqual({ kind: 'pickFromList', hint: '3' })
  })
  it('"stop" overrides list picking', () => {
    expect(parseCommand('stop', listCtx('steel'), 'en')).toEqual({ kind: 'stop' })
  })
})

describe('EN: fillers stripped', () => {
  it('"um steel D2" → field:steel D2', () => {
    expect(parseCommand('um steel D2', en(), 'en')).toEqual({ kind: 'field', field: 'steel', value: 'D2' })
  })
  it('"uh next" → nav:next', () => {
    expect(parseCommand('uh next', en(), 'en')).toEqual({ kind: 'nav', action: 'next' })
  })
})

describe('EN: edge cases', () => {
  it('empty → unknown', () => {
    expect(parseCommand('', en(), 'en')).toEqual({ kind: 'unknown' })
  })
  it('unknown word → unknown', () => {
    expect(parseCommand('foobar', en(), 'en')).toEqual({ kind: 'unknown' })
  })
  it('prefix only "steel" → unknown', () => {
    expect(parseCommand('steel', en(), 'en')).toEqual({ kind: 'unknown' })
  })
  it('UPPERCASE "CLIENT John" → field:client', () => {
    expect(parseCommand('CLIENT John', en(), 'en')).toEqual({ kind: 'field', field: 'client', value: 'John' })
  })
})
