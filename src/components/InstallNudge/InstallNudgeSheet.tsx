import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { isIosInstallable } from '../../utils/platform'
import { isMigrationPromptEnabled } from '../../config/features'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
import IosInstallSheet from './IosInstallSheet'
import s from './InstallNudgeSheet.module.css'

// Просьба установить PWA в момент ценности — сразу после первой завершённой
// заточки. Флаг ставит SharpeningDetail (см. handleMarkDone) и шлёт событие
// 'apptochite:install-nudge'; здесь только показ. Один раз за всё время.
const SEEN_KEY = 'installNudgeSeen'
const BANNER_SNOOZE_KEY = 'installBannerDismissedUntil'
const NUDGE_EVENT = 'apptochite:install-nudge'
const BANNER_SNOOZE_DAYS = 7

// Чтобы не насесть дважды: после этой просьбы баннер для возвращающихся молчит.
function snoozeBanner() {
  const d = new Date()
  d.setDate(d.getDate() + BANNER_SNOOZE_DAYS)
  localStorage.setItem(BANNER_SNOOZE_KEY, d.toISOString())
}

export default function InstallNudgeSheet() {
  const { canInstall, promptInstall } = useInstallPrompt()
  const [show, setShow] = useState(false)
  const t = useT()
  const ios = isIosInstallable()

  useEffect(() => {
    const maybeShow = () => {
      if (localStorage.getItem(SEEN_KEY) === 'pending') setShow(true)
    }
    maybeShow()
    window.addEventListener(NUDGE_EVENT, maybeShow)
    return () => window.removeEventListener(NUDGE_EVENT, maybeShow)
  }, [])

  // install — системный промпт (Chrome/YaBrowser); ios — инструкция (Safari).
  // Если установка недоступна вовсе — ничего не показываем.
  // При включённой миграции PWA→APK install-нудж молчит (зовём в APK, не в PWA).
  const mode: 'install' | 'ios' | null =
    !show || isMigrationPromptEnabled() ? null : canInstall ? 'install' : ios ? 'ios' : null

  useEffect(() => {
    if (!mode) return
    localStorage.setItem(SEEN_KEY, 'shown')
    if (mode === 'install') {
      track('install_nudge_shown', { trigger: 'after_sharpening' }).catch(() => {})
      return startBlur()
    }
  }, [mode])

  // iOS: программного промпта нет — показываем инструкцию (она сама шлёт событие и блюрит фон).
  if (mode === 'ios') {
    return <IosInstallSheet trigger="after_sharpening" onClose={() => { snoozeBanner(); setShow(false) }} />
  }

  if (mode !== 'install') return null

  function close() {
    track('install_nudge_dismissed', { trigger: 'after_sharpening' }).catch(() => {})
    snoozeBanner()
    setShow(false)
  }

  async function install() {
    await promptInstall('after_sharpening')
    snoozeBanner()
    setShow(false)
  }

  return createPortal(
    <div className={s.overlay} onClick={close}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <div className={s.title}>{t.components.installNudgeTitle}</div>
        <div className={s.subtitle}>{t.components.installNudgeBody}</div>
        <button className={s.primary} onClick={install}>{t.components.installAction}</button>
        <button className={s.skip} onClick={close}>{t.components.installLater}</button>
      </div>
    </div>,
    document.body,
  )
}
