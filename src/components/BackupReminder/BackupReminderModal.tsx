import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
import { useT } from '../../i18n'
import s from './BackupReminderModal.module.css'

interface Props {
  isOpen: boolean
  variant: 'info' | 'warn'
  daysSinceBackup: number | null
  newRecordsCount?: number
  onConfirm: () => Promise<void>
  onSnooze: () => void
}

export default function BackupReminderModal({
  isOpen, variant, daysSinceBackup, newRecordsCount, onConfirm, onSnooze,
}: Props) {
  const [saving, setSaving] = useState(false)
  const t = useT()

  useEffect(() => {
    if (!isOpen) return
    return startBlur()
  }, [isOpen])

  if (!isOpen) return null

  const busy = saving
  const isWarn = variant === 'warn'

  function buildSubtitle(): string {
    if (daysSinceBackup === null) return t.components.reminderNeverDone
    if (isWarn && newRecordsCount !== undefined && newRecordsCount >= 10) {
      return t.components.reminderRecordsSince(newRecordsCount)
    }
    return t.components.reminderDaysAgo(daysSinceBackup)
  }

  async function handleConfirm() {
    setSaving(true)
    try { await onConfirm() } finally { setSaving(false) }
  }

  return createPortal(
    <div className={s.overlay} onClick={onSnooze}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <svg className={`${s.icon} ${isWarn ? s.iconDanger : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className={s.title}>{isWarn ? t.components.reminderTitleWarn : t.components.reminderTitleInfo}</p>
        <p className={`${s.subtitle} ${isWarn ? s.subtitleDanger : ''}`}>{buildSubtitle()}</p>
        <p className={s.desc}>{t.components.reminderBodyAndroid}</p>
        <div className={s.actions}>
          <button className={`${s.primaryBtn} ${isWarn ? s.primaryBtnDanger : ''}`} onClick={handleConfirm} disabled={busy}>
            {saving ? t.backup.saving : t.components.reminderDoBackup}
          </button>
          <button className={s.snoozeBtn} onClick={onSnooze} disabled={busy}>{t.components.reminderSnooze}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
