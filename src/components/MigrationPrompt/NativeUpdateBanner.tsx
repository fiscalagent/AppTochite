import { useEffect, useState } from 'react'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
import s from '../InstallNudge/InstallBanner.module.css'

// Плашка «вышла новая версия» для APK (Ф4). Off-store не умеет автообновление,
// поэтому при обнаружении свежего GitHub Release зовём скачать новый APK. В PWA
// обновление прилетает через service worker → баннер не нужен и DCE убирает его
// (компонент и динамический import @capacitor/browser живут только под IS_CAPACITOR).
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'
const APK_DOWNLOAD_URL = 'https://github.com/fiscalagent/AppTochite/releases/latest/download/app-release.apk'
const DISMISS_KEY = 'nativeUpdateDismissed'

interface Props {
  hasUpdate: boolean
  latestVersion: string | null
}

export default function NativeUpdateBanner({ hasUpdate, latestVersion }: Props) {
  const t = useT()
  // Храним версию, для которой плашку закрыли: новый релиз снова покажет.
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY))

  const visible = IS_CAPACITOR && hasUpdate && !!latestVersion && dismissed !== latestVersion

  useEffect(() => {
    if (visible) track('native_update_shown', { version: latestVersion }).catch(() => {})
  }, [visible, latestVersion])

  if (!visible) return null

  async function download() {
    track('native_update_click', { version: latestVersion }).catch(() => {})
    if (IS_CAPACITOR) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: APK_DOWNLOAD_URL })
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, latestVersion!)
    track('native_update_dismissed', { version: latestVersion }).catch(() => {})
    setDismissed(latestVersion)
  }

  return (
    <div className={s.banner}>
      <span className={s.text}>{t.components.nativeUpdateText(latestVersion!)}</span>
      <button className={s.cta} onClick={download}>{t.components.nativeUpdateCta}</button>
      <button className={s.close} onClick={dismiss} aria-label={t.components.installBannerClose}>✕</button>
    </div>
  )
}
