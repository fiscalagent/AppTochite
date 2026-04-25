import { useState } from 'react'
import { createPortal } from 'react-dom'
import s from './BackupReminderModal.module.css'

interface Props {
  isOpen: boolean
  daysSinceBackup: number | null
  onConfirm: () => Promise<void>
  onSnooze: () => void
}

export default function BackupReminderModal({ isOpen, daysSinceBackup, onConfirm, onSnooze }: Props) {
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const subtitle = daysSinceBackup === null
    ? 'Вы ещё ни разу не делали бэкап'
    : `Последний бэкап был ${daysSinceBackup} ${daysWord(daysSinceBackup)} назад`

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm()
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className={s.overlay} onClick={onSnooze}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <svg className={s.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className={s.title}>Напоминание о бэкапе</p>
        <p className={s.subtitle}>{subtitle}</p>
        <p className={s.desc}>
          Android может удалить данные при очистке кэша или нехватке места.
          Сохраните бэкап, чтобы не потерять историю заточек.
        </p>
        <div className={s.actions}>
          <button className={s.primaryBtn} onClick={handleConfirm} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сделать бэкап'}
          </button>
          <button className={s.snoozeBtn} onClick={onSnooze} disabled={saving}>Напомнить завтра</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function daysWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня'
  return 'дней'
}
