import { describe, it, expect } from 'vitest'
import { enumLabel } from './index'
import { ru } from './dict'

describe('enumLabel — тотальность (гарантия безопасности данных)', () => {
  it('известный ключ → подпись', () => {
    expect(enumLabel(ru.enums.stoneType, 'ao')).toBe('ОА')
    expect(enumLabel(ru.enums.coolant, 'water')).toBe('вода')
    expect(enumLabel(ru.enums.status, 'done')).toBe('Готово')
  })

  it('НЕИЗВЕСТНЫЙ ключ возвращается как есть (raw) — данные не теряются', () => {
    expect(enumLabel(ru.enums.stoneType, 'мой-кастомный-тип')).toBe('мой-кастомный-тип')
    expect(enumLabel(ru.enums.condition, 'полировка')).toBe('полировка')
  })

  it('country: пустая карта в ru → всегда raw (каноническое == русское название)', () => {
    expect(enumLabel(ru.enums.country, 'Япония')).toBe('Япония')
    expect(enumLabel(ru.enums.country, 'Бахрейн')).toBe('Бахрейн')
  })

  it('пустое/отсутствующее значение → пустая строка', () => {
    expect(enumLabel(ru.enums.stoneType, undefined)).toBe('')
    expect(enumLabel(ru.enums.stoneType, null)).toBe('')
    expect(enumLabel(ru.enums.stoneType, '')).toBe('')
  })
})

describe('словарь ru', () => {
  it('plural-лист units.sharpenings работает', () => {
    expect(ru.units.sharpenings(1)).toBe('заточка')
    expect(ru.units.sharpenings(3)).toBe('заточки')
    expect(ru.units.sharpenings(5)).toBe('заточек')
  })

  it('в листьях-строках нет пустых значений (common)', () => {
    for (const [key, value] of Object.entries(ru.common)) {
      expect(value, `common.${key}`).not.toBe('')
    }
  })
})
