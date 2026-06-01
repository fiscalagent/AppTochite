import type { Knife, Steel } from '../db/db'
import { matchSteel, type SteelMatch } from './steelMatch'

// ── Чтение файла ────────────────────────────────────────────────────────────
// xlsx читаем через read-excel-file динамическим импортом — библиотека грузится
// только когда пользователь реально импортирует файл, не утяжеляя бандл PWA.
export async function readSpreadsheet(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return parseCsv(await decodeText(file))
  }
  const readXlsxFile = (await import('read-excel-file/browser')).default
  // read-excel-file v9 по умолчанию возвращает Sheet[] ([{ sheet, data }]),
  // более старые версии — сразу строки. Нормализуем к string[][] (первый лист).
  const result = (await readXlsxFile(file)) as unknown
  const arr = result as unknown[]
  const rows = (Array.isArray(arr[0]) ? arr : (arr[0] as { data?: unknown[] })?.data ?? []) as unknown[][]
  return rows.map(r => r.map(cell => (cell == null ? '' : String(cell))))
}

// Декодирование CSV-файла с угадыванием кодировки: BOM UTF-8 / UTF-16LE,
// иначе UTF-8 с откатом на windows-1251 (частый случай Excel в RU-локали).
async function decodeText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buf)
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf)
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  return utf8.includes('�') ? new TextDecoder('windows-1251').decode(buf) : utf8
}

// ── CSV ───────────────────────────────────────────────────────────────────
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  let semi = 0
  let comma = 0
  let inQ = false
  for (const c of firstLine) {
    if (c === '"') inQ = !inQ
    else if (!inQ && c === ';') semi++
    else if (!inQ && c === ',') comma++
  }
  return comma > semi ? ',' : ';'
}

// Парсер CSV: BOM, кавычки с экранированием "", разделитель ;/, (автодетект),
// CRLF/LF. Возвращает только непустые строки.
export function parseCsv(input: string): string[][] {
  let text = input
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

// ── Определение колонок ──────────────────────────────────────────────────────
const NAME_HEADERS = ['название', 'нож', 'модель', 'наименование', 'brand', 'name', 'model', 'knife']
const STEEL_HEADERS = ['сталь', 'steel', 'марка', 'маркастали', 'материал', 'material']

function normHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '')
}

export interface ColumnMapping {
  nameCol: number
  steelCol: number | null
  hasHeader: boolean
}

// Автоопределение: по заголовкам-синонимам, иначе по позиции (кол.0=имя,
// кол.1=сталь). В превью пользователь сможет переопределить вручную.
export function detectColumns(rows: string[][]): ColumnMapping {
  if (rows.length === 0) return { nameCol: 0, steelCol: null, hasHeader: false }
  const headerNorm = rows[0].map(normHeader)
  const nameByHeader = headerNorm.findIndex(h => NAME_HEADERS.includes(h))
  const steelByHeader = headerNorm.findIndex(h => STEEL_HEADERS.includes(h))
  const hasHeader = nameByHeader !== -1 || steelByHeader !== -1

  if (!hasHeader) {
    return { nameCol: 0, steelCol: rows[0].length > 1 ? 1 : null, hasHeader: false }
  }
  return {
    nameCol: nameByHeader !== -1 ? nameByHeader : 0,
    steelCol: steelByHeader !== -1 ? steelByHeader : null,
    hasHeader: true,
  }
}

export interface RawRow {
  rowIndex: number // 0-based индекс в исходной сетке (включая заголовок)
  name: string
  steel: string
}

export function extractRows(rows: string[][], m: ColumnMapping): RawRow[] {
  const start = m.hasHeader ? 1 : 0
  const out: RawRow[] = []
  for (let i = start; i < rows.length; i++) {
    const r = rows[i]
    out.push({
      rowIndex: i,
      name: (r[m.nameCol] ?? '').trim(),
      steel: m.steelCol != null ? (r[m.steelCol] ?? '').trim() : '',
    })
  }
  return out
}

// ── Подготовка к импорту ──────────────────────────────────────────────────────
function normKnifeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type SkipReason = 'empty-name' | 'duplicate'

export interface PreparedKnife {
  rowIndex: number
  name: string
  rawSteel: string
  // null — если сталь в файле не указана (поле опционально).
  match: SteelMatch | null
}

export interface SkippedRow {
  rowIndex: number
  name: string
  reason: SkipReason
}

export interface PreparedImport {
  knives: PreparedKnife[]
  skipped: SkippedRow[]
}

// Чистая функция: валидирует строки, дедуплицирует ножи (против БД и внутри
// файла) по нормализованному имени, для каждой стали считает совпадение со
// справочником. Ничего не пишет — результат идёт в экран превью.
export function prepareImport(
  raws: RawRow[],
  existingKnives: Knife[],
  steels: Steel[],
): PreparedImport {
  const knives: PreparedKnife[] = []
  const skipped: SkippedRow[] = []
  const seen = new Set(existingKnives.map(k => normKnifeName(k.brand)))

  for (const raw of raws) {
    if (!raw.name) {
      skipped.push({ rowIndex: raw.rowIndex, name: '', reason: 'empty-name' })
      continue
    }
    const key = normKnifeName(raw.name)
    if (seen.has(key)) {
      skipped.push({ rowIndex: raw.rowIndex, name: raw.name, reason: 'duplicate' })
      continue
    }
    seen.add(key)
    knives.push({
      rowIndex: raw.rowIndex,
      name: raw.name,
      rawSteel: raw.steel,
      match: raw.steel ? matchSteel(raw.steel, steels) : null,
    })
  }
  return { knives, skipped }
}
