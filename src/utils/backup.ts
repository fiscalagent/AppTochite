import type { AppTochiteDB, Client, Sharpening, Stone, Steel, Knife, Meta } from '../db/instance'
import type { Table } from 'dexie'
import { GRIT_TABLE } from '../data/gritTable'
import { ru } from '../i18n/dict'
import { queryDirectoryPermission, requestDirectoryPermission, pickDirectory } from './fileSystemAccess'
import { normSteel } from './steelMatch'
import { uuid } from './uuid'

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

// ─── Folder backup (File System Access API) ──────────────────────────────────
// Хранит FileSystemDirectoryHandle прямо в IndexedDB (structured clone).
// Файл apptochite-auto.json пишется в реальную папку пользователя —
// Chrome не трогает её при очистке своего хранилища.

const FOLDER_HANDLE_KEY = 'autoBackupFolderHandle'
const FOLDER_LAST_AT_KEY = 'autoBackupFolderLastAt'
const FOLDER_FILENAME = 'apptochite-auto.json'
const FOLDER_FILENAME_PREV = 'apptochite-auto-prev.json'
const FOLDER_NAME_LS_KEY = 'bk_folderName'

export function getFolderNameHint(): string | null {
  try { return localStorage.getItem(FOLDER_NAME_LS_KEY) } catch { return null }
}

const SENTINEL_KEY = 'bk_sentinel'

export async function writeSentinel(database: AppTochiteDB): Promise<void> {
  try {
    const count = await database.sharpenings.filter(sh => !sh.deletedAt).count()
    localStorage.setItem(SENTINEL_KEY, JSON.stringify({ sharpenings: count, updatedAt: new Date().toISOString() }))
  } catch { /* localStorage not available */ }
}

