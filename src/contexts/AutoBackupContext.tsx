import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { db } from '../db/instance'
import { performOPFSBackup, performFolderBackup } from '../utils/backup'
import { performCloudBackup } from '../utils/cloudBackup'

interface AutoBackupContextValue {
  lastBackupTick: number  // increments after each successful backup — use to refresh UI
  requestBackup: () => void  // немедленный бэкап в обход дебаунса — на момент, когда данные точно изменились
}

const AutoBackupContext = createContext<AutoBackupContextValue>({ lastBackupTick: 0, requestBackup: () => {} })

const DEBOUNCE_MS = 2 * 60 * 1000

// Папочный авто-бэкап в APK — через нативный SAF-плагин. Динамический импорт
// под литералом MODE, чтобы PWA-сборка вырезала и ветку, и chunk плагина.
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

// хук-аксессор живёт рядом с провайдером; выносить в отдельный файл ради HMR не оправдано
// eslint-disable-next-line react-refresh/only-export-components
export function useAutoBackup() {
  return useContext(AutoBackupContext)
}

export function AutoBackupProvider({ children }: { children: React.ReactNode }) {
  const [lastBackupTick, setLastBackupTick] = useState(0)
  const lastRunAtRef = useRef(0)
  const inFlightRef = useRef(false)

  // force=true — обход дебаунса: зовётся из мест, где данные ТОЧНО только что
  // изменились (готова заточка, принят нож), а не просто по фокусу/таймеру.
  // Раньше единственными триггерами были visibilitychange/pagehide — а pagehide
  // на Android-APK не гарантированно успевает завершить асинхронную цепочку до
  // выгрузки страницы (особенно с холодным динамическим импортом native-модуля),
  // поэтому папочный бэкап мог отставать на целую сессию («добавил сегодня —
  // авто не сохранило», хотя ручной «Сохранить сейчас» работал всегда).
  async function runBackup(force = false) {
    const now = Date.now()
    if (inFlightRef.current) return
    if (!force && now - lastRunAtRef.current < DEBOUNCE_MS) return
    inFlightRef.current = true
    lastRunAtRef.current = now
    try {
      // .catch: сбой OPFS (в APK-WebView он может быть недоступен) не должен
      // обрывать остальные пути — иначе папочный/облачный бэкап не выполнится.
      await performOPFSBackup(db).catch(() => {})
      performFolderBackup(db).catch(() => {})
      performCloudBackup(db).catch(() => {})
      if (IS_CAPACITOR) {
        // Модуль прогрет на маунте (см. ниже) — здесь import() резолвится из
        // кэша сразу, без сетевого/чанк-запроса, что критично в узком окне
        // pagehide на Android.
        import('../utils/nativeFolderBackup')
          .then(async m => {
            // Сначала довыполняем выбор папки, прерванный выгрузкой приложения
            // во время системного пикера (Samsung/MIUI/EMUI убивают процесс).
            await m.reconcilePickedFolder(db).catch(() => {})
            await m.performNativeFolderBackup(db)
          })
          .catch(() => {})
      }
      setLastBackupTick(t => t + 1)
    } catch {
      // silently skip — OPFS is always available, failures are transient
    } finally {
      inFlightRef.current = false
    }
  }

  useEffect(() => {
    // Прогрев чанка native-модуля сразу на маунте: import() кэширует модуль
    // после первой загрузки, поэтому все последующие import() (в т.ч. из
    // pagehide-обработчика, где время на загрузку чанка не гарантировано)
    // резолвятся синхронно из кэша.
    if (IS_CAPACITOR) import('../utils/nativeFolderBackup').catch(() => {})

    // Run on initial load (page starts visible, no visibilitychange fires)
    // setState внутри runBackup — асинхронно, после await; намеренный kick-off
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runBackup()

    function onVisible() {
      if (document.visibilityState === 'visible') runBackup()
    }
    // pagehide вместо visibilitychange='hidden': браузер гарантированно даёт
    // ~1-2с на синхронную/коротко-асинхронную работу до выгрузки страницы.
    // visibilitychange='hidden' такой гарантии не даёт — WebView Android может
    // оборвать запись авто-бэкапа на полпути.
    function onPageHide() {
      runBackup()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  return (
    <AutoBackupContext.Provider value={{ lastBackupTick, requestBackup: () => { runBackup(true) } }}>
      {children}
    </AutoBackupContext.Provider>
  )
}
