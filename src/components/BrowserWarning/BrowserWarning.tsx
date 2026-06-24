import { useState } from 'react'
import { useT } from '../../i18n'
import s from './BrowserWarning.module.css'

// В APK (нативный WebView) баннер не нужен и вреден: UA Android System WebView
// тоже содержит «; wv)», поэтому isWebView() ложно срабатывает, а совет «открыть
// в Chrome» уводит из легитимного приложения. Литерал → Rollup вырежет ветку из
// PWA-сборки (там MODE='production', баннер работает как прежде).
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

function isWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/; wv\)/.test(ua)) return true
  if (/(iPhone|iPad|iPod).+AppleWebKit(?!.*Safari)/i.test(ua)) return true
  return false
}

export default function BrowserWarning() {
  const [dismissed, setDismissed] = useState(false)
  const t = useT()

  const standalone = window.matchMedia('(display-mode: standalone)').matches
  if (IS_CAPACITOR || standalone || !isWebView() || dismissed) return null

  const openInChrome = () => {
    const url = window.location.href
    const host = url.replace(/^https?:\/\//, '')
    window.location.href = `intent://${host}#Intent;scheme=https;package=com.android.chrome;end`
  }

  return (
    <div className={s.banner}>
      <p className={s.text}>{t.components.browserWarning}</p>
      <div className={s.actions}>
        <button className={s.openBtn} onClick={openInChrome}>{t.components.openInChrome}</button>
        <button className={s.skipBtn} onClick={() => setDismissed(true)}>{t.components.continueAnyway}</button>
      </div>
    </div>
  )
}
