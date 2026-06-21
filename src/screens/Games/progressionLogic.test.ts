import { describe, it, expect } from 'vitest'
import type { Stone } from '../../db/instance'
import { ROUND_SIZE, GAP, micronOf, scaleOf, scaleVariety, isSolved, pickRound } from './progressionLogic'

// Минимальный камень с заданными микронами и штатной шкалой.
function stone(id: number, microns: number, src: Stone['gritSource'] = 'jis'): Stone {
  return { id, brand: `S${id}`, gritMicrons: microns, gritSource: src, isCustom: false }
}

// Пул с большим запасом по разрыву и разными шкалами.
function makePool(): Stone[] {
  const scales: Stone['gritSource'][] = ['jis', 'fepa', 'mk', 'microns']
  return Array.from({ length: 16 }, (_, i) =>
    // микроны 0.5, 0.7, 1.0, ... растут в ~1.4 раза — разрыв заведомо >= GAP
    stone(i + 1, +(0.5 * Math.pow(1.4, i)).toFixed(2), scales[i % scales.length])
  )
}

describe('micronOf', () => {
  it('возвращает положительные микроны', () => {
    expect(micronOf(stone(1, 14.7))).toBe(14.7)
  })
  it('возвращает null без микрон или при некорректном значении', () => {
    expect(micronOf({ brand: 'X', isCustom: false })).toBeNull()
    expect(micronOf({ brand: 'X', gritMicrons: 0, isCustom: false })).toBeNull()
    expect(micronOf({ brand: 'X', gritMicrons: NaN, isCustom: false })).toBeNull()
  })
})

describe('scaleOf', () => {
  it('берёт штатную шкалу из gritSource', () => {
    expect(scaleOf(stone(1, 10, 'fepa'))).toBe('fepa')
    expect(scaleOf(stone(1, 10, 'mk'))).toBe('mk')
  })
  it('выводит шкалу из заполненного поля, если gritSource нет', () => {
    expect(scaleOf({ brand: 'X', gritMk: '50/40', isCustom: false })).toBe('mk')
    expect(scaleOf({ brand: 'X', gritFepa: 320, isCustom: false })).toBe('fepa')
    expect(scaleOf({ brand: 'X', gritJis: 1000, isCustom: false })).toBe('jis')
  })
})

describe('isSolved', () => {
  it('верно при невозрастающих микронах (грубое → финишное)', () => {
    expect(isSolved([stone(1, 60), stone(2, 30), stone(3, 14.7), stone(4, 3)])).toBe(true)
  })
  it('неверно при нарушении порядка', () => {
    expect(isSolved([stone(1, 60), stone(2, 14.7), stone(3, 30), stone(4, 3)])).toBe(false)
  })
})

describe('pickRound', () => {
  it('набирает ровно ROUND_SIZE камней', () => {
    const round = pickRound(makePool())
    expect(round).toHaveLength(ROUND_SIZE)
  })

  it('соседние камни в отсортированном наборе различаются не меньше чем в GAP раз', () => {
    const round = pickRound(makePool())
    const sorted = [...round].sort((a, b) => micronOf(b)! - micronOf(a)!)
    for (let i = 1; i < sorted.length; i++) {
      const ratio = micronOf(sorted[i - 1])! / micronOf(sorted[i])!
      expect(ratio).toBeGreaterThanOrEqual(GAP)
    }
  })

  it('набор всегда разрешим (есть однозначный порядок по микронам)', () => {
    const round = pickRound(makePool())
    const sorted = [...round].sort((a, b) => micronOf(b)! - micronOf(a)!)
    expect(isSolved(sorted)).toBe(true)
    // микроны попарно различны — нет неоднозначных позиций
    const microns = sorted.map(st => micronOf(st)!)
    expect(new Set(microns).size).toBe(microns.length)
  })

  it('стремится к разнообразию штатных шкал в наборе', () => {
    const round = pickRound(makePool())
    // в пуле 4 шкалы с хорошим разрывом — набор из 4 должен охватывать минимум 3
    expect(scaleVariety(round)).toBeGreaterThanOrEqual(3)
  })

  it('отбрасывает камни без известных микрон', () => {
    const pool: Stone[] = [
      ...makePool(),
      { brand: 'noMicrons', gritJis: 1000, isCustom: false },
    ]
    const round = pickRound(pool)
    expect(round.every(st => micronOf(st) != null)).toBe(true)
  })

  it('возвращает меньше камней, если пул слишком мал', () => {
    const round = pickRound([stone(1, 30, 'jis'), stone(2, 10, 'fepa')])
    expect(round.length).toBeLessThanOrEqual(2)
  })
})
