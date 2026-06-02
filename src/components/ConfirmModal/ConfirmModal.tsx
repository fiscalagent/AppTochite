import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
import { useT } from '../../i18n'
import s from './ConfirmModal.module.css'

interface Props {
  isOpen: boolean
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen, title, message, confirmLabel, onConfirm, onCancel,
}: Props) {
  const t = useT()
  useEffect(() => {
    if (!isOpen) return
    return startBlur()
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <p className={s.title}>{title}</p>
        {message && <p className={s.message}>{message}</p>}
        <div className={s.actions}>
          <button className={s.confirmBtn} onClick={onConfirm}>{confirmLabel ?? t.components.confirmDelete}</button>
          <button className={s.cancelBtn} onClick={onCancel}>{t.common.cancel}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
