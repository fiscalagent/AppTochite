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

  useEffect(() => {
    getDirectoryHandle(db).then(h => {
      handleRef.current = h
      setHandle(h)
    })
  }, [])

  useEffect(() => {
    async function onVisibilityChange() {
      if (document.visibilityState !== 'hidden') return
      const h = handleRef.current
      if (!h) return
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
    await performAutoBackup(db, h)
    await updateLastBackupAt(db)
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
