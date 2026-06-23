import type { AppTochiteDB } from '../db/instance'
import { exportBackup, type BackupFile } from './backup'
import { track } from '../services/analytics'

// ─── Константы ───────────────────────────────────────────────────────────────

const YANDEX_TOKEN_KEY = 'yandexToken'
const YANDEX_AUTO_KEY = 'yandexAutoBackup'
const YANDEX_LAST_AT_KEY = 'yandexLastBackupAt'
const YANDEX_LAST_SIG_KEY = 'yandexLastBackupSig'      // сигнатура данных последней успешной заливки
const YANDEX_LAST_CHECK_DAY_KEY = 'yandexLastCheckDay' // день последней авто-проверки (YYYY-MM-DD)
const CLOUD_DEVICE_ID_KEY = 'cloudDeviceId'            // стабильный id устройства для имён снапшотов

const APP_FOLDER = 'app:/'           // Яндекс.Диск: папка приложения (Приложения/<имя>)
const MAX_SNAPSHOTS = 7
const BACKUP_PREFIX = 'backup-'

const DISK_API = 'https://cloud-api.yandex.net/v1/disk'

// ─── Token CRUD ───────────────────────────────────────────────────────────────

export async function getYandexToken(database: AppTochiteDB): Promise<string | null> {
  const entry = await database.settings.get(YANDEX_TOKEN_KEY)
  return entry ? (entry.value as string) : null
}

export async function saveYandexToken(database: AppTochiteDB, token: string): Promise<void> {
  await database.settings.put({ key: YANDEX_TOKEN_KEY, value: token })
}

export async function removeYandexToken(database: AppTochiteDB): Promise<void> {
  await database.settings.bulkDelete([
    YANDEX_TOKEN_KEY,
    YANDEX_LAST_AT_KEY,
    YANDEX_AUTO_KEY,        // иначе авто-бэкап молча оживёт при переподключении
    YANDEX_LAST_SIG_KEY,
    YANDEX_LAST_CHECK_DAY_KEY,
  ])
}

// ─── Auto-backup setting ──────────────────────────────────────────────────────

export async function getCloudAutoBackup(database: AppTochiteDB): Promise<boolean> {
  const entry = await database.settings.get(YANDEX_AUTO_KEY)
  return entry ? (entry.value as boolean) : false
}

export async function setCloudAutoBackup(database: AppTochiteDB, value: boolean): Promise<void> {
  await database.settings.put({ key: YANDEX_AUTO_KEY, value })
}

export async function getCloudLastAt(database: AppTochiteDB): Promise<Date | null> {
  const entry = await database.settings.get(YANDEX_LAST_AT_KEY)
  return entry ? new Date(entry.value as string) : null
}

// ─── Device id ────────────────────────────────────────────────────────────────
// Стабильный короткий id этого устройства — входит в имя снапшота, чтобы устройства
// одного пользователя не перетирали файлы друг друга. Живёт в settings (вне бэкапа),
// независим от analyticsDeviceId (аналитику можно отключить).

async function getCloudDeviceId(database: AppTochiteDB): Promise<string> {
  const entry = await database.settings.get(CLOUD_DEVICE_ID_KEY)
  if (entry?.value) return entry.value as string
  const id = crypto.randomUUID().slice(0, 8)
  await database.settings.put({ key: CLOUD_DEVICE_ID_KEY, value: id })
  return id
}

// Прочитать id без создания — для листинга снапшотов до первой заливки.
export async function peekCloudDeviceId(database: AppTochiteDB): Promise<string | null> {
  const entry = await database.settings.get(CLOUD_DEVICE_ID_KEY)
  return entry?.value ? (entry.value as string) : null
}

// ─── Snapshot list ────────────────────────────────────────────────────────────

export interface CloudSnapshot {
  name: string
  createdAt: Date
  size: number
  deviceId: string | null   // null = старый файл без device-id (до этой версии)
  fromThisDevice: boolean
}

interface YandexResourceItem {
  name: string
  created: string
  size: number
  file?: string
  type: string
}

interface YandexListResponse {
  _embedded?: {
    items: YandexResourceItem[]
  }
}

