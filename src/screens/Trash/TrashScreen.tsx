import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import { listTrashGroups, restoreBatch, purgeBatch, type TrashGroup } from '../../utils/trash'
import { pluralRu } from '../../utils/plural'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import { useToast } from '../../components/Toast/ToastContext'
import s from './TrashScreen.module.css'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function daysLeft(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now()
  if (ms <= 0) return 'удаляется…'
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  if (hours < 24) return `осталось ${hours} ч`
  const days = Math.ceil(hours / 24)
  return `осталось ${days} дн.`
}

const SHARPENING_FORMS = ['заточка', 'заточки', 'заточек'] as const

function groupTitle(g: TrashGroup): string {
  if (g.client) {
    const n = g.sharpenings.length
    if (n === 0) return g.client.name
    return `${g.client.name} + ${n} ${pluralRu(n, SHARPENING_FORMS)}`
  }
  if (g.sharpenings.length === 1) {
    return `Заточка: ${g.sharpenings[0].knifeBrand}`
  }
  return `${g.sharpenings.length} ${pluralRu(g.sharpenings.length, SHARPENING_FORMS)}`
}

export default function TrashScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const groups = useLiveQuery(() => listTrashGroups(db), []) ?? []
  const [confirmPurge, setConfirmPurge] = useState<TrashGroup | null>(null)

  async function handleRestore(g: TrashGroup) {
    await restoreBatch(db, g.batchId)
    showToast('Восстановлено')
  }

  async function handlePurge(g: TrashGroup) {
    await purgeBatch(db, g.batchId)
    setConfirmPurge(null)
    showToast('Удалено навсегда')
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>КОРЗИНА</span>
      </div>

      <p className={s.hint}>
        Удалённые записи хранятся 3 дня, после чего удаляются навсегда.
      </p>

      {groups.length === 0 && (
        <p className={s.empty}>Корзина пуста</p>
      )}

      <div className={s.list}>
        {groups.map(g => (
          <div key={g.batchId} className={s.item}>
            <div className={s.itemHeader}>
              <div className={s.itemTitle}>{groupTitle(g)}</div>
              <div className={s.itemMeta}>
                <span>Удалено {formatDate(g.deletedAt)}</span>
                <span className={s.expires}>{daysLeft(g.expiresAt)}</span>
              </div>
            </div>
            <div className={s.itemActions}>
              <button className={s.restoreBtn} onClick={() => handleRestore(g)}>
                Восстановить
              </button>
              <button className={s.purgeBtn} onClick={() => setConfirmPurge(g)}>
                Удалить навсегда
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmPurge !== null}
        title="Удалить навсегда?"
        message="Это действие необратимо. Восстановить будет нельзя."
        onConfirm={() => confirmPurge && handlePurge(confirmPurge)}
        onCancel={() => setConfirmPurge(null)}
      />
    </div>
  )
}
