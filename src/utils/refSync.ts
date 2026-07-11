// Полная синхронизация справочников «Стали»/«Ножи» с CSV/xlsx-файлом:
// экспорт → правка в Excel → импорт добавляет новое, обновляет изменившиеся
// поля и удаляет записи, которых не стало в файле. В отличие от импорта
// камней (только добавление) и свободного импорта ножей (KnifeImportPreview,
// тоже только добавление) — это единственный сценарий с реальным удалением.
//
// Идентичность записи — natural key из backup.ts (steelNatKey/knifeNatKey),
// та же, что использует mergeBackup для кросс-девайсного merge.

import type { Steel, Knife } from '../db/db'
import { buildCSV, steelNatKey, knifeNatKey } from './backup'

export interface ParsedSteelRow {
  name: string
  hrc?: number
}

export interface ParsedKnifeRow {
  brand: string
  steel?: string
  country?: string
}

function normHeader(s: string): string {
  return s.trim().toLowerCase()
}

const STEEL_NAME_HEADERS = ['название', 'name']
const HRC_HEADERS = ['hrc']
const KNIFE_BRAND_HEADERS = ['бренд', 'название', 'brand', 'name']
const KNIFE_STEEL_HEADERS = ['сталь', 'steel']
const KNIFE_COUNTRY_HEADERS = ['страна', 'country']

export function steelRowsFromGrid(grid: string[][]): ParsedSteelRow[] {
  if (grid.length < 2) return []
  const headers = grid[0].map(normHeader)
  const col = (...names: string[]) => headers.findIndex(h => names.includes(h))
  const cName = col(...STEEL_NAME_HEADERS)
  const cHrc = col(...HRC_HEADERS)
  if (cName === -1) return []

  const result: ParsedSteelRow[] = []
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i]
    const name = (row[cName] ?? '').trim()
    if (!name) continue
    const hrcRaw = cHrc >= 0 ? (row[cHrc] ?? '').trim() : ''
    const hrcVal = hrcRaw ? Number(hrcRaw) : NaN
    result.push({ name, hrc: !isNaN(hrcVal) ? hrcVal : undefined })
  }
  return result
}

export function knifeRowsFromGrid(grid: string[][]): ParsedKnifeRow[] {
  if (grid.length < 2) return []
  const headers = grid[0].map(normHeader)
  const col = (...names: string[]) => headers.findIndex(h => names.includes(h))
  const cBrand = col(...KNIFE_BRAND_HEADERS)
  const cSteel = col(...KNIFE_STEEL_HEADERS)
  const cCountry = col(...KNIFE_COUNTRY_HEADERS)
  if (cBrand === -1) return []

  const result: ParsedKnifeRow[] = []
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i]
    const brand = (row[cBrand] ?? '').trim()
    if (!brand) continue
    const steel = cSteel >= 0 ? (row[cSteel] ?? '').trim() : ''
    const country = cCountry >= 0 ? (row[cCountry] ?? '').trim() : ''
    result.push({ brand, steel: steel || undefined, country: country || undefined })
  }
  return result
}

export function buildSteelsCSV(steels: Steel[]): string {
  return buildCSV([
    ['Название', 'HRC'],
    ...steels.map(s => [s.name, s.hrc ?? null]),
  ])
}

export function buildKnivesCSV(knives: Knife[]): string {
  return buildCSV([
    ['Бренд', 'Сталь', 'Страна'],
    ...knives.map(k => [k.brand, k.steel ?? null, k.country ?? null]),
  ])
}

export interface RefSyncDiff<E, R> {
  toAdd: R[]
  toUpdate: { id: number; before: E; patch: Partial<E> }[]
  toDelete: E[]
}

// Общий diff для справочных таблиц: строки файла сверяются с текущими
// записями по natural key. Совпадение без расхождений в полях, которые несёт
// файл, игнорируется — patch строится только из полей, реально пришедших в
// CSV, поэтому поля вне формата (category/recommendedAngle/type/description)
// никогда не перезаписываются и не теряются.
function diffRefTable<E extends { id?: number }, R>(
  existing: E[],
  rows: R[],
  keyOfExisting: (e: E) => string,
  keyOfRow: (r: R) => string,
  buildPatch: (existing: E, row: R) => Partial<E>,
): RefSyncDiff<E, R> {
  // Сид-справочники (219 сталей/890 ножей) содержат редкие дубли, чьё имя
  // схлопывается в один natural key после нормализации (напр. «CPM CruWear»
  // и «CPM-CruWear» — normSteel убирает всю пунктуацию). Если не разбираться
  // с этим отдельно, «первый выигрывает» при сборке byKey тихо приписывает
  // HRC/страну одного дубля другому при совпадении по файлу — правки без
  // ведома пользователя. Поэтому такие ключи помечаем неоднозначными и вообще
  // не трогаем — ни add, ни update, ни delete, только ручное редактирование.
  const byKey = new Map<string, E>()
  const ambiguousKeys = new Set<string>()
  for (const e of existing) {
    const k = keyOfExisting(e)
    if (!k) continue
    if (byKey.has(k)) { ambiguousKeys.add(k); continue }
    byKey.set(k, e)
  }

  const seenKeys = new Set<string>()
  const toAdd: R[] = []
  const toUpdate: { id: number; before: E; patch: Partial<E> }[] = []

  for (const row of rows) {
    const k = keyOfRow(row)
    if (!k || ambiguousKeys.has(k)) continue
    seenKeys.add(k)
    const match = byKey.get(k)
    if (!match) {
      toAdd.push(row)
      continue
    }
    const patch = buildPatch(match, row)
    if (Object.keys(patch).length > 0) {
      toUpdate.push({ id: match.id!, before: match, patch })
    }
  }

  const toDelete = existing.filter(e => {
    const k = keyOfExisting(e)
    return !ambiguousKeys.has(k) && !seenKeys.has(k)
  })
  return { toAdd, toUpdate, toDelete }
}

export function diffSteels(existing: Steel[], rows: ParsedSteelRow[]): RefSyncDiff<Steel, ParsedSteelRow> {
  return diffRefTable(
    existing,
    rows,
    steelNatKey,
    row => steelNatKey({ name: row.name }),
    (existingSteel, row) => {
      const patch: Partial<Steel> = {}
      if ((existingSteel.hrc ?? undefined) !== row.hrc) patch.hrc = row.hrc
      return patch
    },
  )
}

export function diffKnives(existing: Knife[], rows: ParsedKnifeRow[]): RefSyncDiff<Knife, ParsedKnifeRow> {
  return diffRefTable(
    existing,
    rows,
    knifeNatKey,
    row => knifeNatKey({ brand: row.brand, steel: row.steel }),
    (existingKnife, row) => {
      const patch: Partial<Knife> = {}
      if ((existingKnife.country ?? '') !== (row.country ?? '')) patch.country = row.country
      return patch
    },
  )
}
