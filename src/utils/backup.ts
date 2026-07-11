import type { AppTochiteDB, Client, Sharpening, Stone, Steel, Knife, Meta } from '../db/instance'
import type { Table } from 'dexie'
import { GRIT_TABLE } from '../data/gritTable'
import { ru } from '../i18n/dict'
import { queryDirectoryPermission, requestDirectoryPermission, pickDirectory } from './fileSystemAccess'
import { normSteel } from './steelMatch'
import { uuid } from './uuid'
import { track } from '../services/analytics'

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

// День в формате YYYY-MM-DD по локальному времени устройства.
// Используется дневными гейтами авто-бэкапа (облако и папка).
export function localDayStr(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Лёгкая сигнатура содержимого: количество записей + максимальный updatedAt + сумма id
// по каждой таблице. updatedAt бампится при любом create/update/delete/restore,
// поэтому сигнатура ловит любые изменения, не сериализуя фото повторно. idSum ловит
// замену записи (delete+add) при неизменных count и max updatedAt: набор id меняется.
export function dataSignature(data: BackupFile['data']): string {
  const sig = (arr: { id?: number; updatedAt?: Date }[]) => {
    let max = 0
    let idSum = 0
    for (const r of arr) {
      const ts = r.updatedAt ? new Date(r.updatedAt).getTime() : 0
      if (ts > max) max = ts
      idSum += r.id ?? 0
    }
    return `${arr.length}:${max}:${idSum}`
  }
  return [data.clients, data.sharpenings, data.stones, data.steels, data.knives]
    .map(sig)
    .join('|')
}

const OPFS_FILENAME = 'apptochite-auto.json'
const OPFS_LAST_SIG_KEY = 'autoBackupOpfsLastSig' // сигнатура данных последней записи в OPFS
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
const FOLDER_LAST_SIG_KEY = 'autoBackupFolderLastSig'        // сигнатура данных последней записи
const FOLDER_LAST_CHECK_DAY_KEY = 'autoBackupFolderCheckDay' // день последней авто-проверки (YYYY-MM-DD)
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
  size?: number   // размер текущего файла в папке (если доступ granted)
}

export async function getFolderBackupMeta(database: AppTochiteDB): Promise<FolderBackupMeta | null> {
  const entry = await database.settings.get(FOLDER_HANDLE_KEY)
  if (!entry) return null
  const handle = entry.value as FileSystemDirectoryHandle
  const lastEntry = await database.settings.get(FOLDER_LAST_AT_KEY)
  // Размер текущего файла — только если доступ к папке уже выдан (без запроса).
  let size: number | undefined
  try {
    if (await queryDirectoryPermission(handle, 'read') === 'granted') {
      const fh = await handle.getFileHandle(FOLDER_FILENAME)
      const file = await fh.getFile()
      if (file.size > 0) size = file.size
    }
  } catch { /* нет файла/доступа — размер неизвестен */ }
  return {
    folderName: handle.name,
    lastAt: lastEntry ? new Date(lastEntry.value as string) : null,
    size,
  }
}

// Пишет уже готовый backup в папку. Валидность проверяет вызывающий код
// (для дневного гейта/сигнатуры backup всё равно нужен заранее), здесь —
// последняя защита от перезаписи пустой базой (очистка Chrome).
async function writeFolderFile(handle: FileSystemDirectoryHandle, database: AppTochiteDB, backup: BackupFile): Promise<void> {
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
  await database.settings.bulkPut([
    { key: FOLDER_LAST_AT_KEY, value: new Date().toISOString() },
    { key: FOLDER_LAST_SIG_KEY, value: dataSignature(backup.data) },
    { key: FOLDER_LAST_CHECK_DAY_KEY, value: localDayStr() },
  ])
  await updateLastBackupAt(database)
  writeSentinel(database).catch(() => {})
}

// Авто-бэкап в папку (без жеста). Та же политика, что у облака
// (см. performCloudBackup): не чаще раза в сутки и только при изменении данных.
//  1) Дневной гейт — тяжёлый exportBackup максимум раз в календарный день,
//     а не на каждом возврате приложения в фокус.
//  2) Сигнатура — если данные не менялись с прошлой записи, не трогаем файл.
// Ручная запись («Сохранить сейчас») гейт обходит.
export async function performFolderBackup(database: AppTochiteDB): Promise<void> {
  const entry = await database.settings.get(FOLDER_HANDLE_KEY)
  if (!entry) return
  const handle = entry.value as FileSystemDirectoryHandle
  if (await queryDirectoryPermission(handle) !== 'granted') return

  const today = localDayStr()
  const checkEntry = await database.settings.get(FOLDER_LAST_CHECK_DAY_KEY)
  if (checkEntry?.value === today) return

  // Помечаем день проверенным сразу — чтобы при отсутствии изменений не гонять
  // exportBackup повторно на каждом фокусе в течение дня. При сбое гейт снимаем.
  await database.settings.put({ key: FOLDER_LAST_CHECK_DAY_KEY, value: today })
  const clearDayGate = () =>
    database.settings.delete(FOLDER_LAST_CHECK_DAY_KEY).catch(() => {})

  try {
    const backup = await exportBackup(database)
    if (!isValidBackup(backup) || backup.data.clients.length === 0) return

    const sigEntry = await database.settings.get(FOLDER_LAST_SIG_KEY)
    if (dataSignature(backup.data) === sigEntry?.value) return // ничего не изменилось

    await writeFolderFile(handle, database, backup)
  } catch (err) {
    await clearDayGate()
    throw err
  }
}

