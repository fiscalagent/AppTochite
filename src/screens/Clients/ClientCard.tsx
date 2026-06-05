import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import Avatar from '../../components/Avatar/Avatar'
import StatusPill from '../../components/StatusPill/StatusPill'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import PhotoSourceSheet from '../../components/PhotoSourceSheet/PhotoSourceSheet'
import { useToast } from '../../components/Toast/ToastContext'
import { pickAvatarFile } from '../../hooks/useCamera'
import { softDeleteClient } from '../../utils/trash'
import { useLocale, fmtMoney, fmtDateShort, type Locale } from '../../i18n'
import s from './ClientCard.module.css'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IconChevronRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

function formatDate(date: Date, locale: Locale) {
  return fmtDateShort(locale, date)
}

export default function ClientCard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t, locale } = useLocale()
  const clientId = Number(id)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false)
  const [knifeFilter, setKnifeFilter] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const PAGE_SIZE = 10

  const client = useLiveQuery(() => db.clients.get(clientId), [clientId])
  const sharpenings = useLiveQuery(
    () => db.sharpenings.where('clientId').equals(clientId).reverse().sortBy('receivedAt').then(arr =>
      arr.filter(sh => !sh.deletedAt).map(sh => ({
        ...sh,
        photosBefore: sh.photosBefore?.slice(0, 1),
        photosAfter: sh.photosAfter?.slice(0, 1),
      }))
    ),
    [clientId]
  )

  async function handleDelete() {
    await softDeleteClient(db, clientId)
    showToast(t.clients.movedToTrash)
    navigate('/')
  }

  if (client === undefined) return null
  if (client === null || client.deletedAt) return <div style={{ padding: 16, color: 'var(--text-300)' }}>{t.clients.notFoundClient}</div>

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.headerTitle}>{(client.isSelf ? t.clients.selfName : client.name).toUpperCase()}</span>
        {!client.isSelf && (
          <Link to={`/clients/${clientId}/edit`}>
            <button className={s.editBtn}>{t.clients.edit}</button>
          </Link>
        )}
      </div>

      <div className={s.profile}>
        {client.isSelf ? (
          <button className={s.avatarBtn} onClick={() => setAvatarSheetOpen(true)}>
            <Avatar name={t.clients.selfName} size={48} isSelf photo={client.avatar} initials={t.clients.selfName} />
          </button>
        ) : (
          <Avatar name={client.name} size={48} photo={client.avatar} />
        )}
        <div className={s.profileInfo}>
          <div className={s.profileName}>{client.isSelf ? t.clients.selfName : client.name}</div>
          <div className={s.profileMeta}>
            {client.phone && (
              <button
                className={s.contactBtn}
                onClick={() => {
                  navigator.clipboard.writeText(client.phone!)
                  showToast(t.clients.phoneCopied)
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
              <span>{t.clients.noContacts}</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className={s.sectionHeader}>
          <span className={s.sectionTitle}>{t.clients.sharpeningsSection}</span>
          <Link to={`/sharpenings/new?clientId=${clientId}`}>
            <button className={s.newBtn}>{t.clients.newSharpening}</button>
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
              {t.clients.allKnives}
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
              <p className={s.empty}>{t.clients.noSharpenings}</p>
            )}
            {pageItems.map(sh => (
              <Link key={sh.id} to={`/sharpenings/${sh.id}`} className={s.sharpeningRow}>
                <div className={s.sharpeningInfo}>
                  <div className={s.knifeName}>{sh.knifeBrand}</div>
                  <div className={s.sharpeningMeta}>{formatDate(sh.receivedAt, locale)}</div>
                </div>
                {(() => {
                  const thumb = sh.photosAfter?.[0] ?? sh.photosBefore?.[0]
                  return thumb ? <img src={thumb} className={s.thumb} alt="" loading="lazy" decoding="async" /> : null
                })()}
                <div className={s.sharpeningRight}>
                  {sh.price != null && (
                    <span className={s.price}>{fmtMoney(locale, sh.price)}</span>
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
                ><IconChevronLeft /></button>
                <span className={s.pageLabel}>{page + 1} / {totalPages}</span>
                <button
                  className={s.pageBtn}
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                ><IconChevronRight /></button>
              </div>
            )}
          </div>
        )
      })()}

      {!client.isSelf && (
        <button className={s.deleteBtn} onClick={() => setConfirmOpen(true)}>
          {t.clients.deleteClient}
        </button>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title={t.clients.deleteTitle(client.name)}
        message={t.clients.deleteMessage}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      {avatarSheetOpen && (
        <PhotoSourceSheet
          onCamera={() => pickAvatarFile(true, b64 => db.clients.update(clientId, { avatar: b64, updatedAt: new Date() }))}
          onGallery={() => pickAvatarFile(false, b64 => db.clients.update(clientId, { avatar: b64, updatedAt: new Date() }))}
          onClose={() => setAvatarSheetOpen(false)}
        />
      )}
    </div>
  )
}
