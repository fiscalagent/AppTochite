import type { AppTochiteDB, Client, Sharpening, Stone, Steel, Knife, Meta } from '../db/instance'
import { GRIT_TABLE } from '../data/gritTable'

function normalizeStoneFromBackup(raw: Stone): Stone {
  if (raw.gritSource != null) return raw
  const r = raw as unknown as Record<string, unknown>
  const grit = r['grit'] as number | undefined
  const gritUnit = r['gritUnit'] as string | undefined
  if (gritUnit === 'fepa' && grit != null) {
    const row = GRIT_TABLE.find(r => r.fepa === grit)
    return { ...raw, gritFepa: grit, gritJis: row?.jis, gritMicrons: row?.microns, gritMk: row?.gost, gritSource: 'fepa' }
  }
  if (gritUnit === 'jis' && grit != null) {
    const row = GRIT_TABLE.find(r => r.jis === grit)
    return { ...raw, gritJis: grit, gritFepa: row?.fepa, gritMicrons: row?.microns, gritMk: row?.gost, gritSource: 'jis' }
  }
  if (gritUnit === 'mk') {
    if (raw.gritMk) {
      const row = GRIT_TABLE.find(r => r.gost === raw.gritMk)
      return { ...raw, gritFepa: row?.fepa, gritJis: row?.jis, gritMicrons: row?.microns, gritSource: 'mk' }
    }
    return raw
  }
  if (grit != null) {
    const jisRow = GRIT_TABLE.find(r => r.jis === grit)
    if (jisRow) return { ...raw, gritJis: grit, gritFepa: jisRow.fepa, gritMicrons: jisRow.microns, gritMk: jisRow.gost, gritSource: 'jis' }
    const fepaRow = GRIT_TABLE.find(r => r.fepa === grit)
    if (fepaRow) return { ...raw, gritFepa: grit, gritJis: fepaRow.jis, gritMicrons: fepaRow.microns, gritMk: fepaRow.gost, gritSource: 'fepa' }
  }
  return raw
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function getLastBackupAt(database: AppTochiteDB): Promise<Date | null> {
  const entry = await database.settings.get('lastBackupAt')
  if (!entry) return null
  return new Date(entry.value as string)
}

export async function updateLastBackupAt(database: AppTochiteDB): Promise<void> {
  await database.settings.put({ key: 'lastBackupAt', value: new Date().toISOString() })
}

const OPFS_FILENAME = 'apptochite-auto.json'
const DAILY_PREFIX = 'apptochite-daily-'
const DAILY_FILENAME_KEY = 'dailyBackupFilename'
const LAST_AUTO_DATE_KEY = 'lastAutoBackupDate'

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dailyFilename(snapshotDate: string): string {
  return `${DAILY_PREFIX}${snapshotDate}.json`
}

function parseDailyDate(filename: string): string | null {
  if (!filename.startsWith(DAILY_PREFIX) || !filename.endsWith('.json')) return null
  const date = filename.slice(DAILY_PREFIX.length, -'.json'.length)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

async function getDailyFilename(database: AppTochiteDB): Promise<string | null> {
  const entry = await database.settings.get(DAILY_FILENAME_KEY)
  return entry ? (entry.value as string) : null
}

async function setDailyFilename(database: AppTochiteDB, name: string): Promise<void> {
  await database.settings.put({ key: DAILY_FILENAME_KEY, value: name })
}

async function rotateDailyIfNeeded(
  root: FileSystemDirectoryHandle,
  database: AppTochiteDB,
): Promise<void> {
  const today = ymd(new Date())
  const lastAutoEntry = await database.settings.get(LAST_AUTO_DATE_KEY)
  const lastAutoDate = lastAutoEntry ? (lastAutoEntry.value as string) : null
  if (lastAutoDate == null || lastAutoDate >= today) return

  let autoContent: string | null = null
  try {
    const autoHandle = await root.getFileHandle(OPFS_FILENAME)
    const file = await autoHandle.getFile()
    if (file.size > 0) autoContent = await file.text()
  } catch {
    return
  }
  if (!autoContent) return

  const newName = dailyFilename(lastAutoDate)
  const newHandle = await root.getFileHandle(newName, { create: true })
  const writable = await newHandle.createWritable()
  await writable.write(autoContent)
  await writable.close()

  const currentName = await getDailyFilename(database)
  if (currentName && currentName !== newName) {
    try { await root.removeEntry(currentName) } catch { /* already gone */ }
  }
  await setDailyFilename(database, newName)
}

async function verifyAutoBackup(
  root: FileSystemDirectoryHandle,
  expected: BackupFile,
): Promise<boolean> {
  try {
    const handle = await root.getFileHandle(OPFS_FILENAME)
    const file = await handle.getFile()
    const parsed = JSON.parse(await file.text(), reviveDates)
    if (!isValidBackup(parsed)) return false
    const e = expected.data
    const p = parsed.data
    return p.clients.length === e.clients.length
      && p.sharpenings.length === e.sharpenings.length
      && p.stones.length === e.stones.length
      && p.steels.length === e.steels.length
      && p.knives.length === e.knives.length
  } catch {
    return false
  }
}

export async function performOPFSBackup(database: AppTochiteDB): Promise<void> {
  const root = await navigator.storage.getDirectory()

  await rotateDailyIfNeeded(root, database)

  const backup = await exportBackup(database)
  const json = JSON.stringify(backup)
  const fileHandle = await root.getFileHandle(OPFS_FILENAME, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(json)
  await writable.close()

  const ok = await verifyAutoBackup(root, backup)
  if (!ok) {
    try { await root.removeEntry(OPFS_FILENAME) } catch { /* ignore */ }
    throw new Error('OPFS backup integrity check failed')
  }

  await database.settings.put({ key: LAST_AUTO_DATE_KEY, value: ymd(new Date()) })
  await updateLastBackupAt(database)
}

export interface OPFSBackupMeta {
  date: Date
  size: number
}

export async function getOPFSBackupMeta(): Promise<OPFSBackupMeta | null> {
  try {
    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle(OPFS_FILENAME)
    const file = await fileHandle.getFile()
    if (file.size === 0) return null
    return { date: new Date(file.lastModified), size: file.size }
  } catch {
    return null
  }
}

export async function readOPFSBackup(): Promise<BackupFile | null> {
  try {
    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle(OPFS_FILENAME)
    const file = await fileHandle.getFile()
    if (file.size === 0) return null
    const parsed = JSON.parse(await file.text(), reviveDates)
    return isValidBackup(parsed) ? parsed : null
  } catch {
    return null
  }
}

export interface DailyBackupMeta {
  date: Date
  size: number
  snapshotDate: string
}

export async function getDailyBackupMeta(database: AppTochiteDB): Promise<DailyBackupMeta | null> {
  const name = await getDailyFilename(database)
  if (!name) return null
  const snapshotDate = parseDailyDate(name)
  if (!snapshotDate) return null
  try {
    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle(name)
    const file = await fileHandle.getFile()
    if (file.size === 0) return null
    return { date: new Date(file.lastModified), size: file.size, snapshotDate }
  } catch {
    return null
  }
}

export async function readDailyBackup(database: AppTochiteDB): Promise<BackupFile | null> {
  const name = await getDailyFilename(database)
  if (!name) return null
  try {
    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle(name)
    const file = await fileHandle.getFile()
    if (file.size === 0) return null
    const parsed = JSON.parse(await file.text(), reviveDates)
    return isValidBackup(parsed) ? parsed : null
  } catch {
    return null
  }
}

export interface BackupFile {
  version: 1 | 2
  exportedAt: string
  data: {
    clients: Client[]
    sharpenings: Sharpening[]
    stones: Stone[]
    steels: Steel[]
    knives: Knife[]
    // meta появилось во v2, в старых файлах отсутствует — isValidBackup такие принимает.
    meta?: Meta[]
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

export function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value)
  return value
}

export function isValidBackup(obj: unknown): obj is BackupFile {
  if (!obj || typeof obj !== 'object') return false
  const b = obj as Record<string, unknown>
  if ((b.version !== 1 && b.version !== 2) || !b.exportedAt || !b.data || typeof b.data !== 'object') return false
  const d = b.data as Record<string, unknown>
  return ['clients', 'sharpenings', 'stones', 'steels', 'knives'].every(
    k => Array.isArray(d[k])
  )
}

export function buildCSV(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`
  return '﻿' + rows.map(r => r.map(escape).join(';')).join('\r\n')
}

export async function exportBackup(database: AppTochiteDB): Promise<BackupFile> {
  const [clients, sharpenings, stones, steels, knives, meta] = await Promise.all([
    database.clients.toArray(),
    database.sharpenings.toArray(),
    database.stones.toArray(),
    database.steels.toArray(),
    database.knives.toArray(),
    database.meta.toArray(),
  ])
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: { clients, sharpenings, stones, steels, knives, meta },
  }
}

export interface MergeStats {
  added: number
  updated: number
  skipped: number
}

function newerInFile<T extends { id?: number; updatedAt?: Date }>(device: T, file: T): boolean {
  const fileTs = file.updatedAt ? new Date(file.updatedAt).getTime() : 0
  const deviceTs = device.updatedAt ? new Date(device.updatedAt).getTime() : 0
  return fileTs > deviceTs
}

// Для clients/sharpenings: tombstone устройства sticky — не воскрешаем удалённую
// запись свежей версией из файла, если в файле нет deletedAt. Гарантирует 3-дневное
// окно корзины: восстановление из неё возможно только вручную через TrashScreen.
function shouldTakeFileSoftDeletable<T extends { updatedAt?: Date; deletedAt?: Date }>(
  device: T,
  file: T,
): boolean {
  if (device.deletedAt && !file.deletedAt) return false
  return newerInFile(device, file)
}

export async function mergeBackup(database: AppTochiteDB, backup: BackupFile): Promise<MergeStats> {
  const stats: MergeStats = { added: 0, updated: 0, skipped: 0 }

  await database.transaction(
    'rw',
    [database.clients, database.sharpenings, database.stones, database.steels, database.knives, database.meta],
    async () => {
      const tables = [
        { table: database.clients,     records: backup.data.clients,     softDelete: true  },
        { table: database.sharpenings, records: backup.data.sharpenings, softDelete: true  },
        { table: database.stones,      records: backup.data.stones,      softDelete: false },
        { table: database.steels,      records: backup.data.steels,      softDelete: false },
        { table: database.knives,      records: backup.data.knives,      softDelete: false },
      ] as const

      for (const { table, records, softDelete } of tables) {
        for (const rawRecord of records) {
          if (!rawRecord.id) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fileRecord = table === database.stones ? normalizeStoneFromBackup(rawRecord as Stone) as typeof rawRecord : rawRecord
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const deviceRecord = await (table as any).get(fileRecord.id)
          if (!deviceRecord) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (table as any).put(fileRecord)
            stats.added++
          } else {
            const takeFile = softDelete
              ? shouldTakeFileSoftDeletable(deviceRecord, fileRecord)
              : newerInFile(deviceRecord, fileRecord)
            if (takeFile) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (table as any).put(fileRecord)
              stats.updated++
            } else {
              stats.skipped++
            }
          }
        }
      }

      if (backup.data.meta) {
        for (const entry of backup.data.meta) {
          const existing = await database.meta.get(entry.key)
          if (!existing) await database.meta.put(entry)
        }
      }
    }
  )

  return stats
}

export async function restoreBackup(database: AppTochiteDB, backup: BackupFile): Promise<void> {
  await database.transaction(
    'rw',
    [database.clients, database.sharpenings, database.stones, database.steels, database.knives, database.meta],
    async () => {
      // meta трогаем только если в файле он есть. Иначе старый бэкап без meta
      // сбросит seedVersion → seed зальётся заново поверх восстановленных справочников.
      const hasMeta = Array.isArray(backup.data.meta) && backup.data.meta.length > 0
      const clearTasks = [
        database.clients.clear(),
        database.sharpenings.clear(),
        database.stones.clear(),
        database.steels.clear(),
        database.knives.clear(),
      ]
      if (hasMeta) clearTasks.push(database.meta.clear())
      await Promise.all(clearTasks)
      const putTasks = [
        database.clients.bulkPut(backup.data.clients),
        database.sharpenings.bulkPut(backup.data.sharpenings),
        database.stones.bulkPut(backup.data.stones.map(normalizeStoneFromBackup)),
        database.steels.bulkPut(backup.data.steels),
        database.knives.bulkPut(backup.data.knives),
      ]
      if (hasMeta) putTasks.push(database.meta.bulkPut(backup.data.meta!))
      await Promise.all(putTasks)
    }
  )
}

export function buildSharpeningCSV(
  sharpenings: Sharpening[],
  clientMap: Map<number, string>
): string {
  const toDate = (d: Date | string | undefined) =>
    d ? (d instanceof Date ? d : new Date(d)).toLocaleDateString('ru') : ''

  const headers = [
    '№ заточки', 'Дата приёмки', 'Дата готовности', 'Клиент', 'Нож', 'Сталь', 'HRC',
    'Тип работы', 'Угол °', 'Порядок камня', 'Камень', 'Комментарий', 'Цена', 'Статус',
  ]

  const rows: (string | number | null | undefined)[][] = []

  // Защита: даже если коллер забыл отфильтровать, удалённые заточки в отчёт не попадут.
  for (const sh of sharpenings.filter(s => !s.deletedAt)) {
    const base = [
      sh.id,
      toDate(sh.receivedAt),
      toDate(sh.doneAt),
      clientMap.get(sh.clientId) ?? '',
      sh.knifeBrand,
      sh.steel ?? '',
      sh.hrc ?? '',
      sh.condition?.join(', ') ?? '',
      sh.angle ?? '',
    ]
    const suffix = [sh.comment ?? '', sh.price ?? '', sh.status === 'done' ? 'Готово' : 'Принят']

    if (sh.stones && sh.stones.length > 0) {
      for (const st of sh.stones) {
        rows.push([...base, st.order, st.name, ...suffix])
      }
    } else {
      rows.push([...base, '', '', ...suffix])
    }
  }

  return buildCSV([headers, ...rows])
}
