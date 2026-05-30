import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
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

  useEffect(() => {
    if (!isOpen) return
    return startBlur()
  }, [isOpen])

  if (!isOpen) return null

  const busy = saving

  const subtitle = buildSubtitle(variant, daysSinceBackup, newRecordsCount)
  const isWarn = variant === 'warn'

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
        <p className={s.title}>{isWarn ? 'Пора сделать бэкап' : 'Напоминание о бэкапе'}</p>
        <p className={`${s.subtitle} ${isWarn ? s.subtitleDanger : ''}`}>{subtitle}</p>
        <p className={s.desc}>
          Android может удалить данные при очистке кэша или нехватке места.
          Сохраните бэкап, чтобы не потерять историю заточек.
        </p>
        <div className={s.actions}>
          <button className={`${s.primaryBtn} ${isWarn ? s.primaryBtnDanger : ''}`} onClick={handleConfirm} disabled={busy}>
            {saving ? 'Сохранение…' : 'Сделать бэкап'}
          </button>
          <button className={s.snoozeBtn} onClick={onSnooze} disabled={busy}>Напомнить завтра</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function buildSubtitle(variant: 'info' | 'warn', days: number | null, records: number | undefined): string {
  if (days === null) return 'Вы ещё ни разу не делали бэкап'
  if (variant === 'warn' && records !== undefined && records >= 10) {
    return `${records} ${recordsWord(records)} с последнего бэкапа`
  }
  return `Последний бэкап был ${days} ${daysWord(days)} назад`
}

function daysWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня'
  return 'дней'
}

function recordsWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'новая запись'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'новые записи'
  return 'новых записей'
}
