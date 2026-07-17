import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import QRCode from 'qrcode'
import { db, type Client } from '../../db/instance'
import { downloadBlob } from '../../utils/backup'
import { buildVCard } from '../../utils/vcard'
import { shareFilesNative } from '../../utils/nativeShare'
import { uuid } from '../../utils/uuid'
import { track } from '../../services/analytics'
import { useToast } from '../../components/Toast/ToastContext'
import Avatar from '../../components/Avatar/Avatar'
import PhotoSourceSheet from '../../components/PhotoSourceSheet/PhotoSourceSheet'
import { pickAvatarFile } from '../../hooks/useCamera'
import { useT } from '../../i18n'
import s from './BusinessCardScreen.module.css'

// В APK navigator.share файлов нет — шарим нативно (см. nativeShare.ts).
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

// На десктопе navigator.share с файлами реализован ненадёжно: в зависимости от
// системы диалог может быть пустым или промис вовсе не разрешается (кнопка
// «Поделиться» зависает навсегда без какой-либо обратной связи). На телефонах/
// планшетах, где это и нужно чаще всего, API работает предсказуемо — поэтому
// пробуем его только там, а на десктопе сразу отдаём файл на скачивание.
const IS_LIKELY_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface CardLabels {
  phonePrefix: string
  telegramPrefix: string
  watermark: string
}

const CARD_W = 1050
const CARD_H = 600

async function renderBusinessCard(canvas: HTMLCanvasElement, client: Client, labels: CardLabels): Promise<void> {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')!

  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bg.addColorStop(0, '#1E1E24')
  bg.addColorStop(1, '#0F0F11')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  const glow = ctx.createRadialGradient(CARD_W, 0, 0, CARD_W, 0, 460)
  glow.addColorStop(0, 'rgba(74,144,217,0.22)')
  glow.addColorStop(1, 'rgba(74,144,217,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  const padX = 60
  const avatarSize = 140
  const avatarX = padX
  const avatarY = 60
  const avatarCx = avatarX + avatarSize / 2
  const avatarCy = avatarY + avatarSize / 2

  if (client.avatar) {
    const img = await loadImage(client.avatar)
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize)
    ctx.restore()
  } else {
    ctx.fillStyle = '#1E3A5F'
    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6AAAE8'
    ctx.font = '700 52px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(getInitials(client.name), avatarCx, avatarCy + 4)
  }
  ctx.strokeStyle = '#4A90D9'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2)
  ctx.stroke()

  const textX = avatarX + avatarSize + 40
  const textMaxW = CARD_W - textX - padX
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  let y = avatarY + 55
  ctx.fillStyle = '#F2F2F5'
  ctx.font = '700 46px system-ui, sans-serif'
  ctx.fillText(client.name || ' ', textX, y, textMaxW)

  if (client.specialization) {
    y += 40
    ctx.fillStyle = '#B8B8C8'
    ctx.font = '400 24px system-ui, sans-serif'
    ctx.fillText(client.specialization, textX, y, textMaxW)
  }
  if (client.company) {
    y += 32
    ctx.fillStyle = '#72728A'
    ctx.font = '600 18px system-ui, sans-serif'
    ctx.fillText(client.company.toUpperCase(), textX, y, textMaxW)
  }

  const dividerY = avatarY + avatarSize + 35
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padX, dividerY)
  ctx.lineTo(CARD_W - padX, dividerY)
  ctx.stroke()

  const qrSize = 168
  const qrBoxPad = 14
  const qrBoxSize = qrSize + qrBoxPad * 2
  const qrBoxX = CARD_W - padX - qrBoxSize
  const qrBoxY = CARD_H - 40 - qrBoxSize
  const leftColMaxW = qrBoxX - padX - 24

  const services = (client.services ?? '').split('\n').map(line => line.trim()).filter(Boolean).slice(0, 5)
  let sy = dividerY + 42
  ctx.font = '400 21px system-ui, sans-serif'
  for (const line of services) {
    ctx.fillStyle = '#B8B8C8'
    ctx.fillText('•', padX, sy)
    ctx.fillText(line, padX + 20, sy, leftColMaxW - 20)
    sy += 32
  }

  const contactParts: string[] = []
  if (client.phone) contactParts.push(`${labels.phonePrefix} ${client.phone}`)
  if (client.telegram) contactParts.push(`${labels.telegramPrefix} ${client.telegram}`)
  let cy = CARD_H - 70 - Math.max(0, contactParts.length - 1) * 32
  ctx.font = '600 24px system-ui, sans-serif'
  ctx.fillStyle = '#F2F2F5'
  for (const part of contactParts) {
    ctx.fillText(part, padX, cy, leftColMaxW)
    cy += 32
  }

  ctx.font = '300 16px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.fillText(labels.watermark, padX, CARD_H - 24)

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 14)
  ctx.fill()

  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, buildVCard(client), {
    width: qrSize,
    margin: 0,
    color: { dark: '#0F0F11', light: '#FFFFFF' },
  })
  ctx.drawImage(qrCanvas, qrBoxX + qrBoxPad, qrBoxY + qrBoxPad, qrSize, qrSize)
}

