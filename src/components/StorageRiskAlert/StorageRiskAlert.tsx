import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { isStorageEvictable } from '../../utils/storagePersistence'
import { startBlur } from '../../utils/modalBlur'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
import MigrationSheet from '../MigrationPrompt/MigrationSheet'
import s from '../OnboardingSheet/OnboardingSheet.module.css'

// Детектор «WebAPK установлен некорректно». Если наши данные лежат во вытесняемом
// хранилище (обычная вкладка / legacy-ярлык вместо установленного приложения),
// Chrome может их стереть — предупреждаем пользователя и ведём на нормальную
// установку. В APK нативное хранилище durable → детектор не нужен, ветку срежет DCE.
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'
// Показываем один раз за сессию, чтобы не мешать на каждом переходе.
const SESSION_KEY = 'storage-risk-shown'

export default function StorageRiskAlert() {
  const t = useT()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (IS_CAPACITOR) return
    if (sessionStorage.getItem(SESSION_KEY)) return
    let cancelled = false
    isStorageEvictable().then(evictable => {
      if (cancelled || !evictable) return
      sessionStorage.setItem(SESSION_KEY, '1')
      setVisible(true)
      track('storage_risk_shown').catch(() => {})
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!visible || sheetOpen) return
    return startBlur()
  }, [visible, sheetOpen])

  if (IS_CAPACITOR || !visible) return null

  function goBackup() {
    track('storage_risk_backup_click').catch(() => {})
    setVisible(false)
    navigate('/backup')
  }

  return (
    <>
      {!sheetOpen && createPortal(
        <div className={s.overlay} onClick={() => setVisible(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.handle} />
            <div className={s.title}>{t.components.storageRiskTitle}</div>
            <div className={s.subtitle}>{t.components.storageRiskBody}</div>
            <button
              className={s.primary}
              onClick={() => { track('storage_risk_install_click').catch(() => {}); setSheetOpen(true) }}
            >
              {t.components.storageRiskInstall}
            </button>
            <button className={s.primary} onClick={goBackup}>{t.components.storageRiskBackup}</button>
            <button className={s.skip} onClick={() => setVisible(false)}>{t.components.storageRiskDismiss}</button>
          </div>
        </div>,
        document.body,
      )}
      {sheetOpen && <MigrationSheet onClose={() => { setSheetOpen(false); setVisible(false) }} />}
    </>
  )
}
