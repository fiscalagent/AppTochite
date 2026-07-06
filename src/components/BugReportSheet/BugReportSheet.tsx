import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { startBlur } from '../../utils/modalBlur'
import { useT } from '../../i18n'
import { useToast } from '../Toast/ToastContext'
import { baseContext } from '../../services/analytics'
import {
  buildBugReportPayload,
  collectDiagnostics,
  sendBugReport,
  type BugDiagnostics,
} from '../../services/bugReport'
import s from './BugReportSheet.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
}

// Обёртка размонтирует форму при закрытии — состояние (текст, контакт)
// сбрасывается само, без setState в эффекте.
export default function BugReportSheet({ isOpen, onClose }: Props) {
  if (!isOpen) return null
  return <BugReportSheetBody onClose={onClose} />
}

function BugReportSheetBody({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { showToast } = useToast()
  const [text, setText] = useState('')
  const [contact, setContact] = useState('')
  const [sending, setSending] = useState(false)
  const [diag, setDiag] = useState<BugDiagnostics | null>(null)

  useEffect(() => {
    collectDiagnostics().then(setDiag).catch(() => {})
    return startBlur()
  }, [])

  // Превью «что будет отправлено» собирается из тех же источников, что и
  // реальный payload — пользователь видит ровно то, что уйдёт.
  const preview = { ...baseContext(), ...(diag ?? {}) }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    const d = diag ?? (await collectDiagnostics())
    const payload = await buildBugReportPayload(trimmed, contact.trim(), d)
    // Офлайн-репорт ляжет в очередь и уедет при появлении сети — тост честный.
    const queued = !navigator.onLine
    await sendBugReport(payload)
    showToast(queued ? t.about.bugReportQueued : t.about.bugReportSent)
    onClose()
  }

  return createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <p className={s.title}>{t.about.bugReportTitle}</p>
        <textarea
          className={s.textarea}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t.about.bugReportPlaceholder}
          maxLength={2000}
          rows={5}
        />
        <input
          className={s.contactInput}
          type="text"
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder={t.about.bugReportContactPlaceholder}
          maxLength={64}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <p className={s.hint}>{t.about.bugReportHint}</p>
        <details className={s.details}>
          <summary className={s.detailsSummary}>{t.about.bugReportDetails}</summary>
          <pre className={s.detailsPre}>{JSON.stringify(preview, null, 2)}</pre>
        </details>
        <div className={s.actions}>
          <button
            className={s.sendBtn}
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? t.about.bugReportSending : t.about.bugReportSend}
          </button>
          <button className={s.cancelBtn} onClick={onClose}>{t.common.cancel}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
