import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import StatusPill from '../../components/StatusPill/StatusPill'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import PhotoLightbox from '../../components/PhotoLightbox/PhotoLightbox'
import PhotoSourceSheet from '../../components/PhotoSourceSheet/PhotoSourceSheet'
import { useToast } from '../../components/Toast/ToastContext'
import { useCamera } from '../../hooks/useCamera'
import s from './SharpeningDetail.module.css'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IconPerson = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function SharpeningDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const sharpeningId = Number(id)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const { openCamera, openGallery } = useCamera()

  const sh = useLiveQuery(() => db.sharpenings.get(sharpeningId), [sharpeningId])
  const client = useLiveQuery(
    () => sh ? db.clients.get(sh.clientId) : undefined,
    [sh?.clientId]
  )
  async function handleMarkDone() {
    await db.sharpenings.update(sharpeningId, { status: 'done', doneAt: new Date() })
    showToast('Статус обновлён — готово!')
    setPhotoModal(true)
  }

  async function addAfterPhoto(pick: (cb: (b64: string) => void) => void) {
    const current = await db.sharpenings.get(sharpeningId)
    const existing = current?.photosAfter ?? []
    if (existing.length >= 5) {
      showToast('Максимум 5 фото после заточки')
      return
    }
    pick(async (b64) => {
      await db.sharpenings.update(sharpeningId, { photosAfter: [...existing, b64] })
    })
  }

  async function handleRemovePhoto(field: 'photosBefore' | 'photosAfter', index: number) {
    const current = await db.sharpenings.get(sharpeningId)
    if (!current) return
    const updated = (current[field] ?? []).filter((_, i) => i !== index)
    const value = updated.length ? updated : undefined
    if (field === 'photosBefore') {
      await db.sharpenings.update(sharpeningId, { photosBefore: value })
    } else {
      await db.sharpenings.update(sharpeningId, { photosAfter: value })
    }
  }

  async function handleDelete() {
    await db.sharpenings.delete(sharpeningId)
    showToast('Заточка удалена')
    navigate(-1)
  }

  if (sh === undefined) return null
  if (sh === null) return (
    <div style={{ padding: 16, color: 'var(--text-300)' }}>Запись не найдена</div>
  )

  const sortedStones = sh.stones ? [...sh.stones].sort((a, b) => a.order - b.order) : []

  const coverField: 'photosAfter' | 'photosBefore' | null =
    sh.photosAfter?.length ? 'photosAfter' : sh.photosBefore?.length ? 'photosBefore' : null

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.headerTitle}>{sh.knifeBrand.toUpperCase()}</span>
        <Link to={`/sharpenings/${sharpeningId}/edit`}>
          <button className={s.editBtn}>Изменить</button>
        </Link>
      </div>

      <div className={s.statusRow}>
        <div className={s.statusInfo}>
          <StatusPill status={sh.status} />
          <span className={s.statusDate}>
            принят {formatDate(sh.receivedAt)}
            {sh.doneAt && ` · готов ${formatDate(sh.doneAt)}`}
          </span>
        </div>
        {sh.price != null && (
          <span className={s.price}>{sh.price} ₽</span>
        )}
      </div>

      <div className={s.card}>
        <div className={s.sectionTitle}>Нож</div>
        <div className={s.row}>
          <span className={s.rowLabel}>Бренд</span>
          <span className={s.rowValue}>{sh.knifeBrand}</span>
        </div>
        {sh.steel && (
          <div className={s.row}>
            <span className={s.rowLabel}>Сталь</span>
            <span className={s.rowValue}>{sh.steel}{sh.hrc ? ` · ${sh.hrc} HRC` : ''}</span>
          </div>
        )}
        {sh.condition && sh.condition.length > 0 && (
          <>
            <div className={s.divider} />
            <div>
              <div className={s.sectionTitle} style={{ marginBottom: 8 }}>Состояние</div>
              <div className={s.chips}>
                {sh.condition.map(c => (
                  <span key={c} className={s.chip}>{c}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {(sh.angle || sortedStones.length > 0 || sh.comment) && (
        <div className={s.card}>
          <div className={s.sectionTitle}>Заточка</div>
          {sh.angle && (
            <div className={s.row}>
              <span className={s.rowLabel}>Угол</span>
              <span className={s.rowValue}>{sh.angle}°</span>
            </div>
          )}
          {sortedStones.length > 0 && (
            <div>
              <div className={s.sectionTitle} style={{ marginBottom: 8 }}>Камни</div>
              <div className={s.stoneTags}>
                {sortedStones.map(ss => (
                  <div key={ss.order} className={s.stoneTag}>
                    <span className={s.stoneOrder}>{ss.order}.</span>
                    <span>{ss.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sh.comment && (
            <>
              <div className={s.divider} />
              <div className={s.row}>
                <span className={s.rowLabel}>Комментарий</span>
              </div>
              <span className={s.rowValue} style={{ textAlign: 'left' }}>{sh.comment}</span>
            </>
          )}
        </div>
      )}

      {/* Фото */}
      {(sh.photosBefore?.length || sh.photosAfter?.length) ? (
        <div className={s.card}>
          {sh.photosBefore && sh.photosBefore.length > 0 && (
            <div className={s.photoSection}>
              <div className={s.photoSectionTitle}>Фото «До»</div>
              <div className={s.photoScroll}>
                {sh.photosBefore.map((src, i) => {
                  const isCover = coverField === 'photosBefore' && i === 0
                  return (
                    <div key={i} className={s.photoWrapper}>
                      <img
                        src={src}
                        className={`${s.photoImg} ${isCover ? s.photoImgCover : ''}`}
                        alt=""
                        onClick={() => setLightbox({ photos: sh.photosBefore!, index: i })}
                      />
                      {isCover && <span className={s.coverBadge}>обложка</span>}
                      <button
                        className={s.photoRemove}
                        onClick={() => handleRemovePhoto('photosBefore', i)}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {sh.photosAfter && sh.photosAfter.length > 0 && (
            <div className={s.photoSection}>
              <div className={s.photoSectionTitle}>Фото «После»</div>
              <div className={s.photoScroll}>
                {sh.photosAfter.map((src, i) => {
                  const isCover = coverField === 'photosAfter' && i === 0
                  return (
                    <div key={i} className={s.photoWrapper}>
                      <img
                        src={src}
                        className={`${s.photoImg} ${isCover ? s.photoImgCover : ''}`}
                        alt=""
                        onClick={() => setLightbox({ photos: sh.photosAfter!, index: i })}
                      />
                      {isCover && <span className={s.coverBadge}>обложка</span>}
                      <button
                        className={s.photoRemove}
                        onClick={() => handleRemovePhoto('photosAfter', i)}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {sh.status === 'accepted' && (
        <button className={s.doneBtn} onClick={handleMarkDone}>
          ЗАТОЧИТЬ
        </button>
      )}

      {client && (
        <Link to={`/clients/${client.id}`} className={s.clientLink}>
          <span className={s.clientLinkIcon}><IconPerson /></span>
          <span>{client.name}</span>
          <span className={s.clientLinkArrow}><IconChevronRight /></span>
        </Link>
      )}

      <button
        className={s.repeatBtn}
        onClick={() => navigate('/sharpenings/new', { state: { repeat: sh } })}
      >
        Повторить заточку
      </button>

      <button className={s.deleteBtn} onClick={() => setConfirmOpen(true)}>
        Удалить заточку
      </button>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Удалить эту заточку?"
        message="Запись будет удалена безвозвратно."
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {photoPickerOpen && (
        <PhotoSourceSheet
          onCamera={() => addAfterPhoto(openCamera)}
          onGallery={() => addAfterPhoto(openGallery)}
          onClose={() => setPhotoPickerOpen(false)}
        />
      )}

      {photoModal && (
        <div className={s.photoModalOverlay} onClick={() => setPhotoModal(false)}>
          <div className={s.photoModalSheet} onClick={e => e.stopPropagation()}>
            <div className={s.photoModalTitle}>Добавить фото результата?</div>
            {sh.photosAfter && sh.photosAfter.length > 0 && (
              <div className={s.photoScroll} style={{ marginBottom: 12 }}>
                {sh.photosAfter.map((src, i) => (
                  <img key={i} src={src} className={s.photoImg} alt="" />
                ))}
              </div>
            )}
            <button className={s.photoModalAddBtn} onClick={() => setPhotoPickerOpen(true)}>
              Добавить фото
            </button>
            <button className={s.photoModalSkipBtn} onClick={() => setPhotoModal(false)}>
              {sh.photosAfter && sh.photosAfter.length > 0 ? 'Готово' : 'Пропустить'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
