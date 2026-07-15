import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
import { track } from '../../services/analytics'
import { shareFilesNative } from '../../utils/nativeShare'
import { uuid } from '../../utils/uuid'
import { useT } from '../../i18n'
import s from './PhotoShareSheet.module.css'

// В APK navigator.share файлов нет — шарим нативно (см. nativeShare.ts).
// Литерал, чтобы Rollup вырезал нативную ветку из PWA-сборки.
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

export interface SharePhoto {
  b64: string
  label: string
}

interface Props {
  photos: SharePhoto[]
  onClose: () => void
}

async function applyWatermark(b64: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const w = canvas.width
      const h = canvas.height
      const fontSize = Math.round(w * 0.020)
      const pad = Math.round(w * 0.032)

      ctx.font = `300 ${fontSize}px system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.shadowColor = 'rgba(0,0,0,0.65)'
      ctx.shadowBlur = Math.round(fontSize * 0.9)
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.fillText('@AppTochite', w - pad, h - pad)

      canvas.toBlob(b => {
        if (b) resolve(b)
        else reject(new Error('toBlob failed'))
      }, 'image/jpeg', 0.92)
    }
    img.onerror = reject
    img.src = b64
  })
}

export default function PhotoShareSheet({ photos, onClose }: Props) {
  const t = useT()
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(photos.map((_, i) => i))
  )
  const [sharing, setSharing] = useState(false)

  useEffect(() => startBlur(), [])

  function toggle(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const allSelected = selected.size === photos.length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(photos.map((_, i) => i)))
  }

  async function handleShare() {
    const indices = [...selected].sort((a, b) => a - b)
    if (!indices.length) return
    setSharing(true)
    try {
      const blobs = await Promise.all(indices.map(i => applyWatermark(photos[i].b64)))
      const files = blobs.map(
        (b, j) => new File([b], `photo-${j + 1}.jpg`, { type: 'image/jpeg' })
      )
      if (IS_CAPACITOR) {
        await shareFilesNative(files)
        track('photo_shared', { method: 'share', count: files.length }).catch(() => {})
      } else if (navigator.share && navigator.canShare?.({ files })) {
        // Уникальное имя на каждый вызов: браузер стейджит Blob во временный файл,
        // чтобы получить content:// URI для Android Sharesheet, и при одинаковом
        // имени между вызовами получатель (Telegram/VK/Max) может получить старое
        // содержимое вместо нового — тот же класс бага, что был в nativeShare.ts.
        const webShareFiles = blobs.map(
          (b, j) => new File([b], `photo-${j + 1}-${uuid()}.jpg`, { type: 'image/jpeg' })
        )
        await navigator.share({ files: webShareFiles })
        track('photo_shared', { method: 'share', count: webShareFiles.length }).catch(() => {})
      } else {
        for (const file of files) {
          const url = URL.createObjectURL(file)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
        track('photo_shared', { method: 'download', count: files.length }).catch(() => {})
      }
    } catch {
      // cancelled
    } finally {
      setSharing(false)
    }
  }

  return createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.header}>
          <span className={s.title}>{t.components.photoShareTitle}</span>
          <button className={s.toggleAll} onClick={toggleAll}>
            {allSelected ? t.components.photoShareDeselectAll : t.components.photoShareSelectAll}
          </button>
        </div>

        <div className={s.grid}>
          {photos.map((p, i) => (
            <div
              key={i}
              className={`${s.cell} ${selected.has(i) ? s.cellSelected : ''}`}
              onClick={() => toggle(i)}
            >
              <img src={p.b64} className={s.img} alt="" />
              <span className={s.badge}>{p.label}</span>
              {selected.has(i) && <span className={s.check}>✓</span>}
            </div>
          ))}
        </div>

        <button
          className={s.shareBtn}
          onClick={handleShare}
          disabled={sharing || selected.size === 0}
        >
          {sharing
            ? t.components.photoReportPreparing
            : selected.size > 1
              ? t.components.photoShareBtn(selected.size)
              : t.components.photoReportShare}
        </button>
        <button className={s.cancelBtn} onClick={onClose}>{t.common.cancel}</button>
      </div>
    </div>,
    document.body
  )
}
