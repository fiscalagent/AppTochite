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
      kind: 'field', field: 'condition', value: 'правка',
    })
  })

  it('требуется правка рк → chip', () => {
    expect(parseCommand('требуется правка рк', ctx())).toEqual({
      kind: 'field', field: 'condition', value: 'правка рк',
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

  it('очисти примечание → clear:notes', () => {
    expect(parseCommand('очисти примечание', ctx())).toEqual({ kind: 'clear', field: 'notes' })
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
