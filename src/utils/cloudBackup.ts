import type { AppTochiteDB } from '../db/instance'
import { exportBackup, mergeBackup, isValidBackup, reviveDates, type BackupFile, type MergeStats } from './backup'

// ─── Константы ───────────────────────────────────────────────────────────────

const YANDEX_TOKEN_KEY = 'yandexToken'
const YANDEX_AUTO_KEY = 'yandexAutoBackup'
const YANDEX_LAST_AT_KEY = 'yandexLastBackupAt'

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
  await database.settings.delete(YANDEX_TOKEN_KEY)
  await database.settings.delete(YANDEX_LAST_AT_KEY)
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

// ─── Snapshot list ────────────────────────────────────────────────────────────

export interface CloudSnapshot {
  name: string
  createdAt: Date
  size: number
  downloadUrl: string
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

export async function listYandexSnapshots(token: string): Promise<CloudSnapshot[]> {
  const url = `${DISK_API}/resources?path=${encodeURIComponent(APP_FOLDER)}&limit=50&sort=-created`
  const res = await fetch(url, { headers: { Authorization: `OAuth ${token}` } })

  if (res.status === 404) return []
  if (!res.ok) throw new YandexApiError(res.status)

  const json = await res.json() as YandexListResponse
  const items = json._embedded?.items ?? []

  return items
    .filter(it => it.type === 'file' && it.name.startsWith(BACKUP_PREFIX) && it.name.endsWith('.json') && it.file)
    .map(it => ({
      name: it.name,
      createdAt: new Date(it.created),
      size: it.size,
      downloadUrl: it.file!,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// ─── Upload ───────────────────────────────────────────────────────────────────

function backupFilename(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `${BACKUP_PREFIX}${date}-${time}.json`
}

export class YandexApiError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Yandex API error: ${status}`)
    this.status = status
    this.name = 'YandexApiError'
  }
}

export async function uploadToYandex(
  database: AppTochiteDB,
  token: string,
): Promise<'ok' | 'auth-error' | 'error'> {
  try {
    const backup = await exportBackup(database)
    if (!backup.data.clients.length) return 'error'

    const filename = backupFilename()
    const path = `${APP_FOLDER}${filename}`

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

    await database.settings.put({ key: YANDEX_LAST_AT_KEY, value: new Date().toISOString() })

    // Ротация: удаляем старые снапшоты сверх MAX_SNAPSHOTS
    await rotateSnapshots(token).catch(() => {})

    return 'ok'
  } catch {
    return 'error'
  }
}

async function rotateSnapshots(token: string): Promise<void> {
  const snapshots = await listYandexSnapshots(token)
  const toDelete = snapshots.slice(MAX_SNAPSHOTS)
  for (const snap of toDelete) {
    const path = `${APP_FOLDER}${snap.name}`
    await fetch(
      `${DISK_API}/resources?path=${encodeURIComponent(path)}&permanently=true`,
      { method: 'DELETE', headers: { Authorization: `OAuth ${token}` } }
    ).catch(() => {})
  }
}

// ─── Download + merge ─────────────────────────────────────────────────────────

export async function downloadSnapshotJson(downloadUrl: string, token: string): Promise<BackupFile | null> {
  const res = await fetch(downloadUrl, { headers: { Authorization: `OAuth ${token}` } })
  if (!res.ok) return null
  const parsed = JSON.parse(await res.text(), reviveDates)
  return isValidBackup(parsed) ? parsed : null
}

export async function downloadAndMerge(
  database: AppTochiteDB,
  token: string,
  downloadUrl: string,
): Promise<MergeStats | 'auth-error' | 'error'> {
  try {
    const res = await fetch(downloadUrl, { headers: { Authorization: `OAuth ${token}` } })
    if (res.status === 401) return 'auth-error'
    if (!res.ok) return 'error'
    const parsed = JSON.parse(await res.text(), reviveDates)
    if (!isValidBackup(parsed)) return 'error'
    return await mergeBackup(database, parsed)
  } catch {
    return 'error'
  }
}

// ─── Auto-backup entry point ──────────────────────────────────────────────────
// Вызывается из AutoBackupContext параллельно с performFolderBackup.
// Тихо завершается если токена нет или авто-бэкап отключён.

export async function performCloudBackup(database: AppTochiteDB): Promise<void> {
  const [token, autoEnabled] = await Promise.all([
    getYandexToken(database),
    getCloudAutoBackup(database),
  ])
  if (!token || !autoEnabled) return
  await uploadToYandex(database, token)
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
