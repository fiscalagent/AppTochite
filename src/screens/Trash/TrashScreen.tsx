import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import { listTrashGroups, restoreBatch, purgeBatch, type TrashGroup } from '../../utils/trash'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import { useToast } from '../../components/Toast/ToastContext'
import { useLocale, localeTag, type Dict, type Locale } from '../../i18n'
import s from './TrashScreen.module.css'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

function formatDate(date: Date, locale: Locale): string {
  return new Date(date).toLocaleString(localeTag(locale), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function daysLeft(expiresAt: Date, t: Dict): string {
  const ms = expiresAt.getTime() - Date.now()
  if (ms <= 0) return t.trash.expiring
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  if (hours < 24) return t.trash.hoursLeft(hours)
  const days = Math.ceil(hours / 24)
  return t.trash.daysLeft(days)
}

function groupTitle(g: TrashGroup, t: Dict): string {
  if (g.client) {
    const n = g.sharpenings.length
    if (n === 0) return g.client.name
    return `${g.client.name} + ${n} ${t.units.sharpenings(n)}`
  }
  if (g.sharpenings.length === 1) {
    return t.trash.groupSharpening(g.sharpenings[0].knifeBrand)
  }
  return `${g.sharpenings.length} ${t.units.sharpenings(g.sharpenings.length)}`
}

export default function TrashScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t, locale } = useLocale()
  const groups = useLiveQuery(() => listTrashGroups(db), []) ?? []
  const [confirmPurge, setConfirmPurge] = useState<TrashGroup | null>(null)

  async function handleRestore(g: TrashGroup) {
    await restoreBatch(db, g.batchId)
    showToast(t.trash.restored)
  }

  async function handlePurge(g: TrashGroup) {
    await purgeBatch(db, g.batchId)
    setConfirmPurge(null)
    showToast(t.trash.purged)
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{t.trash.title}</span>
      </div>

      <p className={s.hint}>
        {t.trash.hint}
      </p>

      {groups.length === 0 && (
        <p className={s.empty}>{t.trash.empty}</p>
      )}

      <div className={s.list}>
        {groups.map(g => (
          <div key={g.batchId} className={s.item}>
            <div className={s.itemHeader}>
              <div className={s.itemTitle}>{groupTitle(g, t)}</div>
              <div className={s.itemMeta}>
                <span>{t.trash.deletedAt(formatDate(g.deletedAt, locale))}</span>
                <span className={s.expires}>{daysLeft(g.expiresAt, t)}</span>
              </div>
            </div>
            <div className={s.itemActions}>
              <button className={s.restoreBtn} onClick={() => handleRestore(g)}>
                {t.trash.restore}
              </button>
              <button className={s.purgeBtn} onClick={() => setConfirmPurge(g)}>
                {t.trash.purge}
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmPurge !== null}
        title={t.trash.confirmTitle}
        message={t.trash.confirmMessage}
        onConfirm={() => confirmPurge && handlePurge(confirmPurge)}
        onCancel={() => setConfirmPurge(null)}
      />
    </div>
  )
}
