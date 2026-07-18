import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import { exportBackup, downloadBlob, updateLastBackupAt } from '../../utils/backup'
import BackupReminderModal from './BackupReminderModal'
import BackupCriticalBanner from './BackupCriticalBanner'
import { type BackupLevel } from './computeBackupLevel'
import { loadBackupState } from './loadBackupState'

const SNOOZE_KEY = 'backupReminderSnoozedUntil'

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

export default function BackupReminder() {
  // Уровень, на котором закрыли/отложили в этой сессии — не голый boolean:
  // иначе после закрытия на info-уровне эскалация до warn/critical в той же
  // сессии (state обновляется реактивно через useLiveQuery) не могла пробить
  // одноразовый dismissed=true и напоминание пропадало до следующего запуска,
  // хотя логика ниже (снуз + levelRank) для персистентного снуза именно это
  // умеет — эскалация должна перекрывать более старый закрытый уровень.
  const [dismissedAtLevel, setDismissedAtLevel] = useState<BackupLevel | null>(null)

  // firstLaunchAt проставляем в обычном эффекте, а не внутри liveQuery:
  // запись в read-only контексте liveQuery кидает ReadOnlyError и на чистой
  // базе (первый запуск) роняет весь app в чёрный экран.
  useEffect(() => {
    db.settings.get('firstLaunchAt').then(entry => {
      if (!entry) {
        db.settings.put({ key: 'firstLaunchAt', value: new Date().toISOString() })
      }
    })
  }, [])

  const state = useLiveQuery(() => loadBackupState(db), [])

  if (!state || !state.level) return null

  if (state.level === 'critical') {
    return <BackupCriticalBanner daysSince={state.daysSince} />
  }

  if (dismissedAtLevel && levelRank(state.level) <= levelRank(dismissedAtLevel)) return null

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
    setDismissedAtLevel(state!.level as BackupLevel)
  }

  function handleSnooze() {
    writeSnooze(state!.level as BackupLevel)
    setDismissedAtLevel(state!.level as BackupLevel)
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
