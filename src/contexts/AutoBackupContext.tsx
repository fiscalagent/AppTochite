import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { db } from '../db/instance'
import {
  getDirectoryHandle,
  saveDirectoryHandle,
  clearDirectoryHandle,
  performAutoBackup,
  performDailyBackupIfNeeded,
  updateLastBackupAt,
} from '../utils/backup'
import { pickDirectory, requestDirectoryPermission } from '../utils/fileSystemAccess'

interface AutoBackupContextValue {
  isEnabled: boolean
  folderName: string | null
  permissionLost: boolean
  enable: () => Promise<void>
  disable: () => Promise<void>
}

const AutoBackupContext = createContext<AutoBackupContextValue>({
  isEnabled: false,
  folderName: null,
  permissionLost: false,
  enable: async () => {},
  disable: async () => {},
})

export function useAutoBackup() {
  return useContext(AutoBackupContext)
}

export function AutoBackupProvider({ children }: { children: React.ReactNode }) {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [permissionLost, setPermissionLost] = useState(false)
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const isEnablingRef = useRef(false)

  useEffect(() => {
    getDirectoryHandle(db).then(h => {
      handleRef.current = h
      setHandle(h)
    })
  }, [])

  useEffect(() => {
    async function onVisibilityChange() {
      // Run backup when user returns to the app (page in foreground).
      // Doing it on 'hidden' is unreliable: Android Chrome freezes/kills
      // the page immediately, interrupting async writes (causes 0-byte files)
      // and revokes FS permissions before the write completes.
      if (document.visibilityState !== 'visible') return
      // Skip while enable() is running: the permission dialog itself triggers
      // visibility changes, and running backup concurrently causes a race where
      // the failed pre-reconnect attempt resets permissionLost back to true.
      if (isEnablingRef.current) return
      const h = handleRef.current
      if (!h) return
      // Attempt backup without pre-checking queryPermission: on Chrome 122+
      // installed PWAs, queryPermission conservatively returns 'prompt' even
      // when Chrome has persisted the grant and the write would succeed.
      try {
        await performAutoBackup(db, h)
        await performDailyBackupIfNeeded(db, h)
        setPermissionLost(false)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setPermissionLost(true)
        }
        // other errors: silently skip — don't interrupt user
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  async function enable() {
    isEnablingRef.current = true
    try {
      let h = handleRef.current
      if (h) {
        const perm = await requestDirectoryPermission(h)
        if (perm !== 'granted') {
          h = await pickDirectory()
          await saveDirectoryHandle(db, h)
        }
      } else {
        h = await pickDirectory()
        await saveDirectoryHandle(db, h)
      }
      handleRef.current = h
      setHandle(h)
      setPermissionLost(false)
      // Intentionally not caught here — backup errors propagate to the caller
      // so the UI can show a meaningful error instead of silently failing.
      await performAutoBackup(db, h)
      await performDailyBackupIfNeeded(db, h)
      await updateLastBackupAt(db)
    } finally {
      isEnablingRef.current = false
    }
  }

  async function disable() {
    await clearDirectoryHandle(db)
    handleRef.current = null
    setHandle(null)
    setPermissionLost(false)
  }

  return (
    <AutoBackupContext.Provider value={{
      isEnabled: handle !== null,
      folderName: handle?.name ?? null,
      permissionLost,
      enable,
      disable,
    }}>
      {children}
    </AutoBackupContext.Provider>
  )
}
