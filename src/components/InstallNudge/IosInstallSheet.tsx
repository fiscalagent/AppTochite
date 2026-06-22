import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
import s from './IosInstallSheet.module.css'

// Иконка «Поделиться» в стиле iOS — квадрат со стрелкой вверх.
const ShareIcon = () => (
  <svg className={s.shareIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V3" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
)

interface Props {
  trigger: string
  onClose: () => void
}

// Инструкция установки на iOS (Safari). Программного промпта там нет, поэтому
// просто показываем шаги. ios_guide_opened — замер: дошли ли до инструкции.
export default function IosInstallSheet({ trigger, onClose }: Props) {
  const t = useT()

  useEffect(() => {
    track('ios_guide_opened', { trigger }).catch(() => {})
    return startBlur()
  }, [trigger])

  return createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <div className={s.title}>{t.components.iosInstallTitle}</div>
        <div className={s.subtitle}>{t.components.iosInstallIntro}</div>
        <ol className={s.steps}>
          <li><span className={s.num}>1</span><span className={s.stepText}>{t.components.iosStep1} <ShareIcon /></span></li>
          <li><span className={s.num}>2</span><span className={s.stepText}>{t.components.iosStep2}</span></li>
          <li><span className={s.num}>3</span><span className={s.stepText}>{t.components.iosStep3}</span></li>
        </ol>
        <button className={s.primary} onClick={onClose}>{t.components.iosInstallGot}</button>
      </div>
    </div>,
    document.body,
  )
}
