import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStatus, type SharpeningStone } from '../../db/db'
import { useToast } from '../../components/Toast/ToastContext'
import { useCamera } from '../../hooks/useCamera'
import s from './SharpeningForm.module.css'

const CONDITIONS = ['тупой', 'выщерблины', 'повреждение РК', 'деформация', 'ржавчина']
const STONE_TYPE_LABELS: Record<string, string> = { water: 'Водные', oil: 'Масляные', diamond: 'Алмазные' }

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

  // Step 1 — Приёмка
  const [clientId, setClientId] = useState<number | null>(prefilledClientId)
  const [knifeBrand, setKnifeBrand] = useState('')
  const [knifeType, setKnifeType] = useState('')
  const [steel, setSteel] = useState('')
  const [hrc, setHrc] = useState('')
  const [condition, setCondition] = useState<string[]>([])
  const [receivedAt, setReceivedAt] = useState(todayStr())
  const [photosBefore, setPhotosBefore] = useState<string[]>([])

  // Step 2 — Заточка
  const [angle, setAngle] = useState('')
  const [selectedStones, setSelectedStones] = useState<SharpeningStone[]>([])
  const [showStonePicker, setShowStonePicker] = useState(false)
  const [comment, setComment] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<SharpeningStatus>('accepted')
  const [photosAfter, setPhotosAfter] = useState<string[]>([])

  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  const allStones = useLiveQuery(() => db.stones.orderBy('grit').toArray(), [])

  useEffect(() => {
    if (!id) return
    db.sharpenings.get(Number(id)).then(sh => {
      if (!sh) return
      setClientId(sh.clientId)
      setKnifeBrand(sh.knifeBrand)
      setKnifeType(sh.knifeType ?? '')
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
      setPhotosAfter(sh.photosAfter ?? [])
    })
  }, [id])

  const sortedClients = clients
    ? [...clients.filter(c => c.isSelf), ...clients.filter(c => !c.isSelf)]
    : []

  const stonesByType = allStones?.reduce<Record<string, typeof allStones>>((acc, stone) => {
    const group = acc[stone.type] ?? []
    return { ...acc, [stone.type]: [...group, stone] }
  }, {}) ?? {}

  function toggleCondition(val: string) {
    setCondition(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    )
  }

  function addStone(stoneId: number) {
    if (selectedStones.find(s => s.stoneId === stoneId)) return
    setSelectedStones(prev => [...prev, { stoneId, order: prev.length + 1 }])
  }

  function removeStone(stoneId: number) {
    setSelectedStones(prev =>
      prev.filter(s => s.stoneId !== stoneId).map((s, i) => ({ ...s, order: i + 1 }))
    )
  }

  function getStoneLabel(stoneId: number) {
    const stone = allStones?.find(s => s.id === stoneId)
    return stone ? `${stone.brand} ${stone.grit}` : `Камень ${stoneId}`
  }

  async function handleSave() {
    if (!clientId || !knifeBrand.trim()) return

    const data = {
      clientId,
      knifeBrand: knifeBrand.trim(),
      knifeType: knifeType.trim() || undefined,
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
      doneAt: status === 'done' ? new Date() : undefined,
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
            <div className={s.field}>
              <label className={s.label}>Клиент *</label>
              <select
                className={s.select}
                value={clientId ?? ''}
                onChange={e => setClientId(Number(e.target.value))}
              >
                <option value="">Выбрать клиента</option>
                {sortedClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={s.field}>
            <label className={s.label}>Нож / Бренд *</label>
            <input
              value={knifeBrand}
              onChange={e => setKnifeBrand(e.target.value)}
              placeholder="Mora, Victorinox, самодел..."
              autoFocus={!prefilledClientId}
            />
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>Тип ножа</label>
              <input
                value={knifeType}
                onChange={e => setKnifeType(e.target.value)}
                placeholder="кухонный, охотничий..."
              />
            </div>
            <div className={s.field}>
              <label className={s.label}>Сталь</label>
              <input
                value={steel}
                onChange={e => setSteel(e.target.value)}
                placeholder="AUS-8, D2..."
              />
            </div>
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
                    <img src={src} alt="" />
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
                {selectedStones.map(ss => (
                  <div key={ss.stoneId} className={s.stoneTag}>
                    <span className={s.stoneOrder}>{ss.order}.</span>
                    <span>{getStoneLabel(ss.stoneId)}</span>
                    <button className={s.stoneRemove} onClick={() => removeStone(ss.stoneId)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button
              className={s.stonePickerToggle}
              onClick={() => setShowStonePicker(v => !v)}
            >
              <span className={s.stonePickerIcon}>+</span>
              Добавить камень
            </button>
            {showStonePicker && (
              <div className={s.stonePicker}>
                {Object.keys(stonesByType).length === 0 && (
                  <div style={{ padding: '12px 16px', color: 'var(--text-300)', fontSize: 14 }}>
                    Справочник камней пуст — добавьте камни в разделе «Справочник»
                  </div>
                )}
                {Object.entries(stonesByType).map(([type, stones]) => (
                  <div key={type} className={s.stoneGroup}>
                    <div className={s.stoneGroupTitle}>{STONE_TYPE_LABELS[type] ?? type}</div>
                    {stones.map(stone => (
                      <div
                        key={stone.id}
                        className={s.stoneOption}
                        onClick={() => { addStone(stone.id!); setShowStonePicker(false) }}
                      >
                        <span className={s.stoneOptionName}>{stone.brand}</span>
                        <span className={s.stoneOptionGrit}>{stone.grit} grit</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
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
              {(['accepted', 'inwork', 'done'] as SharpeningStatus[]).map(st => {
                const labels = { accepted: 'принят', inwork: 'в работе', done: 'готов' }
                const activeClass = { accepted: s.activeAccepted, inwork: s.activeInwork, done: s.activeDone }
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
                      <img src={src} alt="" />
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
    </div>
  )
}
