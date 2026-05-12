import { useEffect, useRef, useState } from 'react'
import type { Sharpening } from '../../db/db'
import s from './PhotoReportSheet.module.css'

interface Props {
  photos: string[]
  sharpening: Sharpening
  onClose: () => void
}

function renderReport(canvas: HTMLCanvasElement, b64: string, sh: Sharpening): Promise<void> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      const pad = w * 0.045
      const fontSize = Math.round(w * 0.042)
      const lineH = fontSize * 1.5

      const stones = sh.stones ? [...sh.stones].sort((a, b) => a.order - b.order) : []

      // Wrap stones into lines by measuring text width
      const maxW = w - pad * 2
      const arrowText = ' → '
      ctx.font = `${fontSize}px system-ui, sans-serif`

      const stoneLines: (typeof stones)[] = [[]]
      let lineWidth = 0
      for (let i = 0; i < stones.length; i++) {
        const sep = i === 0 ? '' : arrowText
        const stW = ctx.measureText(sep + stones[i].name).width
        if (lineWidth + stW > maxW && stoneLines[stoneLines.length - 1].length > 0) {
          stoneLines.push([])
          lineWidth = 0
        }
        stoneLines[stoneLines.length - 1].push(stones[i])
        lineWidth += stW
      }

      const knifeInfo = [sh.knifeBrand, sh.steel, sh.hrc ? `${sh.hrc} HRC` : null]
        .filter(Boolean).join(' · ')

      const textLines = stones.length + 1 // stones lines + knife line
      const gradH = Math.max(h * 0.38, lineH * (textLines + 1) * 1.6)

      // Gradient
      const grad = ctx.createLinearGradient(0, h - gradH, 0, h)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.82)')
      ctx.fillStyle = grad
      ctx.fillRect(0, h - gradH, w, gradH)

      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'

      let y = h - Math.round(h * 0.045)

      // Stones — render last line at bottom, first line uppermost
      if (stones.length) {
        const finishStone = stones[stones.length - 1]

        for (let li = stoneLines.length - 1; li >= 0; li--) {
          const line = stoneLines[li]
          let x = pad

          // "Камни: " prefix on first line only
          if (li === 0) {
            ctx.font = `${fontSize}px system-ui, sans-serif`
            ctx.fillStyle = 'rgba(255,255,255,0.55)'
            const prefix = 'Камни: '
            ctx.fillText(prefix, x, y)
            x += ctx.measureText(prefix).width
          }

          for (let i = 0; i < line.length; i++) {
            const st = line[i]
            const isFirst = li === 0 && i === 0
            const isFinish = st === finishStone

            if (!isFirst) {
              ctx.font = `${fontSize}px system-ui, sans-serif`
              ctx.fillStyle = 'rgba(255,255,255,0.45)'
              ctx.fillText(arrowText, x, y)
              x += ctx.measureText(arrowText).width
            } else if (li !== 0) {
              // continuation line — indent to align
              x = pad
            }

            ctx.fillStyle = isFinish ? '#4A90D9' : 'rgba(255,255,255,0.88)'
            ctx.font = isFinish
              ? `bold ${fontSize}px system-ui, sans-serif`
              : `${fontSize}px system-ui, sans-serif`
            ctx.fillText(st.name, x, y)
            x += ctx.measureText(st.name).width
          }

          y -= lineH
        }
      }

      // Knife line
      ctx.font = `bold ${Math.round(fontSize * 1.08)}px system-ui, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(knifeInfo, pad, y)

      resolve()
    }
    img.src = b64
  })
}

export default function PhotoReportSheet({ photos, sharpening, onClose }: Props) {
  const [selected, setSelected] = useState(0)
  const [sharing, setSharing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      renderReport(canvasRef.current, photos[selected], sharpening)
    }
  }, [selected, photos, sharpening])

  async function handleShare() {
    if (!canvasRef.current) return
    setSharing(true)
    try {
      const blob = await new Promise<Blob>(res =>
        canvasRef.current!.toBlob(b => res(b!), 'image/jpeg', 0.92)
      )
      const file = new File([blob], 'sharpening-report.jpg', { type: 'image/jpeg' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'sharpening-report.jpg'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch {
      // cancelled
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.title}>Фото-отчёт</div>

        {photos.length > 1 && (
          <div className={s.thumbs}>
            {photos.map((p, i) => (
              <img
                key={i}
                src={p}
                className={`${s.thumb} ${i === selected ? s.thumbActive : ''}`}
                onClick={() => setSelected(i)}
                alt=""
              />
            ))}
          </div>
        )}

        <div className={s.preview}>
          <canvas ref={canvasRef} className={s.canvas} />
        </div>

        <button className={s.shareBtn} onClick={handleShare} disabled={sharing}>
          {sharing ? 'Подготовка…' : 'Поделиться'}
        </button>
        <button className={s.cancelBtn} onClick={onClose}>Отмена</button>
      </div>
    </div>
  )
}
