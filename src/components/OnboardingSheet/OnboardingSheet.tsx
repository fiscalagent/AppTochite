import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { db } from '../../db/instance'
import { startBlur } from '../../utils/modalBlur'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { openGuide as openGuideUrl } from '../../utils/openGuide'
import { track } from '../../services/analytics'
import { useLocale } from '../../i18n'
import s from './OnboardingSheet.module.css'

// В APK первый запуск = пустая БД. Мигрирующему из PWA важнее всего восстановить
// данные из файла-бэкапа, поэтому в cap-сборке онбординг показывает кнопку
// «Восстановить» (нудж переноса Ф3). В PWA её нет.
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

export default function OnboardingSheet() {
  const [visible, setVisible] = useState(false)
  const { canInstall, promptInstall } = useInstallPrompt()
  const { t, locale } = useLocale()
  const navigate = useNavigate()

  useEffect(() => {
    db.settings.get('onboardingShown').then(entry => {
      if (!entry) setVisible(true)
    })
  }, [])

  useEffect(() => {
    if (visible && IS_CAPACITOR) track('migration_restore_nudge_shown').catch(() => {})
  }, [visible])

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

  function restore() {
    track('migration_restore_click').catch(() => {})
    dismiss()
    navigate('/backup')
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
        {IS_CAPACITOR && (
          <button className={s.skip} onClick={restore}>
            {t.components.onboardingRestore}
          </button>
        )}
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
