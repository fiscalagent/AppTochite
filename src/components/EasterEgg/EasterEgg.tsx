import { useEffect, useState } from 'react'
import s from './EasterEgg.module.css'

interface Props {
  onClose: () => void
}

/**
 * Пасхалка: 7 тапов по номеру версии на экране «О программе».
 * Тёмный оверлей с вордмарком AppTochite, по которому пролетает световой
 * блик (как по заточенной кромке), и подписью «для острой памяти».
 * Гаснет сам после двух проходов блика или по тапу.
 */
export default function EasterEgg({ onClose }: Props) {
  const [closing, setClosing] = useState(false)

  // автозакрытие после того, как блик дважды пройдёт
  useEffect(() => {
    const t = setTimeout(() => setClosing(true), 4200)
    return () => clearTimeout(t)
  }, [])

  // гашение оверлея перед размонтированием
  useEffect(() => {
    if (!closing) return
    const t = setTimeout(onClose, 320)
    return () => clearTimeout(t)
  }, [closing, onClose])

  return (
    <div
      className={`${s.overlay} ${closing ? s.closing : ''}`}
      role="dialog"
      aria-label="AppTochite — ваша острая память"
    >
      <svg className={s.blade} viewBox="0 0 24 14" fill="none" aria-hidden="true">
        <rect x="0" y="9" width="24" height="5" rx="2" fill="var(--text-200)" opacity="0.3" />
        <path d="M0 9 L22 2 L24 5 L2 12 Z" fill="var(--accent)" opacity="0.85" />
      </svg>

      <div className={s.word}>
        <span className={s.app}>App</span><span className={s.toch}>Tochite</span>
        <span className={s.shine} aria-hidden="true">
          <span className={s.shineApp}>App</span><span className={s.shineToch}>Tochite</span>
        </span>
      </div>

      <div className={s.caption}>ваша острая память</div>
    </div>
  )
}
