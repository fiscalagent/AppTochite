import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { exportBackup, downloadBlob, getLastBackupAt, updateLastBackupAt } from '../../utils/backup'
import BackupReminderModal from './BackupReminderModal'

const SNOOZE_KEY = 'backupReminderSnoozedUntil'
const BACKUP_INTERVAL_DAYS = 7
const GRACE_DAYS = 3
const SHOW_DELAY_MS = 1500

export default function BackupReminder() {
  const [open, setOpen] = useState(false)
  const [daysSince, setDaysSince] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      // Record first launch; skip reminder until GRACE_DAYS have passed
      const firstLaunchMeta = await db.meta.get('firstLaunchAt')
      if (!firstLaunchMeta) {
        await db.meta.put({ key: 'firstLaunchAt', value: new Date().toISOString() })
        return
      }
      const daysSinceInstall = Math.floor(
        (Date.now() - new Date(firstLaunchMeta.value as string).getTime()) / 86_400_000
      )
      if (daysSinceInstall < GRACE_DAYS) return

      const snooze = localStorage.getItem(SNOOZE_KEY)
      if (snooze && new Date(snooze) > new Date()) return

      const lastAt = await getLastBackupAt(db)
      if (!lastAt) {
        setDaysSince(null)
        setOpen(true)
        return
      }
      const days = Math.floor((Date.now() - lastAt.getTime()) / 86_400_000)
      if (days >= BACKUP_INTERVAL_DAYS) {
        setDaysSince(days)
        setOpen(true)
      }
    }, SHOW_DELAY_MS)

    return () => clearTimeout(t)
  }, [])

  async function handleConfirm() {
    const backup = await exportBackup(db)
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadBlob(blob, `apptochite-${dateStr}.json`)
    await updateLastBackupAt(db)
    setOpen(false)
  }

  function handleSnooze() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    localStorage.setItem(SNOOZE_KEY, tomorrow.toISOString())
    setOpen(false)
  }

  return (
    <BackupReminderModal
      isOpen={open}
      daysSinceBackup={daysSince}
      onConfirm={handleConfirm}
      onSnooze={handleSnooze}
    />
  )
}