// Вызывается по кнопке (есть жест) — может показать диалог разрешения.
// Гейт/сигнатуру не проверяет: пользователь явно просит записать сейчас.
// Возвращает 'ok' | 'no-folder' | 'no-permission' | 'error'
export async function saveFolderBackupNow(database: AppTochiteDB): Promise<'ok' | 'no-folder' | 'no-permission' | 'error'> {
  const entry = await database.settings.get(FOLDER_HANDLE_KEY)
  if (!entry) return 'no-folder'
  const handle = entry.value as FileSystemDirectoryHandle
  let perm = await queryDirectoryPermission(handle)
  if (perm !== 'granted') perm = await requestDirectoryPermission(handle)
  if (perm !== 'granted') return 'no-permission'
  try {
    await writeFolderFile(handle, database, await exportBackup(database))
    return 'ok'
  } catch {
    return 'error'
  }
}

// Пользователь выбирает папку: сохраняем handle, имя в LS и сразу пишем первый бэкап.
// Тихо регистрируем Periodic Background Sync — пользователю не нужно делать ничего лишнего.
export async function pickAndConnectFolder(database: AppTochiteDB): Promise<FolderBackupMeta> {
  const handle = await pickDirectory()
  // Только подключаем папку — не пишем (handle получен с доступом read).
  // Первую запись делает «Сохранить сейчас»: там requestPermission(readwrite)
  // в свежем жесте надёжно выдаёт доступ на запись.
  await database.settings.put({ key: FOLDER_HANDLE_KEY, value: handle })
  try { localStorage.setItem(FOLDER_NAME_LS_KEY, handle.name) } catch { /* silent */ }
  enablePeriodicSync().catch(() => {})
  return { folderName: handle.name, lastAt: null }
}

export async function disconnectFolder(database: AppTochiteDB): Promise<void> {
  await database.settings.bulkDelete([
    FOLDER_HANDLE_KEY,
    FOLDER_LAST_AT_KEY,
    FOLDER_LAST_SIG_KEY,        // иначе при переподключении гейт/сигнатура были бы устаревшими
    FOLDER_LAST_CHECK_DAY_KEY,
  ])
  try { localStorage.removeItem(FOLDER_NAME_LS_KEY) } catch { /* silent */ }
}

export interface FolderPrevMeta { date: Date; size: number }

// Для чтения нужен ровно read-доступ (не readwrite). Разрешение File System Access
// после завершения жеста (и почти всегда на мобильном/после перезагрузки) сваливается
// в 'prompt'. Поэтому при interactive=true (вызов под тапом «Восстановить») повышаем
// его через requestPermission — иначе чтение молча вернёт null, хотя файл на месте.
// При interactive=false (фоновая загрузка метаданных) только запрашиваем статус.
async function getFolderHandleForRead(
  database: AppTochiteDB,
  interactive: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  const entry = await database.settings.get(FOLDER_HANDLE_KEY)
  if (!entry) return null
  const handle = entry.value as FileSystemDirectoryHandle
  let perm = await queryDirectoryPermission(handle, 'read')
  if (perm !== 'granted' && interactive) perm = await requestDirectoryPermission(handle, 'read')
  return perm === 'granted' ? handle : null
}

export async function getFolderPrevMeta(database: AppTochiteDB): Promise<FolderPrevMeta | null> {
  try {
    const handle = await getFolderHandleForRead(database, false)
    if (!handle) return null
    const fh = await handle.getFileHandle(FOLDER_FILENAME_PREV)
    const file = await fh.getFile()
    if (file.size === 0) return null
    return { date: new Date(file.lastModified), size: file.size }
  } catch { return null }
}

export async function readFolderPrevBackup(database: AppTochiteDB): Promise<BackupFile | null> {
  try {
    const handle = await getFolderHandleForRead(database, true)
    if (!handle) return null
    const fh = await handle.getFileHandle(FOLDER_FILENAME_PREV)
    const file = await fh.getFile()
    if (file.size === 0) return null
    const parsed = JSON.parse(await file.text(), reviveDates)
    return isValidBackup(parsed) ? parsed : null
  } catch { return null }
}

