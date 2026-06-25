import { useEffect, useState } from 'react'
import { isMigrationPromptEnabled } from '../../config/features'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
import MigrationSheet from './MigrationSheet'
import s from '../InstallNudge/InstallBanner.module.css'

// Баннер «перейди на приложение» для PWA-юзеров. За флагом isMigrationPromptEnabled
// (по умолчанию OFF — тёмный код до запуска 2.0.0). Рисуется на главном (из ClientList),
// рядом с InstallBanner; тот гасится, когда миграция включена (см. InstallBanner).
const DISMISS_KEY = 'migrationBannerDismissed'

export default function MigrationBanner() {
  const t = useT()
  const [hidden, setHidden] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [sheetOpen, setSheetOpen] = useState(false)

  const visible = isMigrationPromptEnabled() && !hidden

  useEffect(() => {
    if (visible) track('migration_banner_shown').catch(() => {})
  }, [visible])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    track('migration_banner_dismissed').catch(() => {})
    setHidden(true)
  }

  return (
    <>
      <div className={s.banner}>
        <span className={s.text}>{t.components.migrationBannerText}</span>
        <button className={s.cta} onClick={() => setSheetOpen(true)}>{t.components.migrationBannerCta}</button>
        <button className={s.close} onClick={dismiss} aria-label={t.components.installBannerClose}>✕</button>
      </div>
      {sheetOpen && <MigrationSheet onClose={() => setSheetOpen(false)} />}
    </>
  )
}