export function readSentinel(): { sharpenings: number; updatedAt: string } | null {
  try {
    const raw = localStorage.getItem(SENTINEL_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export interface FolderBackupMeta {
  folderName: string
  lastAt: Date | null
}

export async function getFolderBackupMeta(database: AppTochiteDB): Promise<FolderBackupMeta | null> {
  const entry = await database.settings.get(FOLDER_HANDLE_KEY)
  if (!entry) return null
  const handle = entry.value as FileSystemDirectoryHandle
  const lastEntry = await database.settings.get(FOLDER_LAST_AT_KEY)
  return {
    folderName: handle.name,
    lastAt: lastEntry ? new Date(lastEntry.value as string) : null,
  }
}

async function writeFolderFile(handle: FileSystemDirectoryHandle, database: AppTochiteDB): Promise<void> {
  const backup = await exportBackup(database)

  // Отказываемся перезаписывать, если база выглядит пустой (очистка Chrome).
  // Клиент «Я» всегда присутствует — его отсутствие означает потерю данных.
  if (!isValidBackup(backup) || backup.data.clients.length === 0) {
    throw new Error('folder backup aborted: DB appears empty')
  }

  const json = JSON.stringify(backup)

  // Ротация: текущий файл → prev перед перезаписью.
  try {
    const curHandle = await handle.getFileHandle(FOLDER_FILENAME)
    const curFile = await curHandle.getFile()
    if (curFile.size > 0) {
      const prevHandle = await handle.getFileHandle(FOLDER_FILENAME_PREV, { create: true })
      const prevWritable = await prevHandle.createWritable()
      await prevWritable.write(await curFile.text())
      await prevWritable.close()
    }
  } catch { /* первый бэкап — prev ещё нет */ }

  const fileHandle = await handle.getFileHandle(FOLDER_FILENAME, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(json)
  await writable.close()
  await database.settings.put({ key: FOLDER_LAST_AT_KEY, value: new Date().toISOString() })
  await updateLastBackupAt(database)
  writeSentinel(database).catch(() => {})
}

// Вызывается из авто-бэкапа (без жеста пользователя) — только если уже granted.
export async function performFolderBackup(database: AppTochiteDB): Promise<void> {
  const entry = await database.settings.get(FOLDER_HANDLE_KEY)
  if (!entry) return
  const handle = entry.value as FileSystemDirectoryHandle
  const perm = await queryDirectoryPermission(handle)
  if (perm !== 'granted') return
  await writeFolderFile(handle, database)
}

// Вызывается по кнопке (есть жест) — может показать диалог разрешения.
// Возвращает 'ok' | 'no-folder' | 'no-permission' | 'error'
export async function saveFolderBackupNow(database: AppTochiteDB): Promise<'ok' | 'no-folder' | 'no-permission' | 'error'> {
  const entry = await database.settings.get(FOLDER_HANDLE_KEY)
  if (!entry) return 'no-folder'
  const handle = entry.value as FileSystemDirectoryHandle
  let perm = await queryDirectoryPermission(handle)
  if (perm !== 'granted') perm = await requestDirectoryPermission(handle)
  if (perm !== 'granted') return 'no-permission'
  try {
    await writeFolderFile(handle, database)
    return 'ok'
  } catch {
    return 'error'
  }
}

// Пользователь выбирает папку: сохраняем handle, имя в LS и сразу пишем первый бэкап.
// Тихо регистрируем Periodic Background Sync — пользователю не нужно делать ничего лишнего.
export async function pickAndConnectFolder(database: AppTochiteDB): Promise<FolderBackupMeta> {
  const handle = await pickDirectory()
  await database.settings.put({ key: FOLDER_HANDLE_KEY, value: handle })
  try { localStorage.setItem(FOLDER_NAME_LS_KEY, handle.name) } catch { /* silent */ }
  await writeFolderFile(handle, database)
  enablePeriodicSync().catch(() => {})
  return { folderName: handle.name, lastAt: new Date() }
}

export async function disconnectFolder(database: AppTochiteDB): Promise<void> {
  await database.settings.delete(FOLDER_HANDLE_KEY)
  await database.settings.delete(FOLDER_LAST_AT_KEY)
  try { localStorage.removeItem(FOLDER_NAME_LS_KEY) } catch { /* silent */ }
}

export interface FolderPrevMeta { date: Date; size: number }

async function getFolderHandleIfGranted(database: AppTochiteDB): Promise<FileSystemDirectoryHandle | null> {
  const entry = await database.settings.get(FOLDER_HANDLE_KEY)
  if (!entry) return null
  const handle = entry.value as FileSystemDirectoryHandle
  const perm = await queryDirectoryPermission(handle)
  return perm === 'granted' ? handle : null
}

export async function getFolderPrevMeta(database: AppTochiteDB): Promise<FolderPrevMeta | null> {
  try {
    const handle = await getFolderHandleIfGranted(database)
    if (!handle) return null
    const fh = await handle.getFileHandle(FOLDER_FILENAME_PREV)
    const file = await fh.getFile()
    if (file.size === 0) return null
    return { date: new Date(file.lastModified), size: file.size }
  } catch { return null }
}

export async function readFolderPrevBackup(database: AppTochiteDB): Promise<BackupFile | null> {
  try {
    const handle = await getFolderHandleIfGranted(database)
    if (!handle) return null
    const fh = await handle.getFileHandle(FOLDER_FILENAME_PREV)
    const file = await fh.getFile()
    if (file.size === 0) return null
    const parsed = JSON.parse(await file.text(), reviveDates)
    return isValidBackup(parsed) ? parsed : null
  } catch { return null }
}

export async function checkOPFSIntegrity(): Promise<boolean> {
  const backup = await readOPFSBackup()
  return backup !== null
}

// ─── Pre-restore snapshot ────────────────────────────────────────────────────
// Создаётся перед любым restore/merge: если восстановление прошло неудачно,
// пользователь может откатиться к этому снапшоту через BK-1.

const PRE_RESTORE_FILENAME = 'apptochite-before-restore.json'

export async function createPreRestoreSnapshot(database: AppTochiteDB): Promise<void> {
  try {
    const backup = await exportBackup(database)
    if (!isValidBackup(backup) || backup.data.clients.length === 0) return
    const root = await navigator.storage.getDirectory()
    const fh = await root.getFileHandle(PRE_RESTORE_FILENAME, { create: true })
    const w = await fh.createWritable()
    await w.write(JSON.stringify(backup))
    await w.close()
  } catch { /* silent — не блокируем restore */ }
}

export interface PreRestoreSnapshotMeta { date: Date; size: number }

export async function getPreRestoreSnapshotMeta(): Promise<PreRestoreSnapshotMeta | null> {
  try {
    const root = await navigator.storage.getDirectory()
    const fh = await root.getFileHandle(PRE_RESTORE_FILENAME)
    const file = await fh.getFile()
    if (file.size === 0) return null
    return { date: new Date(file.lastModified), size: file.size }
  } catch { return null }
}

export async function readPreRestoreSnapshot(): Promise<BackupFile | null> {
  try {
    const root = await navigator.storage.getDirectory()
    const fh = await root.getFileHandle(PRE_RESTORE_FILENAME)
    const file = await fh.getFile()
    if (file.size === 0) return null
    const parsed = JSON.parse(await file.text(), reviveDates)
    return isValidBackup(parsed) ? parsed : null
  } catch { return null }
}

// ─── Heal folder backup ───────────────────────────────────────────────────────
// При старте приложения: если handle есть и разрешение granted, но файл
// отсутствует или пуст — пересоздаём без участия пользователя.

export async function healFolderBackupIfNeeded(database: AppTochiteDB): Promise<void> {
  try {
    const entry = await database.settings.get(FOLDER_HANDLE_KEY)
    if (!entry) return
    const handle = entry.value as FileSystemDirectoryHandle
    const perm = await queryDirectoryPermission(handle)
    if (perm !== 'granted') return
    try {
      const fh = await handle.getFileHandle(FOLDER_FILENAME)
      const file = await fh.getFile()
      if (file.size > 0) return
    } catch { /* файл не найден */ }
    await writeFolderFile(handle, database)
  } catch { /* silent */ }
}

// ─── Periodic Background Sync ─────────────────────────────────────────────────
// Регистрирует периодический фоновый бэкап через Periodic Background Sync API.
// Требует разрешения periodic-background-sync (Chrome Android).
// Тег 'backup-sync' обрабатывается в src/sw.ts.

const PERIODIC_SYNC_TAG = 'backup-sync'
const PERIODIC_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000 // 1 раз в сутки

type SWWithPeriodicSync = ServiceWorkerRegistration & {
  periodicSync: {
    register(tag: string, opts: { minInterval: number }): Promise<void>
    unregister(tag: string): Promise<void>
    getTags(): Promise<string[]>
  }
}

export async function getPeriodicSyncStatus(): Promise<'on' | 'off' | 'unsupported'> {
  try {
    if (!('serviceWorker' in navigator)) return 'unsupported'
    const sw = await navigator.serviceWorker.ready as SWWithPeriodicSync
    if (!('periodicSync' in sw)) return 'unsupported'
    const tags = await sw.periodicSync.getTags()
    return tags.includes(PERIODIC_SYNC_TAG) ? 'on' : 'off'
  } catch { return 'unsupported' }
}

export async function enablePeriodicSync(): Promise<'ok' | 'denied' | 'unsupported'> {
  try {
    if (!('serviceWorker' in navigator)) return 'unsupported'
    const sw = await navigator.serviceWorker.ready as SWWithPeriodicSync
    if (!('periodicSync' in sw)) return 'unsupported'
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
    if (status.state === 'denied') return 'denied'
    await sw.periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: PERIODIC_SYNC_INTERVAL_MS })
    return 'ok'
  } catch { return 'unsupported' }
}

export async function disablePeriodicSync(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const sw = await navigator.serviceWorker.ready as SWWithPeriodicSync
    if (!('periodicSync' in sw)) return
    await sw.periodicSync.unregister(PERIODIC_SYNC_TAG)
  } catch { /* silent */ }
}

// ─── OPFS backup ─────────────────────────────────────────────────────────────

export async function performOPFSBackup(database: AppTochiteDB): Promise<void> {
  const root = await navigator.storage.getDirectory()

  await rotateDailyIfNeeded(root, database)

  const backup = await exportBackup(database)

  if (!isValidBackup(backup) || backup.data.clients.length === 0) {
    throw new Error('OPFS backup aborted: DB appears empty')
  }

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
  writeSentinel(database).catch(() => {})
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

// ─── Natural keys справочников ────────────────────────────────────────────────
// У справочных записей id тоже автоинкрементный (свой на устройстве), но есть
// естественный ключ содержимого — по нему merge и сопоставляет записи, поэтому
// одинаковые камни/стали/ножи двух устройств не плодят дубли и не перетирают
// чужие записи по совпавшему id.

function stoneNatKey(s: Stone): string {
  const grit = s.gritMk ? `mk:${s.gritMk}` : String(s.gritMicrons ?? s.gritFepa ?? s.gritJis ?? '')
  return `${s.brand.trim().toLowerCase()}|${grit}`
}

function steelNatKey(s: Steel): string {
  return normSteel(s.name)
}

function knifeNatKey(k: Knife): string {
  return `${k.brand.trim().toLowerCase()}|${(k.steel ?? '').trim().toLowerCase()}`
}

// Merge одного справочника: совпадение по natural key → LWW; новая запись —
// со своим id, если он свободен, иначе с новым автоинкрементным.
async function mergeRefTable<T extends { id?: number; updatedAt?: Date }>(
  table: Table<T>,
  records: T[],
  natKey: (r: T) => string,
  stats: MergeStats,
): Promise<void> {
  const deviceByKey = new Map<string, T>()
  await table.toCollection().each(rec => {
    const k = natKey(rec)
    if (!deviceByKey.has(k)) deviceByKey.set(k, rec)
  })

  for (const fileRecord of records) {
    if (!fileRecord.id) continue
    const k = natKey(fileRecord)
    const device = deviceByKey.get(k)
    if (device?.id != null) {
      if (newerInFile(device, fileRecord)) {
        await table.put({ ...fileRecord, id: device.id })
        stats.updated++
      } else {
        stats.skipped++
      }
    } else {
      const occupant = await table.get(fileRecord.id)
      let savedId = fileRecord.id
      if (occupant) {
        savedId = Number(await table.add({ ...fileRecord, id: undefined }))
      } else {
        await table.put(fileRecord)
      }
      deviceByKey.set(k, { ...fileRecord, id: savedId })
      stats.added++
    }
  }
}

// Merge бэкапа в живую базу. Идентичность записей:
//  - clients/sharpenings — по guid (схема v9); «Я» всегда мапится на локального
//    isSelf-клиента. Файлы без guid (старые экспорты) сопоставляются по id —
//    прежнее поведение для restore на том же устройстве.
//  - справочники — по natural key (см. выше).
// Коллизия id (запись другого устройства с занятым id) разрешается вставкой под
// новым автоинкрементным id; clientId заточек ремапится через clientIdMap.
export async function mergeBackup(database: AppTochiteDB, backup: BackupFile): Promise<MergeStats> {
  const stats: MergeStats = { added: 0, updated: 0, skipped: 0 }

  await database.transaction(
    'rw',
    [database.clients, database.sharpenings, database.stones, database.steels, database.knives, database.meta],
    async () => {
      // ── Клиенты ────────────────────────────────────────────────────────────
      // fileId → deviceId для записей, сменивших id (нужно заточкам ниже).
      const clientIdMap = new Map<number, number>()
      const localSelf = await database.clients.filter(c => c.isSelf).first()

      for (const fileClient of backup.data.clients) {
        if (!fileClient.id) continue

        let device: Client | undefined
        if (fileClient.isSelf) {
          device = localSelf
        } else if (fileClient.guid) {
          device = await database.clients.where('guid').equals(fileClient.guid).first()
        } else {
          // Легаси-файл без guid: по id, но локального «Я» не-self записью не трогаем.
          const byId = await database.clients.get(fileClient.id)
          device = byId && !byId.isSelf ? byId : undefined
        }

        if (device?.id != null) {
          if (device.id !== fileClient.id) clientIdMap.set(fileClient.id, device.id)
          if (shouldTakeFileSoftDeletable(device, fileClient)) {
            await database.clients.put({
              ...fileClient,
              id: device.id,
              guid: device.guid ?? fileClient.guid ?? uuid(),
            })
            stats.updated++
          } else {
            stats.skipped++
          }
        } else {
          const record: Client = { ...fileClient, guid: fileClient.guid ?? uuid() }
          const occupant = await database.clients.get(fileClient.id)
          if (occupant) {
            const newId = Number(await database.clients.add({ ...record, id: undefined }))
            clientIdMap.set(fileClient.id, newId)
          } else {
            await database.clients.put(record)
          }
          stats.added++
        }
      }

      // ── Заточки ────────────────────────────────────────────────────────────
      for (const fileSh of backup.data.sharpenings) {
        if (!fileSh.id) continue
        const clientId = clientIdMap.get(fileSh.clientId) ?? fileSh.clientId
        const candidate: Sharpening = { ...fileSh, clientId }

        let device: Sharpening | undefined
        if (fileSh.guid) {
          device = await database.sharpenings.where('guid').equals(fileSh.guid).first()
        } else {
          device = await database.sharpenings.get(fileSh.id)
        }

        if (device?.id != null) {
          if (shouldTakeFileSoftDeletable(device, candidate)) {
            await database.sharpenings.put({
              ...candidate,
              id: device.id,
              guid: device.guid ?? candidate.guid ?? uuid(),
            })
            stats.updated++
          } else {
            stats.skipped++
          }
        } else {
          const record: Sharpening = { ...candidate, guid: candidate.guid ?? uuid() }
          const occupant = await database.sharpenings.get(fileSh.id)
          if (occupant) {
            await database.sharpenings.add({ ...record, id: undefined })
          } else {
            await database.sharpenings.put(record)
          }
          stats.added++
        }
      }

      // ── Справочники ────────────────────────────────────────────────────────
      await mergeRefTable(database.stones, backup.data.stones.map(normalizeStoneFromBackup), stoneNatKey, stats)
      await mergeRefTable(database.steels, backup.data.steels, steelNatKey, stats)
      await mergeRefTable(database.knives, backup.data.knives, knifeNatKey, stats)

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
      // Записям из старых бэкапов (до v9) присваиваем guid прямо при восстановлении:
      // после restore в базе не должно быть записей без кросс-устройственной идентичности.
      const withGuid = <T extends { guid?: string }>(arr: T[]): T[] =>
        arr.map(r => (r.guid ? r : { ...r, guid: uuid() }))
      const putTasks = [
        database.clients.bulkPut(withGuid(backup.data.clients)),
        database.sharpenings.bulkPut(withGuid(backup.data.sharpenings)),
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
    'Тип работы', 'Угол °', 'Угол МП °', 'Порядок камня', 'Камень', 'Комментарий', 'Цена', 'Статус',
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
      sh.microbevelAngle ?? '',
    ]
    const suffix = [sh.comment ?? '', sh.price ?? '', ru.enums.status[sh.status] ?? sh.status]

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
