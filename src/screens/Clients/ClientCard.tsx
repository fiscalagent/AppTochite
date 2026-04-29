import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import Avatar from '../../components/Avatar/Avatar'
import StatusPill from '../../components/StatusPill/StatusPill'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import { useToast } from '../../components/Toast/ToastContext'
import s from './ClientCard.module.css'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function ClientCard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const clientId = Number(id)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [knifeFilter, setKnifeFilter] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const PAGE_SIZE = 10

  const client = useLiveQuery(() => db.clients.get(clientId), [clientId])
  const sharpenings = useLiveQuery(
    () => db.sharpenings.where('clientId').equals(clientId).reverse().sortBy('receivedAt').then(arr =>
      arr.map(sh => ({
        ...sh,
        photosBefore: sh.photosBefore?.slice(0, 1),
        photosAfter: sh.photosAfter?.slice(0, 1),
      }))
    ),
    [clientId]
  )

  async function handleDelete() {
    await db.sharpenings.where('clientId').equals(clientId).delete()
    await db.clients.delete(clientId)
    showToast('Клиент удалён')
    navigate('/')
  }

  if (client === undefined) return null
  if (client === null) return <div style={{ padding: 16, color: 'var(--text-300)' }}>Клиент не найден</div>

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => navigate('/')}><IconChevronLeft /></button>
        <span className={s.headerTitle}>{client.name.toUpperCase()}</span>
        {!client.isSelf && (
          <Link to={`/clients/${clientId}/edit`}>
            <button className={s.editBtn}>Изменить</button>
          </Link>
        )}
      </div>

      <div className={s.profile}>
        <Avatar name={client.name} size={48} />
        <div className={s.profileInfo}>
          <div className={s.profileName}>{client.name}</div>
          <div className={s.profileMeta}>
            {client.phone && (
              <button
                className={s.contactBtn}
                onClick={() => {
                  navigator.clipboard.writeText(client.phone!)
                  showToast('Телефон скопирован в буфер')
                }}
              >
                {client.phone}
              </button>
            )}
            {client.telegram && (
              <a
                className={s.contactBtn}
                href={`https://t.me/${client.telegram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {client.telegram}
              </a>
            )}
            {!client.phone && !client.telegram && (
              <span>Нет контактов</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className={s.sectionHeader}>
          <span className={s.sectionTitle}>Заточки</span>
          <Link to={`/sharpenings/new?clientId=${clientId}`}>
            <button className={s.newBtn}>+ Заточка</button>
          </Link>
        </div>
      </div>

      {(() => {
        const knives = [...new Set((sharpenings ?? []).map(sh => sh.knifeBrand))].sort()
        if (knives.length < 2) return null
        return (
          <div className={s.knifeFilters}>
            <button
              className={`${s.knifeChip} ${knifeFilter === null ? s.knifeChipActive : ''}`}
              onClick={() => { setKnifeFilter(null); setPage(0) }}
            >
              Все
            </button>
            {knives.map(knife => (
              <button
                key={knife}
                className={`${s.knifeChip} ${knifeFilter === knife ? s.knifeChipActive : ''}`}
                onClick={() => { setKnifeFilter(k => k === knife ? null : knife); setPage(0) }}
              >
                {knife}
              </button>
            ))}
          </div>
        )
      })()}

      {(() => {
        const filtered = knifeFilter
          ? (sharpenings ?? []).filter(sh => sh.knifeBrand === knifeFilter)
          : (sharpenings ?? [])
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
        const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

        return (
          <div className={s.sharpeningList}>
            {filtered.length === 0 && (
              <p className={s.empty}>Заточек пока нет</p>
            )}
            {pageItems.map(sh => (
              <Link key={sh.id} to={`/sharpenings/${sh.id}`} className={s.sharpeningRow}>
                <div className={s.sharpeningInfo}>
                  <div className={s.knifeName}>{sh.knifeBrand}</div>
                  <div className={s.sharpeningMeta}>{formatDate(sh.receivedAt)}</div>
                </div>
                {(() => {
                  const thumb = sh.photosAfter?.[0] ?? sh.photosBefore?.[0]
                  return thumb ? <img src={thumb} className={s.thumb} alt="" loading="lazy" decoding="async" /> : null
                })()}
                <div className={s.sharpeningRight}>
                  {sh.price != null && (
                    <span className={s.price}>{sh.price} ₽</span>
                  )}
                  <StatusPill status={sh.status} />
                </div>
              </Link>
            ))}
            {totalPages > 1 && (
              <div className={s.pagination}>
                <button
                  className={s.pageBtn}
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                >←</button>
                <span className={s.pageLabel}>{page + 1} / {totalPages}</span>
                <button
                  className={s.pageBtn}
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                >→</button>
              </div>
            )}
          </div>
        )
      })()}

      {!client.isSelf && (
        <button className={s.deleteBtn} onClick={() => setConfirmOpen(true)}>
          Удалить клиента
        </button>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title={`Удалить клиента «${client.name}»?`}
        message="Все его заточки также будут удалены. Это действие необратимо."
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
