import { describe, it, expect } from 'vitest'
import type { Steel } from '../db/db'
import { normSteel, steelSim, matchSteel } from './steelMatch'

const steel = (name: string): Steel => ({ name, isCustom: false })

// Подмножество реального справочника, достаточное для проверки матчинга.
const REF: Steel[] = [
  '95Х18', '110Х18', '65Х13', 'Х12МФ', 'ХВГ', '9ХС', 'У8', 'Р6М5',
  'D2', 'VG-10', 'M390', '440C', '8Cr13MoV',
].map(steel)

describe('normSteel', () => {
  it('сворачивает кириллическую х в латинскую x (не h)', () => {
    expect(normSteel('95Х18')).toBe('95x18')
    expect(normSteel('95x18')).toBe('95x18') // латинская x — то же самое
  })
  it('латинская и кириллическая запись марки совпадают', () => {
    expect(normSteel('Х12МФ')).toBe(normSteel('X12MF'))
  })
  it('Д→d: русское имя американской марки', () => {
    expect(normSteel('Д2')).toBe('d2')
    expect(normSteel('D2')).toBe('d2')
  })
  it('убирает разделители и регистр', () => {
    expect(normSteel('VG-10')).toBe('vg10')
    expect(normSteel('vg 10')).toBe('vg10')
    expect(normSteel('M-390')).toBe('m390')
  })
})

describe('steelSim', () => {
  it('точное совпадение нормализованных форм = 1', () => {
    expect(steelSim('95x18', '95Х18')).toBe(1)
    expect(steelSim('д2', 'D2')).toBe(1)
  })
  it('опечатка в одном символе короткой марки — высокая, но < 1', () => {
    const s = steelSim('95Х17', '95Х18')
    expect(s).toBeGreaterThan(0.5)
    expect(s).toBeLessThan(1)
  })
  it('разные марки — низкая близость', () => {
    expect(steelSim('VG-10', 'Х12МФ')).toBeLessThan(0.3)
  })
  it('пустой ввод = 0', () => {
    expect(steelSim('', '95Х18')).toBe(0)
  })
})

describe('matchSteel', () => {
  it('латинская x распознаётся как точное совпадение → применяем молча', () => {
    const r = matchSteel('95x18', REF)
    expect(r.kind).toBe('exact')
    expect(r.steel?.name).toBe('95Х18')
  })

  it('Д2 → точное совпадение с D2', () => {
    const r = matchSteel('Д2', REF)
    expect(r.kind).toBe('exact')
    expect(r.steel?.name).toBe('D2')
  })

  it('полная марка латиницей X12MF → Х12МФ точно', () => {
    const r = matchSteel('X12MF', REF)
    expect(r.kind).toBe('exact')
    expect(r.steel?.name).toBe('Х12МФ')
  })

  it('опечатка 95Х17 → fuzzy, лучший кандидат 95Х18', () => {
    const r = matchSteel('95Х17', REF)
    expect(r.kind).toBe('fuzzy')
    expect(r.steel?.name).toBe('95Х18')
    expect(r.suggestions[0]?.name).toBe('95Х18')
  })

  it('совсем чужая марка → none, но кандидаты для ручного выбора есть', () => {
    const r = matchSteel('Vanadis 4', REF)
    expect(r.kind).toBe('none')
    expect(r.steel).toBeUndefined()
  })

  it('пустой ввод / пустой справочник → none', () => {
    expect(matchSteel('', REF).kind).toBe('none')
    expect(matchSteel('95Х18', []).kind).toBe('none')
  })

  it('регистр и пробелы не мешают точному совпадению', () => {
    expect(matchSteel('vg 10', REF).kind).toBe('exact')
    expect(matchSteel('m-390', REF).steel?.name).toBe('M390')
  })
})
