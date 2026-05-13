import { useEffect, useRef, useState } from 'react'
import type { Sharpening } from '../../db/db'
import s from './PhotoReportSheet.module.css'

interface Props {
  photos: string[]
  sharpening: Sharpening
  onClose: () => void
}

function sampleRegion(ctx: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number) {
  const data = ctx.getImageData(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh)).data
  let sum = 0
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  }
  const mean = sum / n
  let vSum = 0
  for (let i = 0; i < data.length; i += 4) {
    const l = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    vSum += (l - mean) ** 2
  }
  return { brightness: mean, std: Math.sqrt(vSum / n) }
}

function cornerScore(s: { brightness: number; std: number }) {
  return s.brightness * 0.65 + s.std * 0.35
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
      const fontSize = Math.round(w * 0.034)
      const lineH = Math.round(fontSize * 1.55)
      const font = `300 ${fontSize}px system-ui, sans-serif`

      const stones = sh.stones ? [...sh.stones].sort((a, b) => a.order - b.order) : []

      // --- Анализ верхних углов ---
      const rw = Math.round(w * 0.5)
      const rh = Math.round(h * 0.20)
      const topLeft = sampleRegion(ctx, 0, 0, rw, rh)
      const topRight = sampleRegion(ctx, w - rw, 0, rw, rh)
      const knifeOnLeft = cornerScore(topLeft) <= cornerScore(topRight)

      // Адаптивная непрозрачность верхнего градиента — по более светлому из двух углов
      const topBrightness = Math.max(topLeft.brightness, topRight.brightness)
      const topOpacity = 0.45 + (topBrightness / 255) * 0.40

      // Адаптивная непрозрачность нижнего градиента
      const botLeft = sampleRegion(ctx, 0, h - rh, rw, rh)
      const botRight = sampleRegion(ctx, w - rw, h - rh, rw, rh)
      const botBrightness = (botLeft.brightness + botRight.brightness) / 2
      const botOpacity = 0.50 + (botBrightness / 255) * 0.35

      const knifeInfo = [sh.knifeBrand, sh.steel, sh.hrc ? `${sh.hrc} HRC` : null]
        .filter(Boolean).join(' · ')

      // --- Верхний градиент ---
      const topGradH = Math.round(h * 0.22)
      const topGrad = ctx.createLinearGradient(0, 0, 0, topGradH)
      topGrad.addColorStop(0, `rgba(0,0,0,${topOpacity.toFixed(2)})`)
      topGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, w, topGradH)

      // --- Нож ---
      ctx.textBaseline = 'top'
      ctx.font = font
      ctx.fillStyle = 'rgba(255,255,255,0.80)'
      const knifeMaxW = w * 0.55 - pad
      if (knifeOnLeft) {
        ctx.textAlign = 'left'
        ctx.fillText(knifeInfo, pad, pad, knifeMaxW)
      } else {
        ctx.textAlign = 'right'
        ctx.fillText(knifeInfo, w - pad, pad, knifeMaxW)
      }

      // --- Угол заточки (противоположный угол) ---
      if (sh.angle != null) {
        ctx.fillStyle = 'rgba(255,255,255,0.70)'
        if (knifeOnLeft) {
          ctx.textAlign = 'right'
          ctx.fillText(`∠ ${sh.angle}°`, w - pad, pad)
        } else {
          ctx.textAlign = 'left'
          ctx.fillText(`∠ ${sh.angle}°`, pad, pad)
        }
      }

      ctx.textAlign = 'left'

      // --- Камни ---
      if (stones.length) {
        ctx.textBaseline = 'alphabetic'

        const maxOrder = Math.max(...stones.map(st => st.order))
        const prefix = 'Камни: '
        const arrowText = ' → '
        const maxW = w - pad * 2

        ctx.font = font
        const prefixW = ctx.measureText(prefix).width
        const arrowW = ctx.measureText(arrowText).width

        const lines: (typeof stones)[] = [[]]
        let lineUsed = prefixW

        for (const st of stones) {
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

        const botGradH = Math.max(Math.round(h * 0.28), (lines.length + 1) * lineH * 1.8)
        const botGrad = ctx.createLinearGradient(0, h - botGradH, 0, h)
        botGrad.addColorStop(0, 'rgba(0,0,0,0)')
        botGrad.addColorStop(1, `rgba(0,0,0,${botOpacity.toFixed(2)})`)
        ctx.fillStyle = botGrad
        ctx.fillRect(0, h - botGradH, w, botGradH)

        const baseY = h - pad
        for (let li = 0; li < lines.length; li++) {
          const y = baseY - (lines.length - 1 - li) * lineH
          const line = lines[li]
          let x = pad

          if (li === 0) {
            ctx.font = font
            ctx.fillStyle = 'rgba(255,255,255,0.45)'
            ctx.fillText(prefix, x, y)
            x += prefixW
          }

          for (let i = 0; i < line.length; i++) {
            const st = line[i]
            const isFinish = st.order === maxOrder

            if (i > 0) {
              ctx.font = font
              ctx.fillStyle = 'rgba(255,255,255,0.40)'
              ctx.fillText(arrowText, x, y)
              x += arrowW
            }

            ctx.font = font
            ctx.fillStyle = isFinish ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.75)'
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
