import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/instance'
import Avatar from '../../components/Avatar/Avatar'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import PhotoSourceSheet from '../../components/PhotoSourceSheet/PhotoSourceSheet'
import { pickAvatarFile } from '../../hooks/useCamera'
import { softDeleteClient } from '../../utils/trash'
import { uuid } from '../../utils/uuid'
import { track } from '../../services/analytics'
import { useT } from '../../i18n'
import s from './ClientForm.module.css'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

export default function ClientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [avatar, setAvatar] = useState<string | undefined>(undefined)
  const [isSelf, setIsSelf] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    db.clients.get(Number(id)).then(client => {
      if (!client || client.deletedAt) { navigate('/', { replace: true }); return }
      setName(client.name)
      setPhone(client.phone ?? '')
      setTelegram(client.telegram ?? '')
      setAvatar(client.avatar)
      setIsSelf(client.isSelf)
      setLoading(false)
    })
  }, [id, navigate])

  function normalizeTelegram(value: string): string | undefined {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
  }

  async function handleSave() {
    if (!name.trim()) return
    if (isEdit) {
      await db.clients.update(Number(id), {
        name: name.trim(),
        phone: phone.trim() || undefined,
        telegram: normalizeTelegram(telegram),
        avatar,
        updatedAt: new Date(),
      })
      navigate(-1)
    } else {
      const now = new Date()
      const newId = await db.clients.add({
        guid: uuid(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        telegram: normalizeTelegram(telegram),
        avatar,
        isSelf: false,
        createdAt: now,
        updatedAt: now,
      })
      track('client_created', { hasPhone: !!phone.trim(), hasAvatar: !!avatar }).catch(() => {})
      navigate(`/clients/${newId}`, { replace: true })
    }
  }

  async function handleDelete() {
    if (!id) return
    await softDeleteClient(db, Number(id))
    navigate('/')
  }

  if (loading) return null

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{isEdit ? t.clients.editTitle : t.clients.newTitle}</span>
      </div>

      <div className={s.avatarSection}>
        <button className={s.avatarBtn} onClick={() => setAvatarSheetOpen(true)}>
          <Avatar name={name || '?'} size={72} photo={avatar} />
          <span className={s.avatarHint}>{avatar ? t.clients.changePhoto : t.clients.addPhoto}</span>
        </button>
        {avatar && (
          <button className={s.avatarRemoveBtn} onClick={() => setAvatar(undefined)}>
            {t.clients.removePhoto}
          </button>
        )}
      </div>

      <div className={s.form}>
        <div className={`${s.field} ${s.fieldRequired}`}>
          <label className={s.label}>{t.clients.nameLabel} <span className={s.req}>*</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t.clients.namePlaceholder}
            autoFocus
            required
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>{t.clients.phoneLabel}</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder={t.clients.phonePlaceholder}
            type="tel"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>{t.clients.telegramLabel}</label>
          <input
            value={telegram}
            onChange={e => setTelegram(e.target.value)}
            placeholder={t.clients.telegramPlaceholder}
          />
        </div>
      </div>

      <div className={s.actions}>
        <button className={s.saveBtn} onClick={handleSave} disabled={!name.trim()}>
          {isEdit ? t.common.save : t.clients.addClientBtn}
        </button>
        {isEdit && !isSelf && (
          <button className={s.deleteBtn} onClick={() => setConfirmOpen(true)}>
            {t.clients.deleteClient}
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title={t.clients.deleteTitle(name)}
        message={t.clients.deleteMessage}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      {avatarSheetOpen && (
        <PhotoSourceSheet
          onCamera={() => pickAvatarFile(true, setAvatar)}
          onGallery={() => pickAvatarFile(false, setAvatar)}
          onClose={() => setAvatarSheetOpen(false)}
        />
      )}
    </div>
  )
}
