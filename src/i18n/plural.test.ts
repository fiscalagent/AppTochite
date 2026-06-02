import { describe, it, expect } from 'vitest'
import { plural } from './plural'

describe('plural', () => {
  const ruForms = { one: 'заточка', few: 'заточки', many: 'заточек', other: 'заточек' }

  it('русские формы: one / few / many', () => {
    expect(plural('ru', 1, ruForms)).toBe('заточка')
    expect(plural('ru', 2, ruForms)).toBe('заточки')
    expect(plural('ru', 4, ruForms)).toBe('заточки')
    expect(plural('ru', 5, ruForms)).toBe('заточек')
    expect(plural('ru', 21, ruForms)).toBe('заточка')
    expect(plural('ru', 22, ruForms)).toBe('заточки')
  })

  it('русское исключение 11–14 → many', () => {
    expect(plural('ru', 11, ruForms)).toBe('заточек')
    expect(plural('ru', 12, ruForms)).toBe('заточек')
    expect(plural('ru', 14, ruForms)).toBe('заточек')
    expect(plural('ru', 111, ruForms)).toBe('заточек')
  })

  it('английские формы: one / other', () => {
    const en = { one: '# knife', other: '# knives' }
    expect(plural('en', 1, en)).toBe('1 knife')
    expect(plural('en', 0, en)).toBe('0 knives')
    expect(plural('en', 5, en)).toBe('5 knives')
  })

  it('подстановка # на число', () => {
    expect(plural('ru', 3, { few: '# заточки', other: '# заточек' })).toBe('3 заточки')
  })

  it('фолбэк на other при отсутствии нужной формы', () => {
    expect(plural('ru', 1, { other: 'шт.' })).toBe('шт.')
  })

  it('пустая строка, если форма не найдена и нет other', () => {
    expect(plural('ru', 5, { one: 'x' })).toBe('')
  })
})
