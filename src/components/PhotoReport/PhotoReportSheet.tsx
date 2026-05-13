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

      const pad = Math.round(w * 0.045)
      const fontSize = Math.round(w * 0.042)
      const lineH = Math.round(fontSize * 1.55)

      const stones = sh.stones ? [...sh.stones].sort((a, b) => a.order - b.order) : []

      // --- TOP: нож, сталь, HRC ---
      const knifeInfo = [sh.knifeBrand, sh.steel, sh.hrc ? `${sh.hrc} HRC` : null]
        .filter(Boolean).join(' · ')

      const topGradH = Math.round(h * 0.22)
      const topGrad = ctx.createLinearGradient(0, 0, 0, topGradH)
      topGrad.addColorStop(0, 'rgba(0,0,0,0.72)')
      topGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, w, topGradH)

      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.font = `bold ${Math.round(fontSize * 1.08)}px system-ui, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(knifeInfo, pad, pad)

      // --- TOP RIGHT: угол заточки ---
      if (sh.angle != null) {
        ctx.font = `${Math.round(fontSize * 1.08)}px system-ui, sans-serif`
        ctx.textAlign = 'right'
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillText(`∠ ${sh.angle}°`, w - pad, pad)
        ctx.textAlign = 'left'
      }

      // --- BOTTOM: камни ---
      if (stones.length) {
        ctx.textBaseline = 'alphabetic'

        const maxOrder = Math.max(...stones.map(s => s.order))
        const prefix = 'Камни: '
        const arrowText = ' → '
        const normalFont = `${fontSize}px system-ui, sans-serif`
        const boldFont = `bold ${fontSize}px system-ui, sans-serif`
        const maxW = w - pad * 2

        ctx.font = normalFont
        const prefixW = ctx.measureText(prefix).width
        const arrowW = ctx.measureText(arrowText).width

        // Wrap: первая строка учитывает ширину префикса.
        // Финишный камень измеряем жирным — он рендерится жирным.
        const lines: (typeof stones)[] = [[]]
        let lineUsed = prefixW

        for (const st of stones) {
          const isFinish = st.order === maxOrder
          ctx.font = isFinish ? boldFont : normalFont
          const stW = ctx.measureText(st.name).width
          const currentLine = lines[lines.length - 1]
          const isFirstOnLine = currentLine.length === 0
          const needed = (isFirstOnLine ? 0 : arrowW) + stW

          if (!isFirstOnLine && lineUsed + needed > maxW) {
            lines.push([st])
            lineUsed = stW
          } else {
            currentLine.push(st)
            lineUsed += needed
          }
        }

        // Нижний градиент — высота под количество строк
        const botGradH = Math.max(Math.round(h * 0.28), (lines.length + 1) * lineH * 1.8)
        const botGrad = ctx.createLinearGradient(0, h - botGradH, 0, h)
        botGrad.addColorStop(0, 'rgba(0,0,0,0)')
        botGrad.addColorStop(1, 'rgba(0,0,0,0.82)')
        ctx.fillStyle = botGrad
        ctx.fillRect(0, h - botGradH, w, botGradH)

        // Позиции строк: lines[0] — выше всех, lines[last] — у нижнего края
        const baseY = h - pad
        for (let li = 0; li < lines.length; li++) {
          const y = baseY - (lines.length - 1 - li) * lineH
          const line = lines[li]
          let x = pad

          if (li === 0) {
            ctx.font = normalFont
            ctx.fillStyle = 'rgba(255,255,255,0.55)'
            ctx.fillText(prefix, x, y)
            x += prefixW
          }

          for (let i = 0; i < line.length; i++) {
            const st = line[i]
            const isFinish = st.order === maxOrder

            if (i > 0) {
              ctx.font = normalFont
              ctx.fillStyle = 'rgba(255,255,255,0.45)'
              ctx.fillText(arrowText, x, y)
              x += arrowW
            }

            ctx.font = isFinish ? boldFont : normalFont
            ctx.fillStyle = isFinish ? '#4A90D9' : 'rgba(255,255,255,0.88)'
            ctx.fillText(st.name, x, y)
            x += ctx.measureText(st.name).width
          }
        }
      }

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
