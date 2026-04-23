import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStatus, type SharpeningStone } from '../../db/db'
import { useToast } from '../../components/Toast/ToastContext'
import { useCamera } from '../../hooks/useCamera'
import Autocomplete from '../../components/Autocomplete/Autocomplete'
import PhotoLightbox from '../../components/PhotoLightbox/PhotoLightbox'
import s from './SharpeningForm.module.css'

const CONDITIONS = ['тупой', 'выщерблины', 'повреждение РК', 'деформация', 'ржавчина']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function SharpeningForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { takePhoto } = useCamera()
  const isEdit = Boolean(id)

  const prefilledClientId = searchParams.get('clientId')
    ? Number(searchParams.get('clientId'))
    : null

  const [step, setStep] = useState(1)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  // Step 1 — Приёмка
  const [clientId, setClientId] = useState<number | null>(prefilledClientId)
  const [knifeBrand, setKnifeBrand] = useState('')
  const [steel, setSteel] = useState('')
  const [hrc, setHrc] = useState('')
  const [condition, setCondition] = useState<string[]>([])
  const [receivedAt, setReceivedAt] = useState(todayStr())
  const [photosBefore, setPhotosBefore] = useState<string[]>([])

  // Step 2 — Заточка
  const [angle, setAngle] = useState('')
  const [selectedStones, setSelectedStones] = useState<SharpeningStone[]>([])
  const [stoneInput, setStoneInput] = useState('')
  const [comment, setComment] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<SharpeningStatus>('accepted')
  const [doneAt, setDoneAt] = useState<Date | undefined>(undefined)
  const [photosAfter, setPhotosAfter] = useState<string[]>([])

  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  const stoneSuggestions = useLiveQuery(async () => {
    const items = await db.stones.orderBy('grit').toArray()
    return items.map(s => `${s.brand} ${s.grit}`)
  }, []) ?? []
  const knifeSuggestions = useLiveQuery(async () => {
    const items = await db.knives.orderBy('brand').toArray()
    return [...new Set(items.map(k => k.brand))]
  }, []) ?? []
  const steelSuggestions = useLiveQuery(async () => {
    const items = await db.steels.orderBy('name').toArray()
    return [...new Set(items.map(st => st.name))]
  }, []) ?? []

  useEffect(() => {
    if (!id) return
    db.sharpenings.get(Number(id)).then(sh => {
      if (!sh) return
      setClientId(sh.clientId)
      setKnifeBrand(sh.knifeBrand)
      setSteel(sh.steel ?? '')
      setHrc(sh.hrc != null ? String(sh.hrc) : '')
      setCondition(sh.condition ?? [])
      setReceivedAt(new Date(sh.receivedAt).toISOString().slice(0, 10))
      setPhotosBefore(sh.photosBefore ?? [])
      setAngle(sh.angle != null ? String(sh.angle) : '')
      setSelectedStones(sh.stones ?? [])
      setComment(sh.comment ?? '')
      setPrice(sh.price != null ? String(sh.price) : '')
      setStatus(sh.status)
      setDoneAt(sh.doneAt)
      setPhotosAfter(sh.photosAfter ?? [])
    })
  }, [id])

  const sortedClients = clients
    ? [...clients.filter(c => c.isSelf), ...clients.filter(c => !c.isSelf)]
    : []

  function toggleCondition(val: string) {
    setCondition(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    )
  }

  function addStone(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (selectedStones.find(s => s.name.toLowerCase() === trimmed.toLowerCase())) return
    setSelectedStones(prev => [...prev, { name: trimmed, order: prev.length + 1 }])
    setStoneInput('')
  }

  function removeStone(index: number) {
    setSelectedStones(prev =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    )
  }

  async function handleSave() {
    if (!clientId || !knifeBrand.trim()) return

    const knifeInRef = knifeSuggestions.some(k => k.toLowerCase() === knifeBrand.trim().toLowerCase())
    if (!knifeInRef) {
      await db.knives.add({ brand: knifeBrand.trim(), isCustom: true })
    }

    if (steel.trim()) {
      const steelInRef = steelSuggestions.some(s => s.toLowerCase() === steel.trim().toLowerCase())
      if (!steelInRef) {
        await db.steels.add({ name: steel.trim(), isCustom: true })
      }
    }

    if (selectedStones.length) {
      const existingStones = await db.stones.toArray()
      const existingKeys = new Set(existingStones.map(s => `${s.brand.toLowerCase()} ${s.grit}`))
      for (const stone of selectedStones) {
        const parts = stone.name.split(' ')
        const lastPart = parts[parts.length - 1]
        const parsedGrit = parseInt(lastPart, 10)
        const hasGrit = !isNaN(parsedGrit) && String(parsedGrit) === lastPart
        const brand = hasGrit ? parts.slice(0, -1).join(' ') || stone.name : stone.name
        const grit = hasGrit ? parsedGrit : 0
        const key = `${brand.toLowerCase()} ${grit}`
        if (!existingKeys.has(key)) {
          await db.stones.add({ brand, grit, type: 'ao', isCustom: true })
          existingKeys.add(key)
        }
      }
    }

    const data = {
      clientId,
      knifeBrand: knifeBrand.trim(),
      steel: steel.trim() || undefined,
      hrc: hrc ? Number(hrc) : undefined,
      condition: condition.length ? condition : undefined,
      receivedAt: new Date(receivedAt),
      photosBefore: photosBefore.length ? photosBefore : undefined,
      angle: angle ? Number(angle) : undefined,
      stones: selectedStones.length ? selectedStones : undefined,
      comment: comment.trim() || undefined,
      price: price ? Number(price) : undefined,
      status,
      doneAt: status === 'done' ? (doneAt ?? new Date()) : undefined,
      photosAfter: photosAfter.length ? photosAfter : undefined,
    }

    if (isEdit) {
      await db.sharpenings.update(Number(id), data)
      showToast('Заточка сохранена')
      navigate(`/sharpenings/${id}`)
    } else {
      const newId = await db.sharpenings.add(data)
      showToast('Заточка создана')
      navigate(`/sharpenings/${newId}`)
    }
  }

  const canProceed = Boolean(clientId && knifeBrand.trim())

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => step === 2 ? setStep(1) : navigate(-1)}>‹</button>
        <span className={s.title}>{isEdit ? 'РЕДАКТИРОВАТЬ' : 'НОВАЯ ЗАТОЧКА'}</span>
      </div>

      {/* Stepper */}
      <div className={s.stepper}>
        <div className={s.stepItem}>
          <div className={`${s.stepDot} ${step >= 1 ? (step > 1 ? s.done : s.active) : ''}`}>
            {step > 1 ? '✓' : '1'}
          </div>
          <span className={`${s.stepLabel} ${step === 1 ? s.active : ''}`}>Приёмка</span>
        </div>
        <div className={s.stepLine} />
        <div className={s.stepItem}>
          <div className={`${s.stepDot} ${step === 2 ? s.active : ''}`}>2</div>
          <span className={`${s.stepLabel} ${step === 2 ? s.active : ''}`}>Заточка</span>
        </div>
      </div>

      {/* ── Step 1 — Приёмка ── */}
      {step === 1 && (
        <div className={s.form}>
          {!prefilledClientId && (
            <div className={`${s.field} ${s.fieldRequired}`}>
              <label className={s.label}>Клиент <span className={s.req}>*</span></label>
              <select
                className={s.select}
                value={clientId ?? ''}
                onChange={e => setClientId(Number(e.target.value))}
                required
              >
                <option value="">Выбрать клиента</option>
                {sortedClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={`${s.field} ${s.fieldRequired}`}>
            <label className={s.label}>Нож / Бренд <span className={s.req}>*</span></label>
            <Autocomplete
              value={knifeBrand}
              onChange={setKnifeBrand}
              suggestions={knifeSuggestions}
              placeholder="Mora, Victorinox, самодел..."
              autoFocus={!prefilledClientId}
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Сталь</label>
            <Autocomplete
              value={steel}
              onChange={setSteel}
              suggestions={steelSuggestions}
              placeholder="AUS-8, D2..."
            />
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>HRC</label>
              <input
                value={hrc}
                onChange={e => setHrc(e.target.value)}
                placeholder="58"
                type="number"
                min={0}
                max={70}
              />
            </div>
            <div className={s.field}>
              <label className={s.label}>Дата приёмки</label>
              <input
                value={receivedAt}
                onChange={e => setReceivedAt(e.target.value)}
                type="date"
              />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Состояние</label>
            <div className={s.chips}>
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  className={`${s.chip} ${condition.includes(c) ? s.selected : ''}`}
                  onClick={() => toggleCondition(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Фото «До» */}
          <div className={s.photoSection}>
            <span className={s.photoTitle}>Фото «До» (необязательно)</span>
            {photosBefore.length > 0 && (
              <div className={s.photoThumbs}>
                {photosBefore.map((src, i) => (
                  <div key={i} className={s.photoThumb}>
                    <img
                      src={src}
                      alt=""
                      onClick={() => setLightbox({ photos: photosBefore, index: i })}
                    />
                    <button
                      className={s.photoRemove}
                      onClick={() => setPhotosBefore(prev => prev.filter((_, j) => j !== i))}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <button
              className={s.photoAddBtn}
              onClick={() => takePhoto(b64 => setPhotosBefore(prev => [...prev, b64]))}
            >
              <span className={s.photoAddIcon}>📷</span>
              Сфотографировать
            </button>
          </div>

          <div className={s.actions}>
            <button
              className={s.primaryBtn}
              onClick={() => setStep(2)}
              disabled={!canProceed}
            >
              Далее — Заточка
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 — Заточка ── */}
      {step === 2 && (
        <div className={s.form}>
          <div className={s.field}>
            <label className={s.label}>Угол заточки, °</label>
            <input
              value={angle}
              onChange={e => setAngle(e.target.value)}
              placeholder="15"
              type="number"
              min={1}
              max={45}
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Камни</label>
            {selectedStones.length > 0 && (
              <div className={s.stoneTags}>
                {selectedStones.map((ss, i) => (
                  <div key={i} className={s.stoneTag}>
                    <span className={s.stoneOrder}>{ss.order}.</span>
                    <span>{ss.name}</span>
                    <button className={s.stoneRemove} onClick={() => removeStone(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div className={s.stoneInputRow}>
              <Autocomplete
                value={stoneInput}
                onChange={setStoneInput}
                suggestions={stoneSuggestions}
                onSelect={addStone}
                placeholder="Naniwa 1000, Shapton 2000..."
              />
              <button
                className={s.stoneAddBtn}
                onClick={() => addStone(stoneInput)}
                disabled={!stoneInput.trim()}
              >+</button>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Комментарий</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Особенности, замечания..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>Цена, ₽</label>
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="500"
                type="number"
                min={0}
              />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Статус</label>
            <div className={s.statusChips}>
              {(['accepted', 'done'] as SharpeningStatus[]).map(st => {
                const labels = { accepted: 'принят', done: 'готов' }
                const activeClass = { accepted: s.activeAccepted, done: s.activeDone }
                return (
                  <button
                    key={st}
                    className={`${s.statusChip} ${s[st]} ${status === st ? activeClass[st] : ''}`}
                    onClick={() => setStatus(st)}
                  >
                    {labels[st]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Фото «После» — только когда статус «готов» */}
          {status === 'done' && (
            <div className={s.photoSection}>
              <span className={s.photoTitle}>Фото «После» (необязательно)</span>
              {photosAfter.length > 0 && (
                <div className={s.photoThumbs}>
                  {photosAfter.map((src, i) => (
                    <div key={i} className={s.photoThumb}>
                      <img
                        src={src}
                        alt=""
                        onClick={() => setLightbox({ photos: photosAfter, index: i })}
                      />
                      <button
                        className={s.photoRemove}
                        onClick={() => setPhotosAfter(prev => prev.filter((_, j) => j !== i))}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <button
                className={s.photoAddBtn}
                onClick={() => takePhoto(b64 => setPhotosAfter(prev => [...prev, b64]))}
              >
                <span className={s.photoAddIcon}>📷</span>
                Сфотографировать
              </button>
            </div>
          )}

          <div className={s.actions}>
            <button className={s.primaryBtn} onClick={handleSave}>
              {isEdit ? 'Сохранить' : 'Создать заточку'}
            </button>
            <button className={s.secondaryBtn} onClick={() => setStep(1)}>
              ← Назад к приёмке
            </button>
          </div>
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
