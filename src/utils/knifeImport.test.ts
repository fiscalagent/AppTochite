import { describe, it, expect } from 'vitest'
import type { Knife, Steel } from '../db/db'
import {
  parseCsv,
  detectColumns,
  extractRows,
  prepareImport,
} from './knifeImport'

const steel = (name: string): Steel => ({ name, isCustom: false })
const knife = (brand: string): Knife => ({ brand, isCustom: false })
const REF = ['95Х18', '65Х13', 'D2'].map(steel)

describe('parseCsv', () => {
  it('разбирает ;-разделитель с BOM и CRLF', () => {
    const csv = '﻿Название;Сталь\r\nФинка;95Х18\r\nЯкут;\r\n'
    expect(parseCsv(csv)).toEqual([
      ['Название', 'Сталь'],
      ['Финка', '95Х18'],
      ['Якут', ''],
    ])
  })
  it('автоопределяет ,-разделитель', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('кавычки с экранированием и разделитель внутри поля', () => {
    expect(parseCsv('"Нож; складной";D2')).toEqual([['Нож; складной', 'D2']])
    expect(parseCsv('"Он сказал ""да""";x')).toEqual([['Он сказал "да"', 'x']])
  })
  it('отбрасывает полностью пустые строки', () => {
    expect(parseCsv('a;b\n;\nc;d')).toEqual([['a', 'b'], ['c', 'd']])
  })
})

describe('detectColumns', () => {
  it('находит колонки по заголовкам-синонимам', () => {
    expect(detectColumns([['Модель', 'Марка стали']])).toEqual({
      nameCol: 0, steelCol: 1, hasHeader: true,
    })
    expect(detectColumns([['Steel', 'Knife']])).toEqual({
      nameCol: 1, steelCol: 0, hasHeader: true,
    })
  })
  it('без заголовка — позиционно: кол.0=имя, кол.1=сталь', () => {
    expect(detectColumns([['Финка', '95Х18']])).toEqual({
      nameCol: 0, steelCol: 1, hasHeader: false,
    })
  })
  it('одна колонка без заголовка — только имя', () => {
    expect(detectColumns([['Финка']])).toEqual({
      nameCol: 0, steelCol: null, hasHeader: false,
    })
  })
})

describe('extractRows', () => {
  it('пропускает заголовок и тримит', () => {
    const rows = [['Название', 'Сталь'], [' Финка ', ' 95Х18 ']]
    expect(extractRows(rows, { nameCol: 0, steelCol: 1, hasHeader: true })).toEqual([
      { rowIndex: 1, name: 'Финка', steel: '95Х18' },
    ])
  })
  it('без steelCol сталь пустая', () => {
    const rows = [['Финка'], ['Якут']]
    expect(extractRows(rows, { nameCol: 0, steelCol: null, hasHeader: false })).toEqual([
      { rowIndex: 0, name: 'Финка', steel: '' },
      { rowIndex: 1, name: 'Якут', steel: '' },
    ])
  })
})

describe('prepareImport', () => {
  it('точное совпадение стали (латинская x) попадает в exact', () => {
    const raws = [{ rowIndex: 1, name: 'Финка', steel: '95x18' }]
    const { knives, skipped } = prepareImport(raws, [], REF)
    expect(skipped).toEqual([])
    expect(knives[0].match?.kind).toBe('exact')
    expect(knives[0].match?.steel?.name).toBe('95Х18')
  })

  it('сталь без указания — match null', () => {
    const raws = [{ rowIndex: 1, name: 'Якут', steel: '' }]
    expect(prepareImport(raws, [], REF).knives[0].match).toBeNull()
  })

  it('пустое имя — в skipped с причиной empty-name', () => {
    const raws = [{ rowIndex: 3, name: '', steel: 'D2' }]
    const { knives, skipped } = prepareImport(raws, [], REF)
    expect(knives).toEqual([])
    expect(skipped).toEqual([{ rowIndex: 3, name: '', reason: 'empty-name' }])
  })

  it('дубликат против существующих ножей — тот же бренд и та же сталь → skipped', () => {
    const raws = [{ rowIndex: 1, name: ' финка ', steel: 'D2' }]
    const { knives, skipped } = prepareImport(raws, [{ ...knife('Финка'), steel: 'D2' }], REF)
    expect(knives).toEqual([])
    expect(skipped[0].reason).toBe('duplicate')
  })

  it('тот же бренд, но другая сталь — не дубликат, а отдельный вариант ножа', () => {
    // Natural key ножа — бренд+сталь (knifeNatKey в backup.ts), как и везде в
    // приложении (merge бэкапов, синхронизация справочника). Дедуп только по
    // бренду молча пропускал бы легитимный вариант с другой сталью.
    const raws = [{ rowIndex: 1, name: 'Финка', steel: 'D2' }]
    const { knives, skipped } = prepareImport(raws, [{ ...knife('Финка'), steel: '95Х18' }], REF)
    expect(skipped).toEqual([])
    expect(knives).toHaveLength(1)
  })

  it('дубликат внутри файла — второе вхождение skipped', () => {
    const raws = [
      { rowIndex: 1, name: 'Финка', steel: '' },
      { rowIndex: 2, name: 'ФИНКА', steel: '' },
    ]
    const { knives, skipped } = prepareImport(raws, [], REF)
    expect(knives).toHaveLength(1)
    expect(skipped[0].rowIndex).toBe(2)
  })
})
