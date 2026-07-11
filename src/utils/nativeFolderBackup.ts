// Папочный авто-бэкап для APK через Storage Access Framework (SAF).
//
// В PWA папка делается на File System Access API (showDirectoryPicker), которого
// в Android WebView нет. Раньше здесь был @capacitor/filesystem с фиксированной
// папкой Документы/AppTochite — но на Android 11+ scoped storage запрещает прямую
// запись туда, и «Сохранить» падал с «нет доступа к папке». Теперь пользователь
// сам выбирает папку системным пикером (нативный SafFolder-плагин), а мы держим
// persistable-доступ к её tree Uri. Политика — как у облака/веб-папки: дневной
// гейт + сигнатура (раз в сутки и только при изменении данных). Ротация:
// текущий → -prev. Пикер и первый бэкап под жестом, авто-запись потом без жеста.
//
// Плагин зовётся только из веток `import.meta.env.MODE === 'capacitor'` → в
// PWA-сборке Rollup ветку вырезает, нативный код в бандл не течёт.

import { SafFolder } from '../plugins/safFolder'
import { db as defaultDb } from '../db/instance'
import type { AppTochiteDB } from '../db/instance'
import { track } from '../services/analytics'
import {
  exportBackup,
  isValidBackup,
  dataSignature,
  localDayStr,
  updateLastBackupAt,
  reviveDates,
  type BackupFile,
} from './backup'

const FILE = 'apptochite-auto.json'
const FILE_PREV = 'apptochite-auto-prev.json'

const ENABLED_KEY = 'nativeFolderEnabled'
const URI_KEY = 'nativeFolderUri'
const NAME_KEY = 'nativeFolderName'
const LAST_AT_KEY = 'nativeFolderLastAt'
const LAST_SIG_KEY = 'nativeFolderLastSig'
const SKIP_MARK_KEY = 'nativeFolderSkipMark'

// Авто-бэкап тихо выходит на нескольких условиях (не включён, дневной гейт, нет
// доступа, данные не менялись) — и раньше эти пропуски были немыми: с устройства
// пользователя не приходило ничего, что объяснило бы, почему авто не пишет, а
// ручной работает. Здесь делаем причину видимой в телеметрии. Дедуп по дню держит
// объём в узде: одна причина — одно событие в сутки на устройство (иначе частые
// day_gate/unchanged флудили бы лист на каждом фокусе).
type SkipReason = 'disabled' | 'no_uri' | 'no_access' | 'empty' | 'unchanged'

async function trackSkip(database: AppTochiteDB, reason: SkipReason): Promise<void> {
  const mark = `${localDayStr()}:${reason}`
  const prev = await database.settings.get(SKIP_MARK_KEY)
  if (prev?.value === mark) return
  await database.settings.put({ key: SKIP_MARK_KEY, value: mark })
  track('nfb_auto_skip', { reason }).catch(() => {})
}

// detail — текст реальной ошибки: показывается пользователю в тосте
// (folderErrorDetail) и уходит в телеметрию, чтобы отказ не был немым.
export type NativeFolderResult =
  | { status: 'ok' }
  | { status: 'cancelled' }
  | { status: 'error'; detail: string }

// Отмена пикера — не ошибка: плагин reject'ит с code='CANCELLED'.
function isCancel(e: unknown): boolean {
  const err = e as { code?: string; message?: string }
  return err?.code === 'CANCELLED' || /cancel/i.test(String(err?.message ?? e ?? ''))
}

function errDetail(e: unknown): string {
  const err = e as { message?: string }
  return String(err?.message ?? e ?? 'unknown').slice(0, 200)
}

async function getFolderUri(database: AppTochiteDB): Promise<string | null> {
  const u = await database.settings.get(URI_KEY)
  return typeof u?.value === 'string' && u.value ? u.value : null
}

export async function isNativeFolderEnabled(database: AppTochiteDB = defaultDb): Promise<boolean> {
  const e = await database.settings.get(ENABLED_KEY)
  if (e?.value !== true) return false
  return (await getFolderUri(database)) !== null
}

export interface NativeFolderMeta {
  lastAt: Date | null
  size?: number
  folderName?: string
}

export async function getNativeFolderMeta(database: AppTochiteDB = defaultDb): Promise<NativeFolderMeta | null> {
  if (!(await isNativeFolderEnabled(database))) return null
  const at = await database.settings.get(LAST_AT_KEY)
  const lastAt = at?.value ? new Date(at.value as string) : null
  const nm = await database.settings.get(NAME_KEY)
  const folderName = typeof nm?.value === 'string' ? nm.value : undefined
  let size: number | undefined
  const uri = await getFolderUri(database)
  if (uri) {
    try {
      size = (await SafFolder.stat({ treeUri: uri, name: FILE })).size
    } catch { /* файла ещё нет */ }
  }
  return { lastAt, size, folderName }
}

