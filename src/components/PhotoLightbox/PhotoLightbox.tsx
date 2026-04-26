import { useState, useRef, useEffect, type TouchEvent } from 'react'
import s from './PhotoLightbox.module.css'

interface Props {
  photos: string[]
  initialIndex?: number
  onClose: () => void
}

export default function PhotoLightbox({ photos, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [animated, setAnimated] = useState(false)

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTapRef = useRef(0)
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null)

  useEffect(() => {
    setScale(1) // eslint-disable-line react-hooks/set-state-in-effect
    setTranslate({ x: 0, y: 0 })
  }, [index])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < photos.length - 1) setIndex(i => i + 1)
      if (e.key === 'ArrowLeft' && index > 0) setIndex(i => i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onClose])

  function pinchDist(t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      pinchRef.current = { startDist: pinchDist(e.touches[0], e.touches[1]), startScale: scale }
      dragRef.current = null
      touchStartRef.current = null
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
      if (scale > 1) {
        dragRef.current = { startX: t.clientX, startY: t.clientY, tx: translate.x, ty: translate.y }
      }
    }
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    e.preventDefault()
    if (e.touches.length === 2 && pinchRef.current) {
      const d = pinchDist(e.touches[0], e.touches[1])
      const newScale = Math.min(5, Math.max(1, pinchRef.current.startScale * (d / pinchRef.current.startDist)))
      setScale(newScale)
      if (newScale <= 1) setTranslate({ x: 0, y: 0 })
    } else if (e.touches.length === 1 && dragRef.current && scale > 1) {
      const t = e.touches[0]
      setTranslate({
        x: dragRef.current.tx + t.clientX - dragRef.current.startX,
        y: dragRef.current.ty + t.clientY - dragRef.current.startY,
      })
    }
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    pinchRef.current = null
    dragRef.current = null

    if (e.changedTouches.length === 1 && touchStartRef.current) {
      const t = e.changedTouches[0]
      const dx = t.clientX - touchStartRef.current.x
      const dy = t.clientY - touchStartRef.current.y
      const elapsed = Date.now() - touchStartRef.current.time
      const moved = Math.hypot(dx, dy)

      if (moved < 12 && elapsed < 300) {
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
          lastTapRef.current = 0
          setAnimated(true)
          setTimeout(() => setAnimated(false), 200)
          if (scale > 1) {
            setScale(1)
            setTranslate({ x: 0, y: 0 })
          } else {
            setScale(2.5)
          }
        } else {
          lastTapRef.current = now
        }
      } else if (scale <= 1 && Math.abs(dx) > 50 && Math.abs(dy) < 80 && elapsed < 500) {
        if (dx < 0 && index < photos.length - 1) setIndex(i => i + 1)
        else if (dx > 0 && index > 0) setIndex(i => i - 1)
      }
    }

    touchStartRef.current = null
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <button
        className={s.closeBtn}
        onClick={e => { e.stopPropagation(); onClose() }}
        aria-label="Закрыть"
      >
        ×
      </button>

      {photos.length > 1 && (
        <div className={s.counter}>{index + 1} / {photos.length}</div>
      )}

      <div
        className={s.imgWrapper}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          key={index}
          src={photos[index]}
          className={s.img}
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: animated ? 'transform 0.2s ease' : 'none',
          }}
          alt=""
          draggable={false}
        />
      </div>

      {photos.length > 1 && (
        <div className={s.dots}>
          {photos.map((_, i) => (
            <span key={i} className={i === index ? s.dotActive : s.dot} />
          ))}
        </div>
      )}
    </div>
  )
}
