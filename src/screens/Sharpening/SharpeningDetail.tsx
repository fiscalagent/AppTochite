import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import StatusPill from '../../components/StatusPill/StatusPill'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import { useToast } from '../../components/Toast/ToastContext'
import s from './SharpeningDetail.module.css'

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

  const sh = useLiveQuery(() => db.sharpenings.get(sharpeningId), [sharpeningId])
  const client = useLiveQuery(
    () => sh ? db.clients.get(sh.clientId) : undefined,
    [sh?.clientId]
  )
  const stones = useLiveQuery(() => db.stones.toArray(), [])

  async function handleDelete() {
    await db.sharpenings.delete(sharpeningId)
    showToast('Заточка удалена')
    navigate(-1)
  }

  if (sh === undefined) return null
  if (sh === null) return (
    <div style={{ padding: 16, color: 'var(--text-300)' }}>Запись не найдена</div>
  )

  function getStoneName(stoneId: number) {
    const stone = stones?.find(s => s.id === stoneId)
    return stone ? `${stone.brand} ${stone.grit}` : `Камень ${stoneId}`
  }

  const sortedStones = sh.stones ? [...sh.stones].sort((a, b) => a.order - b.order) : []

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => navigate(-1)}>‹</button>
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
                  <div key={ss.stoneId} className={s.stoneTag}>
                    <span className={s.stoneOrder}>{ss.order}.</span>
                    <span>{getStoneName(ss.stoneId)}</span>
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
                {sh.photosBefore.map((src, i) => (
                  <img key={i} src={src} className={s.photoImg} alt="" />
                ))}
              </div>
            </div>
          )}
          {sh.photosAfter && sh.photosAfter.length > 0 && (
            <div className={s.photoSection}>
              <div className={s.photoSectionTitle}>Фото «После»</div>
              <div className={s.photoScroll}>
                {sh.photosAfter.map((src, i) => (
                  <img key={i} src={src} className={s.photoImg} alt="" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {client && (
        <Link to={`/clients/${client.id}`} className={s.clientLink}>
          <span>👤</span>
          <span>{client.name}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.5 }}>›</span>
        </Link>
      )}

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
    </div>
  )
}
