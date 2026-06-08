import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { db } from '../../db/instance'
import { readSentinel, getFolderNameHint } from '../../utils/backup'
import { startBlur } from '../../utils/modalBlur'
import { router } from '../../router'
import { useT } from '../../i18n'
import s from '../OnboardingSheet/OnboardingSheet.module.css'

export default function DataLossAlert() {
  const [visible, setVisible] = useState(false)
  const [lostCount, setLostCount] = useState(0)
  const folderHint = getFolderNameHint()
  const t = useT()

  useEffect(() => {
    const sentinel = readSentinel()
    if (!sentinel || sentinel.sharpenings === 0) return

    async function check() {
      const count = await db.sharpenings.filter(sh => !sh.deletedAt).count()
      if (count > 0) return
      setLostCount(sentinel!.sharpenings)
      setVisible(true)
    }
    check()
  }, [])

  useEffect(() => {
    if (!visible) return
    return startBlur()
  }, [visible])

  function dismiss() {
    setVisible(false)
  }

  function goToRestore() {
    dismiss()
    router.navigate('/backup')
  }

  if (!visible) return null

  return createPortal(
    <div className={s.overlay} onClick={dismiss}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <div className={s.title}>{t.components.dataLossTitle}</div>
        <div className={s.subtitle}>{t.components.dataLossBody(lostCount)}</div>
        {folderHint && (
          <div className={s.subtitle} style={{ fontSize: 13, color: 'var(--accent)', marginTop: -8 }}>
            {t.components.dataLossFolderHint(folderHint)}
          </div>
        )}
        <button className={s.primary} onClick={goToRestore}>
          {t.components.dataLossRestore}
        </button>
        <button className={s.skip} onClick={dismiss}>
          {t.components.dataLossDismiss}
        </button>
      </div>
    </div>,
    document.body
  )
}
