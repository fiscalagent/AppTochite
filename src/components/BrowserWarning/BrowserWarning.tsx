import { useState } from 'react'
import s from './BrowserWarning.module.css'

function isWebView(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/; wv\)/.test(ua)) return true
  if (/(iPhone|iPad|iPod).+AppleWebKit(?!.*Safari)/i.test(ua)) return true
  return false
}

export default function BrowserWarning() {
  const [dismissed, setDismissed] = useState(false)

  const standalone = window.matchMedia('(display-mode: standalone)').matches
  if (standalone || !isWebView() || dismissed) return null

  const openInChrome = () => {
    const url = window.location.href
    const host = url.replace(/^https?:\/\//, '')
    window.location.href = `intent://${host}#Intent;scheme=https;package=com.android.chrome;end`
  }

  return (
    <div className={s.banner}>
      <p className={s.text}>
        Встроенный браузер Telegram не поддерживает установку приложения. Откройте в Chrome.
      </p>
      <div className={s.actions}>
        <button className={s.openBtn} onClick={openInChrome}>Открыть в Chrome</button>
        <button className={s.skipBtn} onClick={() => setDismissed(true)}>Продолжить</button>
      </div>
    </div>
  )
}
