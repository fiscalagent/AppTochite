import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { startBlur } from '../../utils/modalBlur'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
import s from '../OnboardingSheet/OnboardingSheet.module.css'
import ms from './MigrationSheet.module.css'

// Лендинг с кнопкой скачивания APK и гайдом «разрешить установку из источника»
// (Ф6). К запуску (Ф7) там будет ссылка на свежий релиз.
const APK_LANDING_URL = 'https://apptochite.github.io/'

interface Props {
  onClose: () => void
}

// Шаги переноса данных PWA → APK. Открывается из MigrationBanner.
export default function MigrationSheet({ onClose }: Props) {
  const t = useT()
  const navigate = useNavigate()

  useEffect(() => {
    track('migration_sheet_opened').catch(() => {})
    return startBlur()
  }, [])

  function goBackup() {
    track('migration_backup_click').catch(() => {})
    navigate('/backup')
    onClose()
  }

  function download() {
    track('migration_download_click').catch(() => {})
    window.open(APK_LANDING_URL, '_blank', 'noopener')
  }

  return createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <div className={s.title}>{t.components.migrationTitle}</div>
        <div className={s.subtitle}>{t.components.migrationSubtitle}</div>
        <ol className={ms.steps}>
          <li><span className={ms.num}>1</span><span className={ms.stepText}>{t.components.migrationStep1}</span></li>
          <li><span className={ms.num}>2</span><span className={ms.stepText}>{t.components.migrationStep2}</span></li>
          <li><span className={ms.num}>3</span><span className={ms.stepText}>{t.components.migrationStep3}</span></li>
        </ol>
        <button className={s.primary} onClick={goBackup}>{t.components.migrationBackup}</button>
        <button className={s.primary} onClick={download}>{t.components.migrationDownload}</button>
        <button className={s.skip} onClick={onClose}>{t.components.installLater}</button>
      </div>
    </div>,
    document.body,
  )
}
