import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
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

  useEffect(() => {
    const maybeShow = () => {
      if (localStorage.getItem(SEEN_KEY) === 'pending') setShow(true)
    }
    maybeShow()
    window.addEventListener(NUDGE_EVENT, maybeShow)
    return () => window.removeEventListener(NUDGE_EVENT, maybeShow)
  }, [])

  // Показываем только когда установка реально доступна (Chrome/YaBrowser отдали
  // beforeinstallprompt). На iOS canInstall=false — флаг просто лежит, гайд отдельно.
  const visible = show && canInstall

  useEffect(() => {
    if (!visible) return
    localStorage.setItem(SEEN_KEY, 'shown')
    track('install_nudge_shown', { trigger: 'after_sharpening' }).catch(() => {})
    return startBlur()
  }, [visible])

  if (!visible) return null

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
