import { useEffect, useState } from 'react'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { isIosInstallable } from '../../utils/platform'
import { isMigrationPromptEnabled } from '../../config/features'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
import IosInstallSheet from './IosInstallSheet'
import s from './InstallBanner.module.css'

// Ненавязчивый баннер для возвращающихся: режим браузера + установка доступна +
// человек заходит не первый раз. Закрывается на ~неделю. Рисуется только на
// главном экране (рендерится из ClientList).
const DISMISS_KEY = 'installBannerDismissedUntil'
const MIN_LAUNCHES = 2
const SNOOZE_DAYS = 7

export default function InstallBanner() {
  const { canInstall, promptInstall } = useInstallPrompt()
  const t = useT()
  const [hidden, setHidden] = useState(false)
  const [iosOpen, setIosOpen] = useState(false)
  const ios = isIosInstallable()

  const launches = Number(localStorage.getItem('launchCount') ?? 0)
  const until = localStorage.getItem(DISMISS_KEY)
  const snoozed = until ? new Date(until) > new Date() : false
  // При включённой миграции PWA→APK не зовём ставить PWA — это противоречило бы.
  const visible = !isMigrationPromptEnabled() && (canInstall || ios) && launches >= MIN_LAUNCHES && !snoozed && !hidden

  useEffect(() => {
    if (visible) track('install_nudge_shown', { trigger: 'banner', platform: ios ? 'ios' : 'web' }).catch(() => {})
  }, [visible, ios])

  if (!visible) return null

  async function install() {
    await promptInstall('banner')
    setHidden(true)
  }

  // Android/YaBrowser — системный промпт; iOS — открываем инструкцию.
  function handleCta() {
    if (canInstall) install()
    else setIosOpen(true)
  }

  function dismiss() {
    const d = new Date()
    d.setDate(d.getDate() + SNOOZE_DAYS)
    localStorage.setItem(DISMISS_KEY, d.toISOString())
    track('install_nudge_dismissed', { trigger: 'banner' }).catch(() => {})
    setHidden(true)
  }

  return (
    <>
      <div className={s.banner}>
        <span className={s.text}>{t.components.installBannerText}</span>
        <button className={s.cta} onClick={handleCta}>
          {canInstall ? t.components.installAction : t.components.installHowto}
        </button>
        <button className={s.close} onClick={dismiss} aria-label={t.components.installBannerClose}>✕</button>
      </div>
      {iosOpen && <IosInstallSheet trigger="banner" onClose={() => setIosOpen(false)} />}
    </>
  )
}
