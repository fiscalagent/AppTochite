import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../../db/instance'
import { startBlur } from '../../utils/modalBlur'
import { useT } from '../../i18n'
import { useToast } from '../Toast/ToastContext'
import { supportsFileSystemAccess } from '../../utils/fileSystemAccess'
import { getFolderBackupMeta, pickAndConnectFolder } from '../../utils/backup'
import s from '../OnboardingSheet/OnboardingSheet.module.css'

const DISMISSED_KEY = 'folderPromptDismissed'

export default function FolderBackupPrompt() {
  const [visible, setVisible] = useState(false)
  const [picking, setPicking] = useState(false)
  const t = useT()
  const { showToast } = useToast()

  useEffect(() => {
    if (!supportsFileSystemAccess()) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    async function check() {
      const [folderMeta, count] = await Promise.all([
        getFolderBackupMeta(db),
        db.sharpenings.filter(sh => !sh.deletedAt).count(),
      ])
      if (folderMeta) return
      if (count === 0) return
      setVisible(true)
    }
    check()
  }, [])

  useEffect(() => {
    if (!visible) return
    return startBlur()
  }, [visible])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
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
