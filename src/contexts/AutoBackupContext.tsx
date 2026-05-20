import { createContext, useContext, useEffect } from 'react'
import { db } from '../db/instance'
import { performOPFSBackup } from '../utils/backup'

const AutoBackupContext = createContext<null>(null)

export function useAutoBackup() {
  return useContext(AutoBackupContext)
}

export function AutoBackupProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      try {
        await performOPFSBackup(db)
      } catch {
        // silently skip — OPFS is always available, failures are transient
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return (
    <AutoBackupContext.Provider value={null}>
      {children}
    </AutoBackupContext.Provider>
  )
}
