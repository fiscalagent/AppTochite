export type BackupLevel = 'info' | 'warn' | 'critical'

export interface BackupLevelInput {
  /** Дата последнего бэкапа. `null` если бэкапа ещё не было. */
  lastBackupAt: Date | null
  /** Дата первого запуска приложения. Используется, когда `lastBackupAt` отсутствует. */
  firstLaunchAt: Date | null
  /** Кол-во клиентов+заточек с `updatedAt > lastBackupAt` (или всех живых, если бэкапа не было). */
  newRecords: number
  /** Кол-во живых (не в корзине) заточек в БД — порог для critical. */
  liveSharpenings: number
  /** Текущий момент (для тестируемости). */
  now?: Date
}

export const INFO_DAYS = 7
export const WARN_DAYS = 14
export const CRITICAL_DAYS = 30
export const WARN_RECORDS = 10
export const CRITICAL_MIN_SHARPENINGS = 5

const DAY_MS = 86_400_000

export function computeBackupLevel(input: BackupLevelInput): BackupLevel | null {
  const now = (input.now ?? new Date()).getTime()
  const reference = input.lastBackupAt ?? input.firstLaunchAt
  if (!reference) return null

  const days = Math.floor((now - reference.getTime()) / DAY_MS)
  if (days < INFO_DAYS) return null

  if (days >= CRITICAL_DAYS && input.liveSharpenings >= CRITICAL_MIN_SHARPENINGS) {
    return 'critical'
  }

  if (days >= WARN_DAYS || input.newRecords >= WARN_RECORDS) {
    return 'warn'
  }

  return 'info'
}
