// Папочный авто-бэкап для APK через @capacitor/filesystem.
//
// В PWA папка делается на File System Access API (showDirectoryPicker), которого
// в Android WebView нет. Здесь нативный аналог: пишем в фиксированную папку
// Документы/AppTochite (без пикера). Политика — как у облака/веб-папки: дневной
// гейт + сигнатура (раз в сутки и только при изменении данных). Ротация:
// текущий → -prev. Включается под жестом (см. enable), авто-запись потом без жеста.
//
// Плагин импортируется динамически; модуль зовётся только из веток
// `import.meta.env.MODE === 'capacitor'` → в PWA-сборке Rollup его вырезает.

import { db as defaultDb } from '../db/instance'
import type { AppTochiteDB } from '../db/instance'
import {
  exportBackup,
  isValidBackup,
  dataSignature,
  localDayStr,
  updateLastBackupAt,
  reviveDates,
  type BackupFile,
} from './backup'

const SUBDIR = 'AppTochite'
const FILE = `${SUBDIR}/apptochite-auto.json`
const FILE_PREV = `${SUBDIR}/apptochite-auto-prev.json`

const ENABLED_KEY = 'nativeFolderEnabled'
const LAST_AT_KEY = 'nativeFolderLastAt'
const LAST_SIG_KEY = 'nativeFolderLastSig'
const CHECK_DAY_KEY = 'nativeFolderCheckDay'

// Видимое имя папки для UI.
export const NATIVE_FOLDER_LABEL = 'Документы/AppTochite'

async function fsApi() {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  return { Filesystem, dir: Directory.Documents, enc: Encoding.UTF8 }
}

// Лучшее усилие запросить доступ к публичной памяти (нужно не на всех версиях
// Android — современный путь идёт через MediaStore). Не блокируем при отказе:
// если запись реально упрётся в права, упадёт само и вызывающий покажет ошибку.
async function tryRequestPermission(): Promise<void> {
  try {
    const { Filesystem } = await import('@capacitor/filesystem')
    const p = await Filesystem.checkPermissions()
    if (p.publicStorage !== 'granted') await Filesystem.requestPermissions()
  } catch { /* метод может отсутствовать/не требоваться */ }
}

export async function isNativeFolderEnabled(database: AppTochiteDB = defaultDb): Promise<boolean> {
  const e = await database.settings.get(ENABLED_KEY)
  return e?.value === true
}

export interface NativeFolderMeta {
  lastAt: Date | null
  size?: number
}

export async function getNativeFolderMeta(database: AppTochiteDB = defaultDb): Promise<NativeFolderMeta | null> {
  if (!(await isNativeFolderEnabled(database))) return null
  const at = await database.settings.get(LAST_AT_KEY)
  const lastAt = at?.value ? new Date(at.value as string) : null
  let size: number | undefined
  try {
    const { Filesystem, dir } = await fsApi()
    const stat = await Filesystem.stat({ path: FILE, directory: dir })
    size = stat.size
  } catch { /* файла ещё нет */ }
  return { lastAt, size }
}

async function writeBackupFile(database: AppTochiteDB, backup: BackupFile): Promise<void> {
  // Защита от перезаписи пустой базой (клиент «Я» всегда есть).
  if (!isValidBackup(backup) || backup.data.clients.length === 0) {
    throw new Error('native folder backup aborted: DB appears empty')
  }
  const { Filesystem, dir, enc } = await fsApi()
  // Ротация: текущий файл → -prev (если есть).
  try {
    const cur = await Filesystem.readFile({ path: FILE, directory: dir, encoding: enc })
    await Filesystem.writeFile({ path: FILE_PREV, directory: dir, data: cur.data as string, encoding: enc, recursive: true })
  } catch { /* первого файла ещё нет */ }
  await Filesystem.writeFile({ path: FILE, directory: dir, data: JSON.stringify(backup), encoding: enc, recursive: true })
  await database.settings.bulkPut([
    { key: LAST_AT_KEY, value: new Date().toISOString() },
    { key: LAST_SIG_KEY, value: dataSignature(backup.data) },
    { key: CHECK_DAY_KEY, value: localDayStr() },
  ])
  await updateLastBackupAt(database)
}

// Включение под жестом: (best-effort доступ) + первый бэкап + выставить флаг.
export async function enableNativeFolderBackup(database: AppTochiteDB = defaultDb): Promise<'ok' | 'error'> {
  await tryRequestPermission()
  try {
    await writeBackupFile(database, await exportBackup(database))
    await database.settings.put({ key: ENABLED_KEY, value: true })
    return 'ok'
  } catch {
    return 'error'
  }
}

export async function disableNativeFolderBackup(database: AppTochiteDB = defaultDb): Promise<void> {
  await database.settings.put({ key: ENABLED_KEY, value: false })
}

// Ручное «Сохранить сейчас» — в обход дневного гейта.
export async function saveNativeFolderBackupNow(database: AppTochiteDB = defaultDb): Promise<'ok' | 'error'> {
  await tryRequestPermission()
  try {
    await writeBackupFile(database, await exportBackup(database))
    return 'ok'
  } catch {
    return 'error'
  }
}

// Чтение текущего файла из папки — для «Восстановить из папки».
export async function readNativeFolderBackup(): Promise<BackupFile | null> {
  try {
    const { Filesystem, dir, enc } = await fsApi()
    const res = await Filesystem.readFile({ path: FILE, directory: dir, encoding: enc })
    return JSON.parse(res.data as string, reviveDates) as BackupFile
  } catch {
    return null
  }
}

// Авто-бэкап (без жеста): только если включён, дневной гейт + сигнатура.
export async function performNativeFolderBackup(database: AppTochiteDB = defaultDb): Promise<void> {
  if (!(await isNativeFolderEnabled(database))) return

  const today = localDayStr()
  const check = await database.settings.get(CHECK_DAY_KEY)
  if (check?.value === today) return

  // Помечаем день проверенным сразу, чтобы не гонять exportBackup на каждом фокусе.
  await database.settings.put({ key: CHECK_DAY_KEY, value: today })
  try {
    const backup = await exportBackup(database)
    if (!isValidBackup(backup) || backup.data.clients.length === 0) return
    const sig = await database.settings.get(LAST_SIG_KEY)
    if (dataSignature(backup.data) === sig?.value) return // ничего не изменилось
    await writeBackupFile(database, backup)
  } catch {
    await database.settings.delete(CHECK_DAY_KEY).catch(() => {})
  }
}
