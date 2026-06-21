import { describe, it, expect } from 'vitest'
import {
  ANGLE_MIN,
  ANGLE_MAX,
  rndAngle,
  verdictOf,
  isHit,
  rankIndex,
  tiltLevel,
  tiltForRound,
  isTilted,
  contextKey,
  fullAngle,
} from './angleLogic'

describe('rndAngle', () => {
  it('держится в рабочем диапазоне на краях случайного источника', () => {
    expect(rndAngle(() => 0)).toBe(ANGLE_MIN)
    expect(rndAngle(() => 0.999999)).toBe(ANGLE_MAX)
    expect(rndAngle(() => 0.5)).toBe(Math.round((ANGLE_MIN + ANGLE_MAX) / 2))
  })
})

describe('verdictOf / isHit', () => {
  it('≤1° — в точку, ≤3° — засчитано, дальше — мимо', () => {
    expect(verdictOf(0)).toBe('perfect')
    expect(verdictOf(1)).toBe('perfect')
    expect(verdictOf(2)).toBe('ok')
    expect(verdictOf(3)).toBe('ok')
    expect(verdictOf(4)).toBe('bad')
  })
  it('isHit засчитывает промах в пределах допуска', () => {
    expect(isHit(3)).toBe(true)
    expect(isHit(4)).toBe(false)
  })
})

describe('ранги и наклон', () => {
  it('индекс звания растёт по достигнутым порогам серии', () => {
    expect(rankIndex(0)).toBe(0)
    expect(rankIndex(2)).toBe(0)
    expect(rankIndex(3)).toBe(1)
    expect(rankIndex(6)).toBe(2)
    expect(rankIndex(10)).toBe(3)
  })
  it('наклон разблокируется по званию', () => {
    expect(tiltLevel(0)).toBe(0)
    expect(tiltLevel(3)).toBe(1)
    expect(tiltLevel(6)).toBe(2)
  })
  it('на нулевом уровне наклона нет', () => {
    expect(tiltForRound(0, () => 0.5)).toBe(0)
    expect(isTilted(tiltForRound(0))).toBe(false)
  })
  it('на ненулевом уровне наклон в ожидаемых пределах вокруг базы', () => {
    // lvl 1 → база 15° ± 4° jitter; знак из второго вызова rnd
    const tilt = Math.abs(tiltForRound(3, () => 0.5)) // jitter 0, sign +
    expect(tilt).toBeGreaterThanOrEqual(11)
    expect(tilt).toBeLessThanOrEqual(19)
  })
})

describe('contextKey', () => {
  it('сопоставляет угол с типовым применением', () => {
    expect(contextKey(12)).toBe('razor')
    expect(contextKey(16)).toBe('jpKitchen')
    expect(contextKey(19)).toBe('euKitchen')
    expect(contextKey(23)).toBe('edc')
    expect(contextKey(28)).toBe('tourist')
    expect(contextKey(33)).toBe('axe')
  })
  it('за пределами таблицы — рабочая кромка', () => {
    expect(contextKey(5)).toBe('work')
    expect(contextKey(50)).toBe('work')
  })
})

describe('инвариант наклона', () => {
  it('истинный полный угол = 2·угол_на_сторону при любом наклоне', () => {
    for (const tilt of [0, 5, -15, 28, -33]) {
      expect(fullAngle(20, tilt)).toBeCloseTo(40, 6)
      expect(fullAngle(12, tilt)).toBeCloseTo(24, 6)
    }
  })
})
