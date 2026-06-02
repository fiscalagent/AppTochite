import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../../db/instance'
import { startBlur } from '../../utils/modalBlur'
import { useT } from '../../i18n'
import s from './OnboardingSheet.module.css'

export default function OnboardingSheet() {
  const [visible, setVisible] = useState(false)
  const t = useT()

  useEffect(() => {
    db.settings.get('onboardingShown').then(entry => {
      if (!entry) setVisible(true)
    })
  }, [])

  useEffect(() => {
    if (!visible) return
    return startBlur()
  }, [visible])

  async function dismiss() {
    await db.settings.put({ key: 'onboardingShown', value: true })
    setVisible(false)
  }

  function openGuide() {
    window.open('/AppTochite/guide.html', '_blank')
    dismiss()
  }

  if (!visible) return null

  return createPortal(
    <div className={s.overlay} onClick={dismiss}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <div className={s.title}>{t.components.onboardingTitle}</div>
        <div className={s.subtitle}>{t.components.onboardingSubtitle}</div>
        <button className={s.primary} onClick={openGuide}>
          {t.components.onboardingOpen}
        </button>
        <button className={s.skip} onClick={dismiss}>{t.components.onboardingSkip}</button>
      </div>
    </div>,
    document.body
  )
}
