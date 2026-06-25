import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../../db/instance'
import { startBlur } from '../../utils/modalBlur'
import { useT } from '../../i18n'
import { useToast } from '../Toast/ToastContext'
import { supportsFileSystemAccess } from '../../utils/fileSystemAccess'
import { getFolderBackupMeta, pickAndConnectFolder } from '../../utils/backup'
import s from '../OnboardingSheet/OnboardingSheet.module.css'

const DISMISSED_KEY = 'folderPromptDismissedAt'
const RESHOW_AFTER_MS = 90 * 24 * 60 * 60 * 1000
const RESHOW_THRESHOLD = 10

// В APK File System Access недоступен (нудж предлагал бы подключить папку через
// неработающий showDirectoryPicker). Папочный бэкап в APK — нативный, в BackupScreen.
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

function isDismissed(sharpeningCount: number): boolean {
  const raw = localStorage.getItem(DISMISSED_KEY)
  if (!raw) return false
  const age = Date.now() - new Date(raw).getTime()
  if (age < RESHOW_AFTER_MS) return true
  // 90 дней прошло: показываем снова только если данных достаточно
  return sharpeningCount < RESHOW_THRESHOLD
}

export default function FolderBackupPrompt() {
  const [visible, setVisible] = useState(false)
  const [picking, setPicking] = useState(false)
  const t = useT()
  const { showToast } = useToast()

  useEffect(() => {
    if (IS_CAPACITOR || !supportsFileSystemAccess()) return

    async function check() {
      const [folderMeta, count] = await Promise.all([
        getFolderBackupMeta(db),
        db.sharpenings.filter(sh => !sh.deletedAt).count(),
      ])
      if (folderMeta) return
      if (count === 0) return
      if (isDismissed(count)) return
      setVisible(true)
    }
    check()
  }, [])

  useEffect(() => {
    if (!visible) return
    return startBlur()
  }, [visible])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString())
    setVisible(false)
  }

  async function handlePick() {
    if (picking) return
    setPicking(true)
    try {
      await pickAndConnectFolder(db)
      showToast(t.backup.folderSaved)
      setVisible(false)
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        showToast(t.backup.folderError)
      }
    } finally {
      setPicking(false)
    }
  }

  if (!visible) return null

  return createPortal(
    <div className={s.overlay} onClick={dismiss}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <div className={s.title}>{t.components.folderPromptTitle}</div>
        <div className={s.subtitle}>{t.components.folderPromptBody}</div>
        <button className={s.primary} onClick={handlePick} disabled={picking}>
          {picking ? '…' : t.components.folderPromptPick}
        </button>
        <button className={s.skip} onClick={dismiss}>
          {t.components.folderPromptDecline}
        </button>
      </div>
    </div>,
    document.body
  )
}
