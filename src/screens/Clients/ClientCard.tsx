import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type Sharpening } from '../../db/instance'
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

  // ?? null: get() для отсутствующей записи отдаёт undefined — неотличимо от
  // «ещё грузится». null явно означает «записи нет» и включает ветку not-found.
  const client = useLiveQuery(async () => (await db.clients.get(clientId)) ?? null, [clientId])

  const truncate = (sh: Sharpening): Sharpening => ({
    ...sh,
    photosBefore: sh.photosBefore?.slice(0, 1),
    photosAfter: sh.photosAfter?.slice(0, 1),
  })

  // Бренды ножей клиента — для чипов фильтра. Ключи составного индекса
  // [clientId+knifeBrand], без разворачивания записей (в т.ч. фото). Индекс не
  // знает про deletedAt, поэтому мягко удалённые (TTL корзины 3 дня) вычитаем
  // отдельным дешёвым запросом — тот же приём, что и в SharpeningForm.
  const knifeBrands = useLiveQuery(async () => {
    const pairs = await db.sharpenings
      .where('[clientId+knifeBrand]')
      .between([clientId, Dexie.minKey], [clientId, Dexie.maxKey])
      .keys() as unknown as [number, string][]
    const counts = new Map<string, number>()
    for (const [, brand] of pairs) counts.set(brand, (counts.get(brand) ?? 0) + 1)
    if (counts.size > 0) {
      const deleted = await db.sharpenings.where('deletedAt').above(new Date(0))
        .and(sh => sh.clientId === clientId).toArray()
      for (const sh of deleted) counts.set(sh.knifeBrand, (counts.get(sh.knifeBrand) ?? 0) - 1)
    }
    return [...counts.entries()].filter(([, n]) => n > 0).map(([b]) => b).sort()
  }, [clientId])

  // Точное количество заточек (для пагинации) — считается индексом, без чтения
  // самих записей.
  const totalCount = useLiveQuery(async () => {
    if (knifeFilter) {
      const cnt = await db.sharpenings.where('[clientId+knifeBrand]').equals([clientId, knifeFilter]).count()
      const deletedCnt = await db.sharpenings.where('deletedAt').above(new Date(0))
        .and(sh => sh.clientId === clientId && sh.knifeBrand === knifeFilter).count()
      return cnt - deletedCnt
    }
    const cnt = await db.sharpenings.where('clientId').equals(clientId).count()
    const deletedCnt = await db.sharpenings.where('deletedAt').above(new Date(0))
      .and(sh => sh.clientId === clientId).count()
    return cnt - deletedCnt
  }, [clientId, knifeFilter])

  // Раньше здесь читалась ВСЯ история заточек клиента целиком (полные
  // photosBefore/photosAfter, обрезанные до одного фото уже ПОСЛЕ чтения), а
  // пагинация резала уже загруженный в память массив. Для «Я» с историей за
  // годы это читало и разворачивало тысячи фото при каждом заходе на карточку.
  // Теперь читаем ровно PAGE_SIZE записей на текущую страницу.
  const pageItems = useLiveQuery(async () => {
    if (knifeFilter) {
      const ids = await db.sharpenings
        .where('[clientId+knifeBrand]').equals([clientId, knifeFilter])
        .primaryKeys()
      const records = await db.sharpenings.bulkGet(ids as number[])
      const alive = records.filter((r): r is Sharpening => !!r && !r.deletedAt)
      alive.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      return alive.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(truncate)
    }
    const rows = await db.sharpenings
      .where('[clientId+receivedAt]')
      .between([clientId, Dexie.minKey], [clientId, Dexie.maxKey])
      .reverse()
      .offset(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray()
    return rows.filter(sh => !sh.deletedAt).map(truncate)
  }, [clientId, knifeFilter, page])

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
        {client.isSelf ? (
          <Link to="/business-card">
            <button className={s.editBtn}>{t.clients.businessCardLink}</button>
          </Link>
        ) : (
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
        const knives = knifeBrands ?? []
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
        const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE)

        return (
          <div className={s.sharpeningList}>
            {totalCount === 0 && (
              <p className={s.empty}>{t.clients.noSharpenings}</p>
            )}
            {(pageItems ?? []).map(sh => (
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
