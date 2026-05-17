import { describe, it, expect } from 'vitest'
import {
  findBestMatch,
  findAllMatches,
  pickFromFiltered,
  extractNumber,
  findClientMatch,
  containsDoneKeyword,
  bigramSim,
  levSim,
} from './voiceMatch'

describe('bigramSim', () => {
  it('returns 1 for identical strings', () => {
    expect(bigramSim('naniwa', 'naniwa')).toBe(1)
  })
  it('returns 0 for empty', () => {
    expect(bigramSim('', 'naniwa')).toBe(0)
    expect(bigramSim('naniwa', '')).toBe(0)
  })
  it('partial overlap is between 0 and 1', () => {
    const s = bigramSim('naniwa', 'naniva')
    expect(s).toBeGreaterThan(0.5)
    expect(s).toBeLessThan(1)
  })
})

describe('levSim', () => {
  it('returns 1 for identical', () => {
    expect(levSim('washita', 'washita')).toBe(1)
  })
  it('returns 0 for empty', () => {
    expect(levSim('', 'washita')).toBe(0)
  })
  it('single substitution scores high', () => {
    expect(levSim('vashita', 'washita')).toBeCloseTo(6 / 7, 2)
  })
})

describe('russian-pronunciation friendly matching', () => {
  // Real-world dictionary slice with similar-letter neighbors that previously
  // outranked the intended hit on bigram alone.
  const stones = [
    'Washita 400', 'Washita 800', 'Washita 1000', 'Arkansas Washita 1200', 'Washita Natural 800',
    'Naniwa Chosera 1000', 'Naniwa Chosera 5000',
    'Shapton Glass 1000', 'Shapton Pro 1000',
    'Suehiro Cerax 1000',
    'King 1000', 'King 6000',
    'Norton India', 'Belgian Coticule',
    'Arkansas Soft', 'Arkansas Hard', 'Atoma 400',
  ]

  it('"вашита" finds Washita variants (was broken with bigram-only)', () => {
    const m = findAllMatches('вашита', stones)
    expect(m).toContain('Washita 400')
    expect(m[0]).toMatch(/Washita/)
  })
  it('"вошита" still works', () => {
    expect(findAllMatches('вошита', stones)).toContain('Washita 400')
  })
  it('"шептон" finds Shapton', () => {
    expect(findAllMatches('шептон', stones).some(s => s.startsWith('Shapton'))).toBe(true)
  })
  it('"наньива" finds Naniwa', () => {
    expect(findAllMatches('наньива', stones).some(s => s.startsWith('Naniwa'))).toBe(true)
  })
  it('"кинг" finds King', () => {
    expect(findAllMatches('кинг', stones).some(s => s.startsWith('King'))).toBe(true)
  })
  it('"арканзас" finds Arkansas variants', () => {
    const m = findAllMatches('арканзас', stones)
    expect(m).toContain('Arkansas Soft')
    expect(m).toContain('Arkansas Hard')
  })
  it('"норка индия" finds Norton India', () => {
    expect(findAllMatches('норка индия', stones)).toContain('Norton India')
  })
  it('"атома" finds Atoma', () => {
    expect(findAllMatches('атома', stones)).toContain('Atoma 400')
  })
})

describe('findBestMatch', () => {
  it('finds direct latin match', () => {
    expect(findBestMatch('mora', ['Mora', 'Victorinox', 'Самодел'])).toBe('Mora')
  })
  it('matches cyrillic speech against latin name via translit', () => {
    expect(findBestMatch('наниwa 1000', ['Naniwa 1000', 'Shapton 2000'])).toBe('Naniwa 1000')
  })
  it('returns null below threshold', () => {
    expect(findBestMatch('xxxxxx', ['Naniwa 1000'])).toBeNull()
  })
})

describe('findAllMatches', () => {
  it('returns multiple candidates sorted by score', () => {
    const res = findAllMatches('наниwa', ['Naniwa 1000', 'Naniwa 2000', 'Shapton 1000'])
    expect(res[0]).toMatch(/^Naniwa/)
    expect(res.length).toBeGreaterThanOrEqual(2)
  })
  it('grit hit ranks higher (word boundary, no 1000 ⊂ 10000)', () => {
    const res = findAllMatches('1000', ['Naniwa 1000', 'Naniwa 10000', 'Shapton 1000'])
    expect(res).toContain('Naniwa 1000')
    expect(res).toContain('Shapton 1000')
    // 10000 should not match the "1000" grit signal
    const grit10000Hit = res.indexOf('Naniwa 10000')
    const grit1000Hit = res.indexOf('Naniwa 1000')
    expect(grit1000Hit).toBeLessThan(grit10000Hit === -1 ? 999 : grit10000Hit)
  })
})

