import { createContext, useContext, useEffect, useState } from 'react'
import { db } from '../db/instance'
import { performOPFSBackup } from '../utils/backup'

interface AutoBackupContextValue {
  lastBackupTick: number  // increments after each successful backup — use to refresh UI
}

const AutoBackupContext = createContext<AutoBackupContextValue>({ lastBackupTick: 0 })

export function useAutoBackup() {
  return useContext(AutoBackupContext)
}

export function AutoBackupProvider({ children }: { children: React.ReactNode }) {
  const [lastBackupTick, setLastBackupTick] = useState(0)

  async function runBackup() {
    try {
      await performOPFSBackup(db)
      setLastBackupTick(t => t + 1)
    } catch {
      // silently skip — OPFS is always available, failures are transient
    }
  }

  useEffect(() => {
    // Run on initial load (page starts visible, no visibilitychange fires)
    runBackup()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') runBackup()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return (
    <AutoBackupContext.Provider value={{ lastBackupTick }}>
      {children}
    </AutoBackupContext.Provider>
  )
}
