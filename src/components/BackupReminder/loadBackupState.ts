import type { AppTochiteDB } from '../../db/db'
import { getLastBackupAt } from '../../utils/backup'
import { computeBackupLevel, type BackupLevel } from './computeBackupLevel'

const GRACE_DAYS = 3

export interface BackupState {
  level: BackupLevel | null
  daysSince: number | null
  newRecords: number
}

/**
 * Считает состояние напоминания о бэкапе.
 *
 * ВАЖНО: эта функция выполняется внутри read-only транзакции liveQuery
 * (через useLiveQuery в BackupReminder). Здесь МОЖНО ТОЛЬКО ЧИТАТЬ — любая
 * запись (db.<table>.put/add/update/…) кинет Dexie ReadOnlyError, который
 * без error boundary роняет всё приложение в чёрный экран.
 *
 * Регрессионный тест на это правило — loadBackupState.test.ts.
 */
export async function loadBackupState(db: AppTochiteDB): Promise<BackupState> {
  const firstLaunchEntry = await db.settings.get('firstLaunchAt')
  if (!firstLaunchEntry) {
    // firstLaunchAt проставляет useEffect в BackupReminder, не liveQuery
    return { level: null, daysSince: null, newRecords: 0 }
  }

  const firstLaunchAt = new Date(firstLaunchEntry.value as string)
  const daysSinceInstall = Math.floor((Date.now() - firstLaunchAt.getTime()) / 86_400_000)
  if (daysSinceInstall < GRACE_DAYS) return { level: null, daysSince: null, newRecords: 0 }

  const lastBackupAt = await getLastBackupAt(db)

  const newRecords = lastBackupAt
    ? (await db.clients
        .filter(c => !c.deletedAt && !!c.updatedAt && c.updatedAt > lastBackupAt)
        .count())
      + (await db.sharpenings
        .filter(s => !s.deletedAt && !!s.updatedAt && s.updatedAt > lastBackupAt)
        .count())
    : (await db.clients.filter(c => !c.deletedAt).count())
      + (await db.sharpenings.filter(s => !s.deletedAt).count())

  const liveSharpenings = await db.sharpenings.filter(s => !s.deletedAt).count()

  const level = computeBackupLevel({
    lastBackupAt,
    firstLaunchAt,
    newRecords,
    liveSharpenings,
  })

  const reference = lastBackupAt ?? firstLaunchAt
  const daysSince = lastBackupAt
    ? Math.floor((Date.now() - reference.getTime()) / 86_400_000)
    : null

  return { level, daysSince, newRecords }
}
