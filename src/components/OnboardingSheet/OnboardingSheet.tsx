import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../../db/instance'
import { startBlur, stopBlur } from '../../utils/modalBlur'
import s from './OnboardingSheet.module.css'

export default function OnboardingSheet() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    db.settings.get('onboardingShown').then(entry => {
      if (!entry) setVisible(true)
    })
  }, [])

  useEffect(() => {
    if (!visible) return
    startBlur()
    return stopBlur
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
        <div className={s.title}>Добро пожаловать!</div>
        <div className={s.subtitle}>Прочитайте инструкцию — она поможет быстро разобраться в приложении.</div>
        <button className={s.primary} onClick={openGuide}>
          Открыть инструкцию
        </button>
        <button className={s.skip} onClick={dismiss}>Пропустить</button>
      </div>
    </div>,
    document.body
  )
}