// Имя снапшота: backup-<deviceId8>-<YYYY-MM-DD>.json (новое) либо backup-<YYYY-MM-DD>[-<HHMM>].json
// (старые версии, без device-id). deviceId — ровно 8 hex-символов, год начинается с 20 —
// поэтому форматы однозначно различимы.
function parseDeviceId(name: string): string | null {
  const m = /^backup-([0-9a-f]{8})-\d{4}-\d{2}-\d{2}\.json$/.exec(name)
  return m ? m[1] : null
}

export async function listYandexSnapshots(
  token: string,
  currentDeviceId?: string | null,
): Promise<CloudSnapshot[]> {
  const url = `${DISK_API}/resources?path=${encodeURIComponent(APP_FOLDER)}&limit=100&sort=-created`
  const res = await fetch(url, { headers: { Authorization: `OAuth ${token}` } })

  if (res.status === 404) return []
  if (!res.ok) throw new YandexApiError(res.status)

  const json = await res.json() as YandexListResponse
  const items = json._embedded?.items ?? []

  return items
    .filter(it => it.type === 'file' && it.name.startsWith(BACKUP_PREFIX) && it.name.endsWith('.json') && it.file)
    .map(it => {
      const deviceId = parseDeviceId(it.name)
      return {
        name: it.name,
        createdAt: new Date(it.created),
        size: it.size,
        deviceId,
        fromThisDevice: deviceId != null && deviceId === currentDeviceId,
      }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// ─── Upload ───────────────────────────────────────────────────────────────────

// День в формате YYYY-MM-DD по локальному времени устройства.
function localDayStr(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Имя файла — <deviceId>-<день> (без времени): один снапшот в сутки на устройство,
// overwrite перезаписывает внутридневные пере-заливки. Ротация 7 на устройство = неделя.
function backupFilename(deviceId: string): string {
  return `${BACKUP_PREFIX}${deviceId}-${localDayStr()}.json`
}

// Лёгкая сигнатура содержимого: количество записей + максимальный updatedAt по каждой
// таблице. updatedAt бампится при любом create/update/delete/restore (см. trash.ts),
// поэтому сигнатура ловит любые изменения, не сериализуя фото повторно.
function dataSignature(data: BackupFile['data']): string {
  const sig = (arr: { id?: number; updatedAt?: Date }[]) => {
    let max = 0
    let idSum = 0
    for (const r of arr) {
      const ts = r.updatedAt ? new Date(r.updatedAt).getTime() : 0
      if (ts > max) max = ts
      idSum += r.id ?? 0
    }
    // idSum ловит замену записи (delete+add) при неизменных count и max updatedAt:
    // набор id меняется → сигнатура меняется.
    return `${arr.length}:${max}:${idSum}`
  }
  return [data.clients, data.sharpenings, data.stones, data.steels, data.knives]
    .map(sig)
    .join('|')
}

export class YandexApiError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Yandex API error: ${status}`)
    this.status = status
    this.name = 'YandexApiError'
  }
}

// Сырая заливка готового бэкапа. Без побочных эффектов на settings.
async function putBackup(token: string, backup: BackupFile, deviceId: string): Promise<'ok' | 'auth-error' | 'error'> {
  const path = `${APP_FOLDER}${backupFilename(deviceId)}`

  // Получаем URL для загрузки
  const uploadLinkRes = await fetch(
    `${DISK_API}/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`,
    { headers: { Authorization: `OAuth ${token}` } }
  )
  if (uploadLinkRes.status === 401) return 'auth-error'
  if (!uploadLinkRes.ok) return 'error'

  const { href } = await uploadLinkRes.json() as { href: string }

  // Загружаем файл
  const uploadRes = await fetch(href, {
    method: 'PUT',
    body: JSON.stringify(backup),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!uploadRes.ok) return 'error'

  return 'ok'
}

// Фиксируем успешную заливку: время, сигнатуру данных, день проверки. Затем ротация.
async function recordUploadSuccess(database: AppTochiteDB, backup: BackupFile, token: string, deviceId: string): Promise<void> {
  await database.settings.bulkPut([
    { key: YANDEX_LAST_AT_KEY, value: new Date().toISOString() },
    { key: YANDEX_LAST_SIG_KEY, value: dataSignature(backup.data) },
    { key: YANDEX_LAST_CHECK_DAY_KEY, value: localDayStr() },
  ])
  await rotateSnapshots(token, deviceId).catch(() => {})
}

// Ручная заливка («Сохранить сейчас») — без дневного гейта и проверки изменений.
export async function uploadToYandex(
  database: AppTochiteDB,
  token: string,
): Promise<'ok' | 'auth-error' | 'error'> {
  try {
    const backup = await exportBackup(database)
    if (!backup.data.clients.length) return 'error'

    const deviceId = await getCloudDeviceId(database)
    const result = await putBackup(token, backup, deviceId)
    if (result !== 'ok') return result

    await recordUploadSuccess(database, backup, token, deviceId)
    return 'ok'
  } catch {
    return 'error'
  }
}

// Ротация — только снапшоты ЭТОГО устройства (свой префикс). Файлы других устройств
// и старые файлы без device-id это устройство не трогает.
async function rotateSnapshots(token: string, deviceId: string): Promise<void> {
  const snapshots = await listYandexSnapshots(token, deviceId)
  const own = snapshots.filter(s => s.deviceId === deviceId)
  const toDelete = own.slice(MAX_SNAPSHOTS)
  for (const snap of toDelete) {
    const path = `${APP_FOLDER}${snap.name}`
    await fetch(
      `${DISK_API}/resources?path=${encodeURIComponent(path)}&permanently=true`,
      { method: 'DELETE', headers: { Authorization: `OAuth ${token}` } }
    ).catch(() => {})
  }
}

// ─── Auto-backup entry point ──────────────────────────────────────────────────
// Вызывается из AutoBackupContext параллельно с performFolderBackup.
// Тихо завершается если токена нет или авто-бэкап отключён.
//
// Политика: не чаще одного снапшота в сутки и только если данные изменились.
//  1) Дневной гейт (дёшево, без скана): если сегодня уже проверяли — выходим.
//     Поэтому тяжёлый exportBackup срабатывает максимум раз в календарный день,
//     а не на каждом возврате приложения в фокус.
//  2) Проверка изменений: сравниваем сигнатуру с последней успешной заливкой —
//     если ничего не поменялось, не плодим идентичный снапшот.

export async function performCloudBackup(database: AppTochiteDB): Promise<void> {
  const [token, autoEnabled] = await Promise.all([
    getYandexToken(database),
    getCloudAutoBackup(database),
  ])
  if (!token || !autoEnabled) return

  const today = localDayStr()
  const checkEntry = await database.settings.get(YANDEX_LAST_CHECK_DAY_KEY)
  if (checkEntry?.value === today) return

  // Помечаем день проверенным сразу — чтобы при отсутствии изменений не гонять
  // exportBackup повторно на каждом фокусе в течение дня. При сбое заливки гейт
  // снимается ниже, иначе временная ошибка сети стоила бы целого дня бэкапа.
  await database.settings.put({ key: YANDEX_LAST_CHECK_DAY_KEY, value: today })

  const clearDayGate = () =>
    database.settings.delete(YANDEX_LAST_CHECK_DAY_KEY).catch(() => {})

  try {
    const backup = await exportBackup(database)
    if (!backup.data.clients.length) return

    const sigEntry = await database.settings.get(YANDEX_LAST_SIG_KEY)
    if (dataSignature(backup.data) === sigEntry?.value) return // ничего не изменилось

    const deviceId = await getCloudDeviceId(database)
    const result = await putBackup(token, backup, deviceId)
    if (result !== 'ok') {
      await clearDayGate()
      return
    }

    await recordUploadSuccess(database, backup, token, deviceId)
    track('cloud_upload', { trigger: 'auto' }).catch(() => {})
  } catch (err) {
    await clearDayGate()
    throw err
  }
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

const OAUTH_STATE_KEY = 'yandexOAuthState'

export function buildOAuthUrl(clientId: string, redirectUri: string): string {
  const state = crypto.randomUUID()
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  const params = new URLSearchParams({
    response_type: 'token',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    force_confirm: 'yes',
  })
  return `https://oauth.yandex.ru/authorize?${params}`
}

export function consumeOAuthState(): string | null {
  const state = sessionStorage.getItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  return state
}
