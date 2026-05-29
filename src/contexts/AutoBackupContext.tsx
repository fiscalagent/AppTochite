import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { db } from '../db/instance'
import { performOPFSBackup } from '../utils/backup'

interface AutoBackupContextValue {
  lastBackupTick: number  // increments after each successful backup — use to refresh UI
}

const AutoBackupContext = createContext<AutoBackupContextValue>({ lastBackupTick: 0 })

const DEBOUNCE_MS = 2 * 60 * 1000

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
      setLastBackupTick(t => t + 1)
    } catch {
      // silently skip — OPFS is always available, failures are transient
    } finally {
      inFlightRef.current = false
    }
  }

  useEffect(() => {
    // Run on initial load (page starts visible, no visibilitychange fires)
    runBackup()

    function onVisibilityChange() {
      // Fire on both directions: visible (opened/returned from background)
      // and hidden (closed/swiped to background) — covers users who don't reopen.
      runBackup()
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