async function writeBackupFile(database: AppTochiteDB, backup: BackupFile, uri: string): Promise<void> {
  // Защита от перезаписи пустой базой (клиент «Я» всегда есть).
  if (!isValidBackup(backup) || backup.data.clients.length === 0) {
    throw new Error('native folder backup aborted: DB appears empty')
  }
  // Ротация: текущий файл → -prev (если есть).
  try {
    const cur = await SafFolder.readFile({ treeUri: uri, name: FILE })
    await SafFolder.writeFile({ treeUri: uri, name: FILE_PREV, data: cur.data })
  } catch { /* первого файла ещё нет */ }
  await SafFolder.writeFile({ treeUri: uri, name: FILE, data: JSON.stringify(backup) })
  await database.settings.bulkPut([
    { key: LAST_AT_KEY, value: new Date().toISOString() },
    { key: LAST_SIG_KEY, value: dataSignature(backup.data) },
  ])
  await updateLastBackupAt(database)
}

async function storeFolder(database: AppTochiteDB, uri: string, name: string): Promise<void> {
  await database.settings.bulkPut([
    { key: URI_KEY, value: uri },
    { key: NAME_KEY, value: name },
  ])
}

// Включение под жестом: системный пикер папки + первый бэкап + флаг.
//
// Телеметрия цепочки: nfb_pick_start фиксируется ДО открытия пикера,
// nfb_pick_result — когда промис вернулся. Если у пользователя в статистике
// start есть, а result нет — процесс убили, пока пикер был открыт (Samsung/
// MIUI/EMUI), и выбор подхватит reconcilePickedFolder на следующем запуске.
export async function enableNativeFolderBackup(database: AppTochiteDB = defaultDb): Promise<NativeFolderResult> {
  track('nfb_pick_start').catch(() => {})
  let picked: { uri: string; name: string }
  try {
    picked = await SafFolder.pickFolder()
  } catch (e) {
    if (isCancel(e)) {
      track('nfb_pick_result', { outcome: 'cancelled' }).catch(() => {})
      return { status: 'cancelled' }
    }
    const detail = errDetail(e)
    track('nfb_pick_result', { outcome: 'error', detail }).catch(() => {})
    return { status: 'error', detail }
  }
  try {
    await storeFolder(database, picked.uri, picked.name)
    await writeBackupFile(database, await exportBackup(database), picked.uri)
    await database.settings.put({ key: ENABLED_KEY, value: true })
    await SafFolder.clearPendingFolder().catch(() => {})
    track('nfb_pick_result', { outcome: 'ok' }).catch(() => {})
    return { status: 'ok' }
  } catch (e) {
    const detail = errDetail(e)
    track('nfb_pick_result', { outcome: 'write_error', detail }).catch(() => {})
    return { status: 'error', detail }
  }
}

export async function disableNativeFolderBackup(database: AppTochiteDB = defaultDb): Promise<void> {
  await database.settings.bulkPut([
    { key: ENABLED_KEY, value: false },
    { key: URI_KEY, value: '' },
    { key: NAME_KEY, value: '' },
  ])
  // Иначе висящий pending воскресил бы папку при следующем reconcile.
  await SafFolder.clearPendingFolder().catch(() => {})
}

// Довыполнение выбора папки, прерванного смертью процесса. Пока открыт системный
// пикер, Samsung/MIUI/EMUI могут выгрузить приложение — WebView перезагружается,
// промис pickFolder исчезает, и выбранная папка «повисает» только в нативных
// SharedPreferences. Здесь подхватываем её и доводим включение до конца.
// Идемпотентно: если pending совпадает с уже подключённой папкой — просто чистим маркер.
export async function reconcilePickedFolder(database: AppTochiteDB = defaultDb): Promise<'restored' | 'none'> {
  let pending: { uri?: string; name?: string }
  try {
    pending = await SafFolder.getPendingFolder()
  } catch {
    return 'none'
  }
  if (!pending?.uri) return 'none'

  const current = await getFolderUri(database)
  if (current === pending.uri && (await isNativeFolderEnabled(database))) {
    await SafFolder.clearPendingFolder().catch(() => {})
    return 'none'
  }
  // Папку могли удалить/доступ отозвать, пока маркер висел — не ретраить вечно.
  const access = await SafFolder.checkAccess({ treeUri: pending.uri }).catch(() => ({ granted: false }))
  if (!access.granted) {
    track('nfb_reconciled', { outcome: 'no_access' }).catch(() => {})
    await SafFolder.clearPendingFolder().catch(() => {})
    return 'none'
  }
  try {
    await storeFolder(database, pending.uri, pending.name ?? '')
    await writeBackupFile(database, await exportBackup(database), pending.uri)
    await database.settings.put({ key: ENABLED_KEY, value: true })
    await SafFolder.clearPendingFolder().catch(() => {})
    // Прямое подтверждение гипотезы «процесс убили во время пикера»: это событие
    // возможно ТОЛЬКО если pickFolder не дожил до ответа, а выбор довыполнен здесь.
    track('nfb_reconciled', { outcome: 'restored' }).catch(() => {})
    return 'restored'
  } catch (e) {
    // Маркер не чистим — попробуем на следующем запуске.
    track('nfb_reconciled', { outcome: 'error', detail: errDetail(e) }).catch(() => {})
    return 'none'
  }
}

