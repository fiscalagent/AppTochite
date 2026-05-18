import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
import s from './PhotoShareSheet.module.css'

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
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files })
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
          <span className={s.title}>Поделиться фото</span>
          <button className={s.toggleAll} onClick={toggleAll}>
            {allSelected ? 'Снять всё' : 'Выбрать все'}
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
            ? 'Подготовка…'
            : selected.size > 1
              ? `Поделиться (${selected.size})`
              : 'Поделиться'}
        </button>
        <button className={s.cancelBtn} onClick={onClose}>Отмена</button>
      </div>
    </div>,
    document.body
  )
}
