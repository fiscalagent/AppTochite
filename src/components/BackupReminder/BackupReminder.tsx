import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import { exportBackup, downloadBlob, getLastBackupAt, updateLastBackupAt } from '../../utils/backup'
import BackupReminderModal from './BackupReminderModal'
import BackupCriticalBanner from './BackupCriticalBanner'
import { computeBackupLevel, type BackupLevel } from './computeBackupLevel'

const SNOOZE_KEY = 'backupReminderSnoozedUntil'
const GRACE_DAYS = 3

interface SnoozeState {
  until: Date
  atLevel: BackupLevel
}

function readSnooze(): SnoozeState | null {
  const raw = localStorage.getItem(SNOOZE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && typeof parsed.until === 'string') {
      const until = new Date(parsed.until)
      if (Number.isNaN(until.getTime())) return null
      const atLevel: BackupLevel = parsed.atLevel === 'warn' ? 'warn' : 'info'
      return { until, atLevel }
    }
  } catch {
    // старый формат: голая ISO-строка — считаем как info-снуз
    const until = new Date(raw)
    if (!Number.isNaN(until.getTime())) return { until, atLevel: 'info' }
  }
  return null
}

function writeSnooze(atLevel: BackupLevel) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  localStorage.setItem(SNOOZE_KEY, JSON.stringify({ until: tomorrow.toISOString(), atLevel }))
}

function levelRank(l: BackupLevel): number {
  return l === 'critical' ? 2 : l === 'warn' ? 1 : 0
}

interface BackupState {
  level: BackupLevel | null
  daysSince: number | null
  newRecords: number
}

export default function BackupReminder() {
  const [dismissed, setDismissed] = useState(false)

  const state = useLiveQuery<BackupState | undefined>(async () => {
    const firstLaunchEntry = await db.settings.get('firstLaunchAt')
    if (!firstLaunchEntry) {
      await db.settings.put({ key: 'firstLaunchAt', value: new Date().toISOString() })
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
  }, [])

  if (!state || !state.level) return null

  if (state.level === 'critical') {
    return <BackupCriticalBanner daysSince={state.daysSince} />
  }

  if (dismissed) return null

  const snooze = readSnooze()
  if (snooze && snooze.until > new Date() && levelRank(state.level) <= levelRank(snooze.atLevel)) {
    return null
  }

  async function handleConfirm() {
    const backup = await exportBackup(db)
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadBlob(blob, `apptochite-${dateStr}.json`)
    await updateLastBackupAt(db)
    localStorage.removeItem(SNOOZE_KEY)
    setDismissed(true)
  }

  function handleSnooze() {
    writeSnooze(state!.level as BackupLevel)
    setDismissed(true)
  }

  return (
    <BackupReminderModal
      isOpen
      variant={state.level}
      daysSinceBackup={state.daysSince}
      newRecordsCount={state.newRecords}
      onConfirm={handleConfirm}
      onSnooze={handleSnooze}
    />
  )
}