// Чтение текущего файла из подключённой папки — для прямого «Восстановить из папки».
// Вызывается под тапом пользователя → можно повысить разрешение (interactive=true).
export async function readFolderBackup(database: AppTochiteDB): Promise<BackupFile | null> {
  try {
    const handle = await getFolderHandleForRead(database, true)
    if (!handle) return null
    const fh = await handle.getFileHandle(FOLDER_FILENAME)
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
    // Лечим пропавший файл — пишем напрямую, в обход дневного гейта.
    await writeFolderFile(handle, database, await exportBackup(database))
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

function errDetail(e: unknown): string {
  const err = e as { message?: string }
  return String(err?.message ?? e ?? 'unknown').slice(0, 200)
}

// OPFS (Origin Private File System) — фича самого WebView, а не наша реализация.
// В PWA (Chrome/десктоп) она давно и стабильно доступна, но в Android WebView
// APK-сборки поддержка зависит от версии системного WebView на конкретном
// устройстве — и мы никогда это не проверяли: сбой (в т.ч. сам метод
// navigator.storage.getDirectory отсутствует) молча глотался в AutoBackupContext.
// Телеметрия здесь — единственный способ узнать, реально ли этот уровень
// защиты работает у APK-пользователей.
export async function performOPFSBackup(database: AppTochiteDB): Promise<void> {
  if (!navigator.storage?.getDirectory) {
    track('opfs_unsupported').catch(() => {})
    throw new Error('OPFS unsupported: navigator.storage.getDirectory is missing')
  }

  try {
    const root = await navigator.storage.getDirectory()

    await rotateDailyIfNeeded(root, database)

    const backup = await exportBackup(database)

    if (!isValidBackup(backup) || backup.data.clients.length === 0) {
      // Пустая база (например, новый пользователь до первой заточки) — не сбой
      // OPFS, поэтому не шлём как ошибку.
      throw new Error('OPFS backup aborted: DB appears empty')
    }

    // В отличие от папки/облака, раньше здесь не было проверки на изменения —
    // JSON.stringify + запись файла гонялись на каждом debounce-окне (~2 мин)
    // даже когда данные не менялись. При большой базе (много фото) это заметно
    // грузило главный поток без всякой пользы. LAST_AUTO_DATE_KEY и lastBackupAt
    // всё равно обновляются ниже безусловно — rotateDailyIfNeeded зависит от даты
    // «последнего прогона», а не от факта записи файла.
    const signature = dataSignature(backup.data)
    const sigEntry = await database.settings.get(OPFS_LAST_SIG_KEY)
    if (signature !== sigEntry?.value) {
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

      await database.settings.put({ key: OPFS_LAST_SIG_KEY, value: signature })
    }

    await database.settings.put({ key: LAST_AUTO_DATE_KEY, value: ymd(new Date()) })
    await updateLastBackupAt(database)
    writeSentinel(database).catch(() => {})
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes('DB appears empty')) {
      track('opfs_backup_error', { detail: errDetail(e) }).catch(() => {})
    }
    throw e
  }
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

// exportBackup читает sharpenings целиком, включая все фото «до/после» в base64 —
// дорогая операция при большой базе. AutoBackupContext (OPFS/папка/облако) и экран
// бэкапа (shareFile, CSV, кнопка «Сохранить») могут запросить её почти одновременно
// (например, при возврате приложения в фокус) — без дедупликации это N параллельных
// полных чтений одних и тех же таблиц, которые забивают главный поток и «подвешивают» UI.
// Конкурентные вызовы для одной и той же БД переиспользуют один и тот же промис.
let inFlightExport: { db: AppTochiteDB; promise: Promise<BackupFile> } | null = null

export function exportBackup(database: AppTochiteDB): Promise<BackupFile> {
  if (inFlightExport && inFlightExport.db === database) return inFlightExport.promise
  const promise = (async () => {
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
  })()
  inFlightExport = { db: database, promise }
  promise.finally(() => {
    if (inFlightExport?.promise === promise) inFlightExport = null
  })
  return promise
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

// Нормализация поля-ключа: терпима к null/undefined и нестроковым значениям
// (кривой импорт мог записать число/пусто). natKey НЕ должен бросать — иначе одна
// битая справочная запись роняет весь mergeBackup (строится для каждой записи).
function lcKey(v: unknown): string {
  return String(v ?? '').trim().toLowerCase()
}

function stoneNatKey(s: Stone): string {
  const grit = s.gritMk ? `mk:${s.gritMk}` : String(s.gritMicrons ?? s.gritFepa ?? s.gritJis ?? '')
  return `${lcKey(s.brand)}|${grit}`
}

function steelNatKey(s: Steel): string {
  return normSteel(String(s.name ?? ''))
}

function knifeNatKey(k: Knife): string {
  return `${lcKey(k.brand)}|${lcKey(k.steel)}`
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
