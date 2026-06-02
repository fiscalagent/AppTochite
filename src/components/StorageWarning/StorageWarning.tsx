import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PHOTO_COMPRESS_KEY } from '../../hooks/useCamera'
import { useToast } from '../Toast/ToastContext'
import { startBlur } from '../../utils/modalBlur'
import { useT } from '../../i18n'
import s from './StorageWarning.module.css'

const DISMISS_KEY = 'storage-warn-dismissed'
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000 // 7 дней
const WARN_BYTES = 40 * 1024 * 1024         // 40 МБ абсолютный порог
const WARN_RATIO = 0.5                       // 50% квоты

function fmt(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${Math.round(bytes / 1024 / 1024)} МБ`
}

export default function StorageWarning() {
  const { showToast } = useToast()
  const t = useT()
  const [visible, setVisible] = useState(false)
  const [usage, setUsage] = useState(0)
  const [quota, setQuota] = useState(1)

  useEffect(() => {
    if (!visible) return
    return startBlur()
  }, [visible])

  useEffect(() => {
    if (localStorage.getItem(PHOTO_COMPRESS_KEY) === 'on') return

    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_MS) return

    navigator.storage?.estimate().then(({ usage: u = 0, quota: q = 1 }) => {
      if (u > WARN_BYTES || u / q > WARN_RATIO) {
        setUsage(u)
        setQuota(q)
        setVisible(true)
      }
    })
  }, [])

  if (!visible) return null

  function handleCompress() {
    localStorage.setItem(PHOTO_COMPRESS_KEY, 'on')
    setVisible(false)
    showToast(t.components.storageCompressEnabled)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  const pct = Math.min(100, Math.round((usage / quota) * 100))

  return createPortal(
    <div className={s.overlay} onClick={handleDismiss}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.title}>{t.components.storageTitle}</div>

        <div className={s.stats}>
          <span>{fmt(usage)} из {fmt(quota)}</span>
          <span>{pct}%</span>
        </div>
        <div className={s.bar}>
          <div className={s.barFill} style={{ width: `${pct}%` }} />
        </div>

        <p className={s.desc}>{t.components.storagePhotoHint}</p>

        <button className={s.compressBtn} onClick={handleCompress}>
          {t.components.storageEnableCompress}
        </button>
        <button className={s.skipBtn} onClick={handleDismiss}>
          {t.components.storageSnooze}
        </button>
      </div>
    </div>,
    document.body
  )
}
