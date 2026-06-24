import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../../db/instance'
import { startBlur } from '../../utils/modalBlur'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { openGuide as openGuideUrl } from '../../utils/openGuide'
import { useLocale } from '../../i18n'
import s from './OnboardingSheet.module.css'

export default function OnboardingSheet() {
  const [visible, setVisible] = useState(false)
  const { canInstall, promptInstall } = useInstallPrompt()
  const { t, locale } = useLocale()

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
    openGuideUrl(locale)
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
        {canInstall && (
          <button className={s.skip} onClick={() => { promptInstall('onboarding'); dismiss() }}>
            {t.about.installApp}
          </button>
        )}
        <button className={s.skip} onClick={dismiss}>{t.components.onboardingSkip}</button>
      </div>
    </div>,
    document.body
  )
}