// Ручное «Сохранить сейчас» — в обход дневного гейта. Если доступ к папке
// утрачен (папку удалили/перемонтировали SD-карту) — под тем же жестом просим
// выбрать её заново системным пикером.
export async function saveNativeFolderBackupNow(database: AppTochiteDB = defaultDb): Promise<NativeFolderResult> {
  let uri = await getFolderUri(database)
  if (!uri) return { status: 'error', detail: 'no folder configured' }
  const access = await SafFolder.checkAccess({ treeUri: uri }).catch(() => ({ granted: false }))
  if (!access.granted) {
    try {
      const picked = await SafFolder.pickFolder()
      uri = picked.uri
      await storeFolder(database, picked.uri, picked.name)
    } catch (e) {
      return isCancel(e) ? { status: 'cancelled' } : { status: 'error', detail: errDetail(e) }
    }
  }
  try {
    await writeBackupFile(database, await exportBackup(database), uri)
    await SafFolder.clearPendingFolder().catch(() => {})
    return { status: 'ok' }
  } catch (e) {
    const detail = errDetail(e)
    track('nfb_save_error', { detail }).catch(() => {})
    return { status: 'error', detail }
  }
}

// Чтение текущего файла из папки — для «Восстановить из папки».
export async function readNativeFolderBackup(database: AppTochiteDB = defaultDb): Promise<BackupFile | null> {
  const uri = await getFolderUri(database)
  if (!uri) return null
  try {
    const res = await SafFolder.readFile({ treeUri: uri, name: FILE })
    return JSON.parse(res.data, reviveDates) as BackupFile
  } catch {
    return null
  }
}

// Авто-бэкап (без жеста): только если включён, доступ жив и данные изменились.
//
// Гейт на запись — СИГНАТУРА данных, а не календарный день. Раньше был дневной
// гейт (раз в сутки), но он терял правки того же дня: если первая проверка дня
// прошла на неизменных данных, добавленное позже до завтра в папку не попадало
// («добавил сегодня — авто не сохранило»). Дневной гейт заводили ради экономии
// тяжёлого exportBackup, но экономии не было: exportBackup всё равно выполняется
// на каждом фокусе в performOPFSBackup. Поэтому пишем при любом изменении данных;
// сигнатура (count+maxUpdatedAt+idSum) не даёт переписывать одно и то же.
export async function performNativeFolderBackup(database: AppTochiteDB = defaultDb): Promise<void> {
  // isNativeFolderEnabled разложен на два условия, чтобы отличить в телеметрии
  // «выключено» от «включено, но папка потеряна».
  const enabled = await database.settings.get(ENABLED_KEY)
  if (enabled?.value !== true) return trackSkip(database, 'disabled')
  const uri = await getFolderUri(database)
  if (!uri) return trackSkip(database, 'no_uri')

  try {
    // Без жеста пикер не показать — если доступ утрачен, тихо пропускаем
    // (пользователь восстановит через «Сохранить сейчас»).
    const access = await SafFolder.checkAccess({ treeUri: uri })
    if (!access.granted) return trackSkip(database, 'no_access')

    const backup = await exportBackup(database)
    if (!isValidBackup(backup) || backup.data.clients.length === 0) {
      return trackSkip(database, 'empty')
    }
    const sig = await database.settings.get(LAST_SIG_KEY)
    if (dataSignature(backup.data) === sig?.value) {
      return trackSkip(database, 'unchanged') // ничего не изменилось
    }
    await writeBackupFile(database, backup, uri)
  } catch (e) {
    track('nfb_auto_error', { detail: errDetail(e) }).catch(() => {})
  }
}
