import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/instance'
import Avatar from '../../components/Avatar/Avatar'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import PhotoSourceSheet from '../../components/PhotoSourceSheet/PhotoSourceSheet'
import { pickAvatarFile } from '../../hooks/useCamera'
import s from './ClientForm.module.css'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

export default function ClientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
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
      if (!client) return
      setName(client.name)
      setPhone(client.phone ?? '')
      setTelegram(client.telegram ?? '')
      setAvatar(client.avatar)
      setIsSelf(client.isSelf)
      setLoading(false)
    })
  }, [id])

  function normalizeTelegram(value: string): string | undefined {
    const t = value.trim()
    if (!t) return undefined
    return t.startsWith('@') ? t : `@${t}`
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
      navigate(`/clients/${id}`)
    } else {
      const now = new Date()
      const newId = await db.clients.add({
        name: name.trim(),
        phone: phone.trim() || undefined,
        telegram: normalizeTelegram(telegram),
        avatar,
        isSelf: false,
        createdAt: now,
        updatedAt: now,
      })
      navigate(`/clients/${newId}`)
    }
  }

  async function handleDelete() {
    if (!id) return
    await db.transaction('rw', [db.sharpenings, db.clients], async () => {
      await db.sharpenings.where('clientId').equals(Number(id)).delete()
      await db.clients.delete(Number(id))
    })
    navigate('/')
  }

  if (loading) return null

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{isEdit ? 'РЕДАКТИРОВАТЬ' : 'НОВЫЙ КЛИЕНТ'}</span>
      </div>

      <div className={s.avatarSection}>
        <button className={s.avatarBtn} onClick={() => setAvatarSheetOpen(true)}>
          <Avatar name={name || '?'} size={72} photo={avatar} />
          <span className={s.avatarHint}>{avatar ? 'Изменить фото' : 'Добавить фото'}</span>
        </button>
        {avatar && (
          <button className={s.avatarRemoveBtn} onClick={() => setAvatar(undefined)}>
            Убрать фото
          </button>
        )}
      </div>

      <div className={s.form}>
        <div className={`${s.field} ${s.fieldRequired}`}>
          <label className={s.label}>Имя <span className={s.req}>*</span></label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Иван Петров"
            autoFocus
            required
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Телефон</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+7 900 000-00-00"
            type="tel"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Telegram</label>
          <input
            value={telegram}
            onChange={e => setTelegram(e.target.value)}
            placeholder="@username"
          />
        </div>
      </div>

      <div className={s.actions}>
        <button className={s.saveBtn} onClick={handleSave} disabled={!name.trim()}>
          {isEdit ? 'Сохранить' : 'Добавить клиента'}
        </button>
        {isEdit && !isSelf && (
          <button className={s.deleteBtn} onClick={() => setConfirmOpen(true)}>
            Удалить клиента
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title={`Удалить клиента «${name}»?`}
        message="Все его заточки также будут удалены. Это действие необратимо."
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
