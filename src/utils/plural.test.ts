import { describe, it, expect } from 'vitest'
import { pluralRu } from './plural'

const F: [string, string, string] = ['заточка', 'заточки', 'заточек']

describe('pluralRu', () => {
  it('1, 21, 31, 101 → одна форма', () => {
    expect(pluralRu(1, F)).toBe('заточка')
    expect(pluralRu(21, F)).toBe('заточка')
    expect(pluralRu(31, F)).toBe('заточка')
    expect(pluralRu(101, F)).toBe('заточка')
  })

  it('2-4, 22-24, 32-34 → форма для нескольких', () => {
    expect(pluralRu(2, F)).toBe('заточки')
    expect(pluralRu(4, F)).toBe('заточки')
    expect(pluralRu(22, F)).toBe('заточки')
    expect(pluralRu(34, F)).toBe('заточки')
  })

  it('0, 5-20, 25-30, 100 → форма множества', () => {
    expect(pluralRu(0, F)).toBe('заточек')
    expect(pluralRu(5, F)).toBe('заточек')
    expect(pluralRu(20, F)).toBe('заточек')
    expect(pluralRu(25, F)).toBe('заточек')
    expect(pluralRu(100, F)).toBe('заточек')
  })

  it('11-14 — исключение, всегда множество (несмотря на mod10)', () => {
    expect(pluralRu(11, F)).toBe('заточек')
    expect(pluralRu(12, F)).toBe('заточек')
    expect(pluralRu(13, F)).toBe('заточек')
    expect(pluralRu(14, F)).toBe('заточек')
    expect(pluralRu(111, F)).toBe('заточек')
    expect(pluralRu(112, F)).toBe('заточек')
  })
})
