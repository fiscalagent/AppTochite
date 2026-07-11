import { describe, it, expect } from 'vitest'
import type { Steel, Knife } from '../db/db'
import {
  steelRowsFromGrid,
  knifeRowsFromGrid,
  buildSteelsCSV,
  buildKnivesCSV,
  diffSteels,
  diffKnives,
} from './refSync'

const steel = (name: string, hrc?: number, id?: number): Steel => ({ id, name, hrc, isCustom: false })
const knife = (brand: string, steelName?: string, country?: string, id?: number): Knife =>
  ({ id, brand, steel: steelName, country, isCustom: false })

describe('steelRowsFromGrid', () => {
  it('разбирает название и HRC по заголовкам', () => {
    const grid = [['Название', 'HRC'], ['VG-10', '60'], ['D2', '']]
    expect(steelRowsFromGrid(grid)).toEqual([
      { name: 'VG-10', hrc: 60 },
      { name: 'D2', hrc: undefined },
    ])
  })
  it('без колонки названия — пусто', () => {
    expect(steelRowsFromGrid([['Foo', 'HRC'], ['x', '1']])).toEqual([])
  })
  it('пропускает строки с пустым названием', () => {
    const grid = [['Название', 'HRC'], ['', '60']]
    expect(steelRowsFromGrid(grid)).toEqual([])
  })
})

describe('knifeRowsFromGrid', () => {
  it('разбирает бренд/сталь/страну по заголовкам', () => {
    const grid = [['Бренд', 'Сталь', 'Страна'], ['Mora Companion', '12C27', 'Швеция']]
    expect(knifeRowsFromGrid(grid)).toEqual([
      { brand: 'Mora Companion', steel: '12C27', country: 'Швеция' },
    ])
  })
  it('пустые сталь/страна — undefined', () => {
    const grid = [['Бренд', 'Сталь', 'Страна'], ['Puukko', '', '']]
    expect(knifeRowsFromGrid(grid)).toEqual([{ brand: 'Puukko', steel: undefined, country: undefined }])
  })
})

describe('buildSteelsCSV / steelRowsFromGrid — round-trip', () => {
  it('экспорт → парсинг даёт то же самое', () => {
    const steels = [steel('VG-10', 60), steel('D2')]
    const csv = buildSteelsCSV(steels)
    // buildCSV разделяет ';' и оборачивает поля в кавычки — это тот же грид,
    // что и в приложении получает readSpreadsheet после парсинга CSV.
    // buildCSV всегда добавляет BOM первым символом (см. backup.ts) — .slice(1) его убирает.
    const grid = csv.slice(1).split('\r\n').map(line =>
      line.split(';').map(cell => cell.replace(/^"|"$/g, ''))
    )
    expect(steelRowsFromGrid(grid)).toEqual([
      { name: 'VG-10', hrc: 60 },
      { name: 'D2', hrc: undefined },
    ])
  })
})

describe('buildKnivesCSV / knifeRowsFromGrid — round-trip', () => {
  it('экспорт → парсинг даёт то же самое', () => {
    const knives = [knife('Mora Companion', '12C27', 'Швеция'), knife('Puukko')]
    const csv = buildKnivesCSV(knives)
    // buildCSV всегда добавляет BOM первым символом (см. backup.ts) — .slice(1) его убирает.
    const grid = csv.slice(1).split('\r\n').map(line =>
      line.split(';').map(cell => cell.replace(/^"|"$/g, ''))
    )
    expect(knifeRowsFromGrid(grid)).toEqual([
      { brand: 'Mora Companion', steel: '12C27', country: 'Швеция' },
      { brand: 'Puukko', steel: undefined, country: undefined },
    ])
  })
})

describe('diffSteels', () => {
  it('без изменений — пустой diff', () => {
    const existing = [steel('VG-10', 60, 1)]
    const rows = [{ name: 'VG-10', hrc: 60 }]
    expect(diffSteels(existing, rows)).toEqual({ toAdd: [], toUpdate: [], toDelete: [] })
  })

  it('смена HRC — update', () => {
    const existing = [steel('VG-10', 60, 1)]
    const rows = [{ name: 'VG-10', hrc: 61 }]
    const diff = diffSteels(existing, rows)
    expect(diff.toAdd).toEqual([])
    expect(diff.toDelete).toEqual([])
    expect(diff.toUpdate).toEqual([{ id: 1, before: existing[0], patch: { hrc: 61 } }])
  })

  it('очистка HRC пустой ячейкой — update с hrc: undefined', () => {
    const existing = [steel('VG-10', 60, 1)]
    const rows = [{ name: 'VG-10', hrc: undefined }]
    const diff = diffSteels(existing, rows)
    expect(diff.toUpdate).toEqual([{ id: 1, before: existing[0], patch: { hrc: undefined } }])
  })

  it('новое имя — add', () => {
    const diff = diffSteels([], [{ name: 'D2', hrc: 61 }])
    expect(diff.toAdd).toEqual([{ name: 'D2', hrc: 61 }])
  })

  it('пропавшее из файла имя — delete', () => {
    const existing = [steel('VG-10', 60, 1)]
    const diff = diffSteels(existing, [])
    expect(diff.toDelete).toEqual(existing)
  })

  it('дубли в справочнике с одинаковым natural key (пунктуация/пробелы) — не трогаем ни одну', () => {
    // 'CPM CruWear' и 'CPM-CruWear' нормализуются в один ключ (normSteel убирает
    // пунктуацию) — до фикса это приводило к тому, что HRC одного дубля тихо
    // перезаписывался значением другого при неизменном файле.
    const existing = [steel('CPM CruWear', 64, 1), steel('CPM-CruWear', 65, 2)]
    const rows = [{ name: 'CPM CruWear', hrc: 64 }, { name: 'CPM-CruWear', hrc: 65 }]
    const diff = diffSteels(existing, rows)
    expect(diff).toEqual({ toAdd: [], toUpdate: [], toDelete: [] })
  })

  it('дубли по ключу: файл с одним из них не добавляет и не удаляет второй', () => {
    const existing = [steel('CPM CruWear', 64, 1), steel('CPM-CruWear', 65, 2)]
    const diff = diffSteels(existing, [{ name: 'CPM CruWear', hrc: 64 }])
    expect(diff).toEqual({ toAdd: [], toUpdate: [], toDelete: [] })
  })
})

describe('diffKnives', () => {
  it('смена страны при той же стали — update', () => {
    const existing = [knife('Mora Companion', '12C27', 'Швеция', 1)]
    const rows = [{ brand: 'Mora Companion', steel: '12C27', country: 'Норвегия' }]
    const diff = diffKnives(existing, rows)
    expect(diff.toUpdate).toEqual([{ id: 1, before: existing[0], patch: { country: 'Норвегия' } }])
    expect(diff.toAdd).toEqual([])
    expect(diff.toDelete).toEqual([])
  })

  it('смена стали — natural key меняется: delete старого + add нового', () => {
    const existing = [knife('Mora Companion', '12C27', 'Швеция', 1)]
    const rows = [{ brand: 'Mora Companion', steel: '14C28N', country: 'Швеция' }]
    const diff = diffKnives(existing, rows)
    expect(diff.toDelete).toEqual(existing)
    expect(diff.toAdd).toEqual([{ brand: 'Mora Companion', steel: '14C28N', country: 'Швеция' }])
    expect(diff.toUpdate).toEqual([])
  })

  it('пустой бренд — строка пропускается', () => {
    expect(knifeRowsFromGrid([['Бренд', 'Сталь'], ['', 'D2']])).toEqual([])
  })
})