describe('extractNumber', () => {
  it('extracts digits', () => {
    expect(extractNumber('15 градусов')).toBe('15')
    expect(extractNumber('500 рублей')).toBe('500')
  })
  it('parses decimals with comma', () => {
    expect(extractNumber('1,5')).toBe('1.5')
  })
  it('parses simple russian numerals', () => {
    expect(extractNumber('пятнадцать')).toBe('15')
    expect(extractNumber('пятнадцать градусов')).toBe('15')
    expect(extractNumber('пять')).toBe('5')
  })
  it('parses compound russian numerals', () => {
    expect(extractNumber('пятьсот')).toBe('500')
    expect(extractNumber('сто пятьдесят')).toBe('150')
    expect(extractNumber('двадцать пять')).toBe('25')
    expect(extractNumber('тысяча')).toBe('1000')
    expect(extractNumber('две тысячи')).toBe('2000')
  })
  it('returns empty for non-numeric speech', () => {
    expect(extractNumber('мора')).toBe('')
    expect(extractNumber('')).toBe('')
  })
})

describe('narrowFromFiltered', () => {
  it('narrows to all items containing the digit', async () => {
    const { narrowFromFiltered } = await import('./voiceMatch')
    const items = ['Grinderman 60', 'Grinderman 120 FEPA', 'Grinderman 120 JIS', 'Grinderman 220', 'Grinderman 400']
    expect(narrowFromFiltered('120', items)).toEqual(['Grinderman 120 FEPA', 'Grinderman 120 JIS'])
  })
  it('120 does not match 1200 (word boundary)', async () => {
    const { narrowFromFiltered } = await import('./voiceMatch')
    const items = ['Grinderman 120', 'Grinderman 1200']
    expect(narrowFromFiltered('120', items)).toEqual(['Grinderman 120'])
  })
  it('narrows by russian numeral word', async () => {
    const { narrowFromFiltered } = await import('./voiceMatch')
    const items = ['Grinderman 120 FEPA', 'Grinderman 220', 'Grinderman 400']
    expect(narrowFromFiltered('сто двадцать', items)).toEqual(['Grinderman 120 FEPA'])
  })
  it('falls back to ordinal index when number has no content match', async () => {
    const { narrowFromFiltered } = await import('./voiceMatch')
    const items = ['Naniwa A', 'Naniwa B', 'Naniwa C']
    expect(narrowFromFiltered('второй', items)).toEqual(['Naniwa B'])
  })
  it('narrows by fuzzy when no digit/ordinal', async () => {
    const { narrowFromFiltered } = await import('./voiceMatch')
    const items = ['Grinderman 120 FEPA', 'Grinderman 120 JIS', 'Grinderman 120 oil']
    const r = narrowFromFiltered('FEPA', items)
    expect(r).toContain('Grinderman 120 FEPA')
  })
  it('returns empty when no match in filtered list', async () => {
    const { narrowFromFiltered } = await import('./voiceMatch')
    const items = ['Grinderman 120', 'Grinderman 220']
    expect(narrowFromFiltered('zzzzz', items)).toEqual([])
  })
})

describe('pickFromFiltered', () => {
  const items = ['Naniwa 1000', 'Naniwa 2000', 'Shapton 5000']
  it('picks by ordinal', () => {
    expect(pickFromFiltered('первый', items)).toBe('Naniwa 1000')
    expect(pickFromFiltered('второй', items)).toBe('Naniwa 2000')
    expect(pickFromFiltered('третий', items)).toBe('Shapton 5000')
  })
  it('picks by digit position', () => {
    // "1" matches "1000" by word boundary? No — "1" is not \b1\b in "1000". Falls back to index.
    expect(pickFromFiltered('1', items)).toBe('Naniwa 1000')
  })
  it('picks by grit content', () => {
    expect(pickFromFiltered('2000', items)).toBe('Naniwa 2000')
    expect(pickFromFiltered('5000', items)).toBe('Shapton 5000')
  })
  it('1000 does not pick 10000 (word boundary)', () => {
    const items2 = ['Naniwa 10000', 'Shapton 1000']
    expect(pickFromFiltered('1000', items2)).toBe('Shapton 1000')
  })
  it('falls back to fuzzy match', () => {
    expect(pickFromFiltered('шаптон', items)).toBe('Shapton 5000')
  })
  it('returns null on empty list', () => {
    expect(pickFromFiltered('первый', [])).toBeNull()
  })
})

describe('findClientMatch', () => {
  const names = ['Я', 'Бузова', 'Иван Петров', 'Алексей']
  it('matches by name token', () => {
    expect(findClientMatch('бузова', names)).toBe('Бузова')
    expect(findClientMatch('иван', names)).toBe('Иван Петров')
  })
  it('matches "Я" only when explicitly said, not from any word containing я', () => {
    expect(findClientMatch('я', names)).toBe('Я')
    // "иван" contains no whole-word "я" → should NOT match "Я"
    expect(findClientMatch('иван', names)).toBe('Иван Петров')
  })
  it('returns null below threshold', () => {
    expect(findClientMatch('xxxxxx', names)).toBeNull()
  })
})

describe('containsDoneKeyword', () => {
  it('detects keywords', () => {
    expect(containsDoneKeyword('готово')).toBe(true)
    expect(containsDoneKeyword('всё готово')).toBe(true)
    expect(containsDoneKeyword('закончил работу')).toBe(true)
  })
  it('ignores substrings', () => {
    expect(containsDoneKeyword('подготовка')).toBe(false)
  })
  it('returns false for empty', () => {
    expect(containsDoneKeyword('принято')).toBe(false)
  })
})
