import { useEffect, useState } from 'react'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
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

  const launches = Number(localStorage.getItem('launchCount') ?? 0)
  const until = localStorage.getItem(DISMISS_KEY)
  const snoozed = until ? new Date(until) > new Date() : false
  const visible = canInstall && launches >= MIN_LAUNCHES && !snoozed && !hidden

  useEffect(() => {
    if (visible) track('install_nudge_shown', { trigger: 'banner' }).catch(() => {})
  }, [visible])

  if (!visible) return null

  async function install() {
    await promptInstall('banner')
    setHidden(true)
  }

  function dismiss() {
    const d = new Date()
    d.setDate(d.getDate() + SNOOZE_DAYS)
    localStorage.setItem(DISMISS_KEY, d.toISOString())
    track('install_nudge_dismissed', { trigger: 'banner' }).catch(() => {})
    setHidden(true)
  }

  return (
    <div className={s.banner}>
      <span className={s.text}>{t.components.installBannerText}</span>
      <button className={s.cta} onClick={install}>{t.components.installAction}</button>
      <button className={s.close} onClick={dismiss} aria-label={t.components.installBannerClose}>✕</button>
    </div>
  )
}
