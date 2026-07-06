import { db } from '../db/instance'
import { getLastBackupAt } from '../utils/backup'
import { getYandexToken, getCloudAutoBackup } from '../utils/cloudBackup'
import {
  PLATFORM,
  baseContext,
  deliverPayload,
  enqueue,
  getDeviceId,
  hasAnalyticsEndpoint,
} from './analytics'

// Баг-репорт едет по той же трубе, что и телеметрия (Apps Script endpoint),
// но НЕ подчиняется opt-out'у аналитики: это явное действие пользователя,
// а не фоновый сбор. PII-правило то же — в диагностику не попадают имена
// клиентов, телефоны, фото и тексты комментариев; текст сообщения пишет
// сам пользователь.

export interface BugDiagnostics {
  storageUsedMb: number | null
  storageQuotaMb: number | null
  storagePersisted: boolean | null
  clientsCount: number
  sharpeningsCount: number
  lastBackupAt: string | null
  cloudConnected: boolean
  cloudAutoBackup: boolean
}

export function isBugReportAvailable(): boolean {
  return hasAnalyticsEndpoint()
}

export async function collectDiagnostics(): Promise<BugDiagnostics> {
  const [clientsCount, sharpeningsCount, lastBackup, cloudToken, cloudAuto] = await Promise.all([
    db.clients.count(),
    db.sharpenings.count(),
    getLastBackupAt(db).catch(() => null),
    getYandexToken(db).catch(() => null),
    getCloudAutoBackup(db).catch(() => false),
  ])

  // storage API может отсутствовать в старых WebView — диагностика не должна
  // валить отправку репорта.
  let storageUsedMb: number | null = null
  let storageQuotaMb: number | null = null
  let storagePersisted: boolean | null = null
  try {
    if (navigator.storage?.estimate) {
      const { usage, quota } = await navigator.storage.estimate()
      storageUsedMb = usage != null ? Math.round(usage / 1048576) : null
      storageQuotaMb = quota != null ? Math.round(quota / 1048576) : null
    }
    if (navigator.storage?.persisted) {
      storagePersisted = await navigator.storage.persisted()
    }
  } catch {
    // остаёмся с null — отправляем что есть
  }

  return {
    storageUsedMb,
    storageQuotaMb,
    storagePersisted,
    clientsCount,
    sharpeningsCount,
    lastBackupAt: lastBackup ? lastBackup.toISOString() : null,
    cloudConnected: Boolean(cloudToken),
    cloudAutoBackup: cloudAuto,
  }
}

// Собирает полный payload — его же показывает превью «что будет отправлено»
// в форме, чтобы уходило ровно то, что пользователь видел. contact — ник в
// Telegram, который пользователь оставил сам, чтобы с ним можно было связаться.
export async function buildBugReportPayload(
  text: string,
  contact: string,
  diag: BugDiagnostics,
): Promise<Record<string, unknown>> {
  const deviceId = await getDeviceId()
  return {
    event: 'bug_report',
    deviceId,
    ts: new Date().toISOString(),
    platform: PLATFORM,
    text,
    contact: contact || null,
    ...baseContext(),
    ...diag,
  }
}

// Никогда не бросает: при сбое сети репорт ложится в analyticsQueue и уедет
// вместе с flushAnalyticsQueue при появлении соединения.
export async function sendBugReport(payload: Record<string, unknown>): Promise<void> {
  if (!isBugReportAvailable()) return
  try {
    await deliverPayload(payload)
  } catch {
    await enqueue(payload).catch(() => {})
  }
}