function normalizeTelegram(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

function buildUpdatePayload(c: Client, selfLabel: string) {
  return {
    name: c.name.trim() || selfLabel,
    avatar: c.avatar,
    phone: c.phone?.trim() || undefined,
    telegram: c.telegram ? normalizeTelegram(c.telegram) : undefined,
    company: c.company?.trim() || undefined,
    specialization: c.specialization?.trim() || undefined,
    services: c.services?.trim() || undefined,
    updatedAt: new Date(),
  }
}

export default function BusinessCardScreen() {
  const navigate = useNavigate()
  const t = useT()
  const { showToast } = useToast()

  // useLiveQuery, а не разовый fetch: на «холодном» прямом заходе на этот роут
  // (например, по закладке) self-клиент может ещё не успеть создаться сидом
  // (main.tsx, seedDatabase() асинхронно). Разовый промис поймал бы undefined
  // и больше никогда не перепроверил бы — экран остался бы пустым навсегда.
  const selfClient = useLiveQuery(() => db.clients.filter(c => c.isSelf).first(), [])
  const [client, setClient] = useState<Client | null>(null)
  const hydrated = useRef(false)
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Подхватываем self-клиента в локальное состояние ровно один раз — дальше
  // поля редактируются локально, не перезатираясь повторными эмиссиями live query.
  useEffect(() => {
    if (!hydrated.current && selfClient) {
      setClient(selfClient)
      hydrated.current = true
    }
  }, [selfClient])

  useEffect(() => {
    if (!client || !canvasRef.current) return
    renderBusinessCard(canvasRef.current, client, {
      phonePrefix: t.businessCard.phonePrefix,
      telegramPrefix: t.businessCard.telegramPrefix,
      watermark: 'AppTochite',
    }).catch(() => {})
  }, [client, t.businessCard.phonePrefix, t.businessCard.telegramPrefix])

  function updateField<K extends keyof Client>(key: K, value: Client[K]) {
    setClient(c => c && { ...c, [key]: value })
  }

  async function handleSave() {
    if (!client?.id) return
    await db.clients.update(client.id, buildUpdatePayload(client, t.clients.selfName))
    showToast(t.businessCard.saved)
  }

  async function handleShare() {
    if (!client?.id || !canvasRef.current) return
    setSharing(true)
    try {
      await db.clients.update(client.id, buildUpdatePayload(client, t.clients.selfName))
      const blob = await new Promise<Blob>(res =>
        canvasRef.current!.toBlob(b => res(b!), 'image/png')
      )
      const file = new File([blob], 'business-card.png', { type: 'image/png' })

      if (IS_CAPACITOR) {
        await shareFilesNative([file])
        track('business_card_shared', { method: 'share' }).catch(() => {})
      } else if (IS_LIKELY_MOBILE && navigator.share && navigator.canShare?.({ files: [file] })) {
        // Уникальное имя на каждый вызов — иначе повторный шаринг может показать
        // получателю старое содержимое по тому же content:// URI (см. nativeShare.ts).
        const webShareFile = new File([blob], `business-card-${uuid()}.png`, { type: 'image/png' })
        await navigator.share({ files: [webShareFile] })
        track('business_card_shared', { method: 'share' }).catch(() => {})
      } else {
        downloadBlob(blob, 'business-card.png')
        track('business_card_shared', { method: 'download' }).catch(() => {})
      }
    } catch {
      // отменено пользователем
    } finally {
      setSharing(false)
    }
  }

  if (!client) return null

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{t.businessCard.title}</span>
      </div>

      <div className={s.preview}>
        <canvas ref={canvasRef} className={s.canvas} />
      </div>
      <p className={s.qrHint}>{t.businessCard.qrHint}</p>

      <div className={s.avatarSection}>
        <button className={s.avatarBtn} onClick={() => setAvatarSheetOpen(true)}>
          <Avatar name={client.name || '?'} size={72} photo={client.avatar} />
          <span className={s.avatarHint}>{client.avatar ? t.businessCard.changePhoto : t.businessCard.addPhoto}</span>
        </button>
        {client.avatar && (
          <button className={s.avatarRemoveBtn} onClick={() => updateField('avatar', undefined)}>
            {t.businessCard.removePhoto}
          </button>
        )}
      </div>

      <div className={s.form}>
        <div className={s.field}>
          <label className={s.label}>{t.businessCard.nameLabel}</label>
          <input
            value={client.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder={t.businessCard.namePlaceholder}
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>{t.businessCard.companyLabel}</label>
          <input
            value={client.company ?? ''}
            onChange={e => updateField('company', e.target.value)}
            placeholder={t.businessCard.companyPlaceholder}
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>{t.businessCard.specializationLabel}</label>
          <input
            value={client.specialization ?? ''}
            onChange={e => updateField('specialization', e.target.value)}
            placeholder={t.businessCard.specializationPlaceholder}
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>{t.businessCard.servicesLabel}</label>
          <textarea
            rows={4}
            value={client.services ?? ''}
            onChange={e => updateField('services', e.target.value)}
            placeholder={t.businessCard.servicesPlaceholder}
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>{t.businessCard.phoneLabel}</label>
          <input
            value={client.phone ?? ''}
            onChange={e => updateField('phone', e.target.value)}
            placeholder={t.businessCard.phonePlaceholder}
            type="tel"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>{t.businessCard.telegramLabel}</label>
          <input
            value={client.telegram ?? ''}
            onChange={e => updateField('telegram', e.target.value)}
            placeholder={t.businessCard.telegramPlaceholder}
          />
        </div>
      </div>

      <div className={s.actions}>
        <button className={s.shareBtn} onClick={handleShare} disabled={sharing}>
          {sharing ? t.businessCard.sharing : t.businessCard.share}
        </button>
        <button className={s.saveBtn} onClick={handleSave}>{t.businessCard.save}</button>
      </div>

      {avatarSheetOpen && (
        <PhotoSourceSheet
          onCamera={() => pickAvatarFile(true, b64 => updateField('avatar', b64))}
          onGallery={() => pickAvatarFile(false, b64 => updateField('avatar', b64))}
          onClose={() => setAvatarSheetOpen(false)}
        />
      )}
    </div>
  )
}
