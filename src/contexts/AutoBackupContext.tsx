import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { db } from '../db/instance'
import { performOPFSBackup, performFolderBackup } from '../utils/backup'
import { performCloudBackup } from '../utils/cloudBackup'

interface AutoBackupContextValue {
  lastBackupTick: number  // increments after each successful backup — use to refresh UI
}

const AutoBackupContext = createContext<AutoBackupContextValue>({ lastBackupTick: 0 })

const DEBOUNCE_MS = 2 * 60 * 1000

// Папочный авто-бэкап в APK — через @capacitor/filesystem. Динамический импорт
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

  async function runBackup() {
    const now = Date.now()
    if (inFlightRef.current) return
    if (now - lastRunAtRef.current < DEBOUNCE_MS) return
    inFlightRef.current = true
    lastRunAtRef.current = now
    try {
      await performOPFSBackup(db)
      performFolderBackup(db).catch(() => {})
      performCloudBackup(db).catch(() => {})
      if (IS_CAPACITOR) {
        import('../utils/nativeFolderBackup')
          .then(m => m.performNativeFolderBackup(db))
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
    <AutoBackupContext.Provider value={{ lastBackupTick }}>
      {children}
    </AutoBackupContext.Provider>
  )
}
