import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStatus, type SharpeningStone, type Stone, type GritUnit, MK_VALUES, stoneDisplayName, compareStonesForSort } from '../../db/instance'
import { getAltGrits } from '../../data/gritTable'
import { useToast } from '../../components/Toast/ToastContext'
import { useCamera } from '../../hooks/useCamera'
import Autocomplete from '../../components/Autocomplete/Autocomplete'
import PhotoLightbox from '../../components/PhotoLightbox/PhotoLightbox'
import PhotoSourceSheet from '../../components/PhotoSourceSheet/PhotoSourceSheet'
import { trackSharpening } from '../../services/analytics'
import { startBlur, stopBlur } from '../../utils/modalBlur'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import MicButton from '../../components/MicButton/MicButton'
import { isVoiceEnabled } from '../../config/features'
import s from './SharpeningForm.module.css'

const DONE_KEYWORDS = ['готово', 'готов', 'выполнено', 'сделано', 'закончил', 'завершено']

function extractNumber(text: string): string {
  const cleaned = text.replace(/[^\d,.]/g, '').replace(/,/g, '.')
  return cleaned || ''
}

const TRANSLIT: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
  'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
  'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
}

function transliterate(text: string): string {
  return text.toLowerCase().split('').map(c => TRANSLIT[c] ?? c).join('')
}

function normForMatch(text: string): string {
  return transliterate(text).replace(/[^a-z0-9]/g, '')
}

function bigramSim(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const bgs = (s: string) => {
    const set = new Set<string>()
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
    return set
  }
  const ba = bgs(a), bb = bgs(b)
  let hit = 0
  for (const bg of ba) if (bb.has(bg)) hit++
  return (2 * hit) / (ba.size + bb.size)
}

function voiceToSearchText(text: string): string {
  return transliterate(text.toLowerCase()).replace(/v/g, 'w')
}

function filterSuggestions(value: string, suggestions: string[]): string[] {
  if (!value) return []
  const lower = value.toLowerCase()
  return suggestions.filter(item => {
    const ilow = item.toLowerCase()
    return lower.split(/\s+/).filter(Boolean).every(tok => ilow.includes(tok))
  }).slice(0, 8)
}

const RU_NUM: Record<string, number> = {
  'один': 1, 'первый': 1, 'первая': 1, 'первое': 1,
  'два': 2, 'две': 2, 'второй': 2, 'второго': 2,
  'три': 3, 'третий': 3, 'третья': 3, 'третье': 3,
  'четыре': 4, 'четвёртый': 4, 'четвертый': 4,
  'пять': 5, 'пятый': 5, 'пятая': 5,
  'шесть': 6, 'шестой': 6, 'шестая': 6,
  'семь': 7, 'седьмой': 7, 'семи': 7,
  'восемь': 8, 'восьмой': 8, 'восьмая': 8,
  'девять': 9, 'девятый': 9, 'девяти': 9,
  'десять': 10, 'десятый': 10, 'десяти': 10,
}

function pickFromFiltered(text: string, items: string[]): string | null {
  const lower = text.toLowerCase()
  for (const [word, num] of Object.entries(RU_NUM)) {
    if (lower.includes(word)) {
      const byContent = items.find(it => it.includes(String(num)))
      if (byContent) return byContent
      if (num >= 1 && num <= items.length) return items[num - 1]
    }
  }
  const digitMatch = lower.match(/\b(\d+)\b/)
  if (digitMatch) {
    const num = Number(digitMatch[1])
    const byContent = items.find(it => it.includes(digitMatch[1]))
    if (byContent) return byContent
    if (num >= 1 && num <= items.length) return items[num - 1]
  }
  return findBestMatch(text, items)
}

function findBestMatch(voiceText: string, suggestions: string[]): string | null {
  const vLow = voiceText.toLowerCase()
  const vNorm = normForMatch(vLow)
  const gritMatch = vLow.match(/\b(\d{3,4})\b/)
  const voiceGrit = gritMatch?.[1]

  let best: { name: string; score: number } | null = null

  for (const s of suggestions) {
    const sLow = s.toLowerCase()
    const sNorm = normForMatch(sLow)
    let score = 0

    // Совпадение зернистости — сильный сигнал
    if (voiceGrit && sLow.includes(voiceGrit)) score += 40

    // Прямое вхождение (если движок распознал латиницу)
    if (sLow.includes(vLow) || vLow.includes(sLow)) score += 35

    // Сходство транслитерированных строк
    score += bigramSim(vNorm, sNorm) * 60

    // «в» нередко соответствует «w» — пробуем замену
    const vNormW = vNorm.replace(/v/g, 'w')
    if (vNormW !== vNorm) score += bigramSim(vNormW, sNorm) * 20

    if (!best || score > best.score) best = { name: s, score }
  }

  return best && best.score >= 28 ? best.name : null
}

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IconCamera = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const CONDITIONS = ['заточка', 'правка РК', 'ремонт']
const PHOTO_LIMIT = 5

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function parseStoneName(name: string): { brand: string; grit?: number; gritUnit?: GritUnit; gritMk?: string } {
  const mkMatch = name.match(/^(.*?)\s+(\d+\/\d+)мк$/)
  if (mkMatch) return { brand: mkMatch[1], gritUnit: 'mk', gritMk: mkMatch[2] }
  const fepaMatch = name.match(/^(.*?)\s+(\d+)\s+FEPA$/)
  if (fepaMatch) return { brand: fepaMatch[1], grit: Number(fepaMatch[2]), gritUnit: 'fepa' }
  const jisMatch = name.match(/^(.*?)\s+(\d+)\s+JIS$/)
  if (jisMatch) return { brand: jisMatch[1], grit: Number(jisMatch[2]), gritUnit: 'jis' }
  const numMatch = name.match(/^(.*?)\s+(\d+)$/)
  if (numMatch) return { brand: numMatch[1], grit: Number(numMatch[2]) }
  return { brand: name }
}

export default function SharpeningForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const { openCamera, openGallery } = useCamera()
  const isEdit = Boolean(id)

  const prefilledClientId = searchParams.get('clientId')
    ? Number(searchParams.get('clientId'))
    : null

  const repeat = !isEdit ? (location.state as { repeat?: { clientId: number; knifeBrand: string; steel?: string; hrc?: number; angle?: number; stones?: SharpeningStone[]; price?: number } } | null)?.repeat : undefined

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const [pickerFor, setPickerFor] = useState<'before' | 'after' | null>(null)

  // Step 1 — Приёмка
  const [clientId, setClientId] = useState<number | null>(repeat?.clientId ?? prefilledClientId)
  const [knifeBrand, setKnifeBrand] = useState(repeat?.knifeBrand ?? '')
  const [steel, setSteel] = useState(repeat?.steel ?? '')
  const [hrc, setHrc] = useState(repeat?.hrc != null ? String(repeat.hrc) : '')
  const [condition, setCondition] = useState<string[]>([])
  const [receivedAt, setReceivedAt] = useState(todayStr())
  const [photosBefore, setPhotosBefore] = useState<string[]>([])

  // Step 2 — Заточка
  const [angle, setAngle] = useState(repeat?.angle != null ? String(repeat.angle) : '')
  const [selectedStones, setSelectedStones] = useState<SharpeningStone[]>(repeat?.stones ?? [])
  const [stoneInput, setStoneInput] = useState('')
  const [comment, setComment] = useState('')
  const [price, setPrice] = useState(repeat?.price != null ? String(repeat.price) : '')
  const [status, setStatus] = useState<SharpeningStatus>('accepted')
  const [doneAt, setDoneAt] = useState<Date | undefined>(undefined)
  const [photosAfter, setPhotosAfter] = useState<string[]>([])

  const voice = useVoiceInput()
  const [listeningField, setListeningField] = useState<string | null>(null)
  const [voiceForceOpen, setVoiceForceOpen] = useState<string | null>(null)

  function toggleVoice(fieldName: string, onResult: (text: string) => void) {
    if (listeningField === fieldName) {
      voice.stop()
      setListeningField(null)
      return
    }
    voice.start((text) => {
      onResult(text)
      setListeningField(null)
    }, () => setListeningField(null))
    setListeningField(fieldName)
  }

  function micBtn(fieldName: string, onResult: (text: string) => void) {
    if (!isVoiceEnabled()) return undefined
    return (
      <MicButton
        isAvailable={voice.isAvailable}
        isListening={listeningField === fieldName}
        onToggle={() => {
          if (!voice.isAvailable) {
            showToast('Голосовой ввод недоступен офлайн')
            return
          }
          toggleVoice(fieldName, onResult)
        }}
      />
    )
  }

  function micBtnTwoPhase(
    fieldName: string,
    suggestions: string[],
    onSetSearchText: (text: string) => void,
    onSelectItem: (item: string) => void,
  ) {
    if (!isVoiceEnabled()) return undefined
    const isListening = listeningField === fieldName || listeningField === `${fieldName}_p2`
    return (
      <MicButton
        isAvailable={voice.isAvailable}
        isListening={isListening}
        onToggle={() => {
          if (!voice.isAvailable) {
            showToast('Голосовой ввод недоступен офлайн')
            return
          }
          if (isListening) {
            voice.stop()
            setListeningField(null)
            setVoiceForceOpen(null)
            return
          }
          let startedPhase2 = false
          voice.start(
            (text) => {
              const searchText = voiceToSearchText(text)
              onSetSearchText(searchText)
              const matches = filterSuggestions(searchText, suggestions)
              if (matches.length === 1) {
                onSelectItem(matches[0])
                setVoiceForceOpen(null)
                setListeningField(null)
              } else if (matches.length > 1) {
                setVoiceForceOpen(fieldName)
                showToast(`Найдено ${matches.length} — уточните голосом`)
                startedPhase2 = true
                setListeningField(`${fieldName}_p2`)
                voice.start(
                  (text2) => {
                    const picked = pickFromFiltered(text2, matches)
                    if (picked) onSelectItem(picked)
                    else showToast('Не распознано — выберите вручную')
                    setVoiceForceOpen(null)
                    setListeningField(null)
                  },
                  () => { setVoiceForceOpen(null); setListeningField(null) }
                )
              } else {
                onSetSearchText(text)
                showToast('Ничего не найдено')
                setListeningField(null)
              }
            },
            () => { if (!startedPhase2) setListeningField(null) }
          )
          setListeningField(fieldName)
        }}
      />
    )
  }

  function cancelVoiceTwoPhase(fieldName: string) {
    if (voiceForceOpen === fieldName) {
      voice.stop()
      setVoiceForceOpen(null)
      setListeningField(null)
    }
  }

  const [newStoneOpen, setNewStoneOpen] = useState(false)

  useEffect(() => {
    if (!newStoneOpen) return
    startBlur()
    return stopBlur
  }, [newStoneOpen])

  const [newStoneBrand, setNewStoneBrand] = useState('')
  const [newStoneGritUnit, setNewStoneGritUnit] = useState<GritUnit | ''>('')
  const [newStoneGrit, setNewStoneGrit] = useState('')
  const [newStoneGritMk, setNewStoneGritMk] = useState('')
  const [newStoneType, setNewStoneType] = useState<Stone['type'] | ''>('')

  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  const stoneSuggestions = useLiveQuery(async () => {
    const items = await db.stones.toArray().then(arr => arr.sort(compareStonesForSort))
    return items.map(st => stoneDisplayName(st))
  }, []) ?? []
  const knifeSuggestions = useLiveQuery(async () => {
    if (clientId) {
      const clientSharpenings = await db.sharpenings.where('clientId').equals(clientId).toArray()
      if (clientSharpenings.length > 0) {
        const freq = new Map<string, number>()
        for (const sh of clientSharpenings) {
          freq.set(sh.knifeBrand, (freq.get(sh.knifeBrand) ?? 0) + 1)
        }
        return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([brand]) => brand)
      }
    }
    const items = await db.knives.orderBy('brand').toArray()
    return [...new Set(items.map(k => k.brand))]
  }, [clientId]) ?? []
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
    if (selectedStones.find(st => st.name.toLowerCase() === trimmed.toLowerCase())) return
    setSelectedStones(prev => [...prev, { name: trimmed, order: prev.length + 1 }])
    setStoneInput('')
  }

  function removeStone(index: number) {
    setSelectedStones(prev =>
      prev.filter((_, i) => i !== index).map((st, i) => ({ ...st, order: i + 1 }))
    )
  }

  async function saveNewStone() {
    if (!newStoneBrand.trim()) return
    const stone: Stone = {
      brand: newStoneBrand.trim(),
      grit: (newStoneGritUnit === 'fepa' || newStoneGritUnit === 'jis') && newStoneGrit ? Number(newStoneGrit) : undefined,
      gritUnit: newStoneGritUnit || undefined,
      gritMk: newStoneGritUnit === 'mk' && newStoneGritMk ? newStoneGritMk : undefined,
      type: newStoneType || undefined,
      isCustom: true,
      updatedAt: new Date(),
    }
    await db.stones.add(stone)
    addStone(stoneDisplayName(stone))
    setNewStoneBrand(''); setNewStoneGritUnit(''); setNewStoneGrit(''); setNewStoneGritMk(''); setNewStoneType(''); setNewStoneOpen(false)
  }

  async function handleSave() {
    if (!clientId || !knifeBrand.trim() || saving) return
    setSaving(true)

    const now = new Date()

    const knifeInRef = knifeSuggestions.some(k => k.toLowerCase() === knifeBrand.trim().toLowerCase())
    if (!knifeInRef) {
      await db.knives.add({ brand: knifeBrand.trim(), isCustom: true, updatedAt: now })
    }

    if (steel.trim()) {
      const steelInRef = steelSuggestions.some(name => name.toLowerCase() === steel.trim().toLowerCase())
      if (!steelInRef) {
        await db.steels.add({ name: steel.trim(), isCustom: true, updatedAt: now })
      }
    }

    if (selectedStones.length) {
      const existingStones = await db.stones.toArray()
      const existingKeys = new Set(existingStones.map(st => {
        if (st.gritUnit === 'mk') return `${st.brand.toLowerCase()} mk:${st.gritMk ?? ''}`
        return `${st.brand.toLowerCase()} ${st.grit ?? 0}`
      }))
      for (const stone of selectedStones) {
        const parsed = parseStoneName(stone.name)
        const key = parsed.gritUnit === 'mk'
          ? `${parsed.brand.toLowerCase()} mk:${parsed.gritMk ?? ''}`
          : `${parsed.brand.toLowerCase()} ${parsed.grit ?? 0}`
        if (!existingKeys.has(key)) {
          await db.stones.add({ brand: parsed.brand, grit: parsed.grit, gritUnit: parsed.gritUnit, gritMk: parsed.gritMk, type: 'ao', isCustom: true, updatedAt: now })
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
      updatedAt: new Date(),
    }

    try {
      if (isEdit) {
        await db.sharpenings.update(Number(id), data)
        trackSharpening(data)
        showToast('Заточка сохранена')
        navigate('/', { replace: true })
      } else {
        const newId = await db.sharpenings.add(data)
        trackSharpening(data)
        showToast('Заточка создана')
        navigate(`/sharpenings/${newId}`)
      }
    } catch {
      showToast('Ошибка при сохранении')
      setSaving(false)
    }
  }

  const canProceed = Boolean(clientId && knifeBrand.trim())

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.backBtn} onClick={() => step === 2 ? setStep(1) : navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{isEdit ? 'РЕДАКТИРОВАТЬ' : 'НОВАЯ ЗАТОЧКА'}</span>
      </div>

      {/* Stepper */}
      <div className={s.stepper}>
        <div className={s.stepItem}>
          <div className={`${s.stepDot} ${step >= 1 ? (step > 1 ? s.done : s.active) : ''}`}>
            {step > 1 ? <IconCheck /> : '1'}
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
              <div className={s.inputWithMicRow}>
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
                {micBtn('client', (text) => {
                  const lower = text.toLowerCase()
                  const match = sortedClients.find(c =>
                    c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
                  )
                  if (match?.id) {
                    setClientId(match.id)
                    showToast(`Клиент: ${match.name}`)
                  } else {
                    showToast('Клиент не найден')
                  }
                })}
              </div>
            </div>
          )}

          <div className={`${s.field} ${s.fieldRequired}`}>
            <label className={s.label}>Нож / Бренд <span className={s.req}>*</span></label>
            <Autocomplete
              value={knifeBrand}
              onChange={setKnifeBrand}
              suggestions={knifeSuggestions}
              placeholder={knifeSuggestions.length > 0 ? knifeSuggestions.slice(0, 3).join(', ') + '...' : 'Mora, Victorinox, самодел...'}
              autoFocus={!prefilledClientId}
              forceOpen={voiceForceOpen === 'knifeBrand'}
              onSelect={(item) => { setKnifeBrand(item); cancelVoiceTwoPhase('knifeBrand') }}
              micButton={micBtnTwoPhase(
                'knifeBrand',
                knifeSuggestions,
                setKnifeBrand,
                (item) => { setKnifeBrand(item); showToast(`Нож: ${item}`) }
              )}
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Сталь</label>
            <Autocomplete
              value={steel}
              onChange={setSteel}
              suggestions={steelSuggestions}
              placeholder="AUS-8, D2..."
              forceOpen={voiceForceOpen === 'steel'}
              onSelect={(item) => { setSteel(item); cancelVoiceTwoPhase('steel') }}
              micButton={micBtnTwoPhase(
                'steel',
                steelSuggestions,
                setSteel,
                (item) => { setSteel(item); showToast(`Сталь: ${item}`) }
              )}
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
            <label className={s.label}>Требуется</label>
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
            <span className={s.photoTitle}>
              Фото «До»{photosBefore.length > 0 ? ` · ${photosBefore.length} / ${PHOTO_LIMIT}` : ' (необязательно)'}
            </span>
            {photosBefore.length > 0 && (
              <div className={s.photoThumbs}>
                {photosBefore.map((src, i) => {
                  const isCover = photosAfter.length === 0 && i === 0
                  return (
                    <div key={i} className={`${s.photoThumb} ${isCover ? s.photoThumbCover : ''}`}>
                      <img
                        src={src}
                        alt=""
                        onClick={() => setLightbox({ photos: photosBefore, index: i })}
                      />
                      {isCover && <span className={s.coverBadge}>обложка</span>}
                      <button
                        className={s.photoRemove}
                        onClick={() => setPhotosBefore(prev => prev.filter((_, j) => j !== i))}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            )}
            <button
              className={s.photoAddBtn}
              disabled={photosBefore.length >= PHOTO_LIMIT}
              onClick={() => setPickerFor('before')}
            >
              <span className={s.photoAddIcon}><IconCamera /></span>
              {photosBefore.length >= PHOTO_LIMIT ? 'Лимит 5 фото достигнут' : 'Добавить фото'}
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
            <div className={s.inputWithMicRow}>
              <input
                value={angle}
                onChange={e => setAngle(e.target.value)}
                placeholder="15"
                type="number"
                min={1}
                max={45}
              />
              {micBtn('angle', (text) => {
                const num = extractNumber(text)
                if (num) setAngle(num)
              })}
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Камни</label>
            {selectedStones.length > 0 && (
              <div className={s.stoneTags}>
                {selectedStones.map((ss, i) => {
                  const parsed = parseStoneName(ss.name)
                  const alts = getAltGrits({ grit: parsed.grit, gritUnit: parsed.gritUnit, gritMk: parsed.gritMk })
                  return (
                    <div key={i} className={s.stoneTag}>
                      <span className={s.stoneOrder}>{ss.order}.</span>
                      <div className={s.stoneNameGroup}>
                        <span>{ss.name}</span>
                        {alts.length > 0 && (
                          <span className={s.stoneGritAlt}>{alts.join(' · ')}</span>
                        )}
                      </div>
                      {i === selectedStones.length - 1 && (
                        <span className={s.stoneFinBadge}>FIN</span>
                      )}
                      <button className={s.stoneRemove} onClick={() => removeStone(i)}>×</button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className={s.stoneInputRow}>
              <Autocomplete
                value={stoneInput}
                onChange={setStoneInput}
                suggestions={stoneSuggestions}
                onSelect={(item) => { addStone(item); cancelVoiceTwoPhase('stone') }}
                placeholder="Naniwa 1000, Shapton 2000..."
                forceOpen={voiceForceOpen === 'stone'}
                micButton={micBtnTwoPhase(
                  'stone',
                  stoneSuggestions,
                  setStoneInput,
                  (item) => { addStone(item); showToast(`Добавлен: ${item}`) }
                )}
              />
              <button
                className={s.stoneAddBtn}
                onClick={() => addStone(stoneInput)}
                disabled={!stoneInput.trim()}
              >+</button>
            </div>
            {!newStoneOpen && (
              <button className={s.newStoneToggle} onClick={() => setNewStoneOpen(true)}>
                + создать новый камень
              </button>
            )}
            {newStoneOpen && createPortal(
              <div
                style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--space-4)' }}
                onClick={() => setNewStoneOpen(false)}
              >
              <div style={{ width:'100%', background:'var(--bg-100)', borderRadius:'var(--radius-lg)', maxHeight:'92vh', overflowY:'auto', padding:'var(--space-4)', display:'flex', flexDirection:'column', gap:'var(--space-2)' }}
                onClick={e => e.stopPropagation()}
              >
              <span className={s.newStoneTitle}>Новый камень в справочник</span>
                <input
                  value={newStoneBrand}
                  onChange={e => setNewStoneBrand(e.target.value)}
                  placeholder="Бренд (Suehiro, Naniwa...)"
                  autoFocus
                />
                <div className={s.gritUnitRow}>
                  {(['', 'fepa', 'jis', 'mk'] as const).map(u => (
                    <button
                      key={u || 'none'}
                      className={`${s.gritUnitBtn} ${newStoneGritUnit === u ? s.gritUnitActive : ''}`}
                      onClick={() => { setNewStoneGritUnit(u); setNewStoneGrit(''); setNewStoneGritMk('') }}
                    >
                      {u === '' ? 'нет' : u === 'mk' ? 'мк' : u.toUpperCase()}
                    </button>
                  ))}
                </div>
                {(newStoneGritUnit === 'fepa' || newStoneGritUnit === 'jis') && (
                  <input
                    value={newStoneGrit}
                    onChange={e => setNewStoneGrit(e.target.value)}
                    placeholder={`${newStoneGritUnit.toUpperCase()}, напр. 1000`}
                    type="number"
                    min={1}
                  />
                )}
                {newStoneGritUnit === 'mk' && (
                  <select
                    className={s.select}
                    value={newStoneGritMk}
                    onChange={e => setNewStoneGritMk(e.target.value)}
                  >
                    <option value="">Выбрать мк</option>
                    {MK_VALUES.map(v => <option key={v} value={v}>{v} мк</option>)}
                  </select>
                )}
                <div className={s.newStoneRow}>
                  <select
                    className={s.select}
                    value={newStoneType}
                    onChange={e => setNewStoneType(e.target.value as Stone['type'] | '')}
                  >
                    <option value="" disabled>выберите тип абразива</option>
                    <option value="galvanic">Гальваника</option>
                    <option value="ao">ОА</option>
                    <option value="kk">КК</option>
                    <option value="diamond">Алмаз</option>
                    <option value="elbor">Эльбор</option>
                    <option value="natural">Природа</option>
                    <option value="pritir">Притир</option>
                    <option value="ceramic">Керамика</option>
                    <option value="other">Другой тип абразива</option>
                  </select>
                </div>
                <div className={s.newStoneRow}>
                  <button className={s.newStoneSaveBtn} onClick={saveNewStone} disabled={!newStoneBrand.trim()}>Добавить</button>
                  <button className={s.newStoneCancelBtn} onClick={() => setNewStoneOpen(false)}>Отмена</button>
                </div>
              </div>
              </div>,
              document.body
            )}
          </div>

          <div className={s.field}>
            <label className={s.label}>Комментарий</label>
            <div className={s.textareaWithMicWrap}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Особенности, замечания..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
              {micBtn('comment', (text) => {
                setComment(prev => prev ? `${prev} ${text}` : text)
              })}
            </div>
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>Цена, ₽</label>
              <div className={s.inputWithMicRow}>
                <input
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="500"
                  type="number"
                  min={0}
                />
                {micBtn('price', (text) => {
                  const num = extractNumber(text)
                  if (num) setPrice(num)
                })}
              </div>
            </div>
          </div>

          <div className={s.field}>
            <div className={s.labelRow}>
              <label className={s.label}>Статус</label>
              {micBtn('status', (text) => {
                const lower = text.toLowerCase()
                if (DONE_KEYWORDS.some(kw => lower.includes(kw))) {
                  setStatus('done')
                  showToast('Статус изменён на «Готово»')
                }
              })}
            </div>
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
              <span className={s.photoTitle}>
                Фото «После»{photosAfter.length > 0 ? ` · ${photosAfter.length} / ${PHOTO_LIMIT}` : ' (необязательно)'}
              </span>
              {photosAfter.length > 0 && (
                <div className={s.photoThumbs}>
                  {photosAfter.map((src, i) => {
                    const isCover = i === 0
                    return (
                      <div key={i} className={`${s.photoThumb} ${isCover ? s.photoThumbCover : ''}`}>
                        <img
                          src={src}
                          alt=""
                          onClick={() => setLightbox({ photos: photosAfter, index: i })}
                        />
                        {isCover && <span className={s.coverBadge}>обложка</span>}
                        <button
                          className={s.photoRemove}
                          onClick={() => setPhotosAfter(prev => prev.filter((_, j) => j !== i))}
                        >×</button>
                      </div>
                    )
                  })}
                </div>
              )}
              <button
                className={s.photoAddBtn}
                disabled={photosAfter.length >= PHOTO_LIMIT}
                onClick={() => setPickerFor('after')}
              >
                <span className={s.photoAddIcon}><IconCamera /></span>
                {photosAfter.length >= PHOTO_LIMIT ? 'Лимит 5 фото достигнут' : 'Добавить фото'}
              </button>
            </div>
          )}

          <div className={s.actions}>
            <button className={s.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение…' : (isEdit ? 'Сохранить' : 'Сохранить заточку')}
            </button>
            <button className={s.secondaryBtn} onClick={() => setStep(1)}>
              ← Назад к приёмке
            </button>
          </div>
        </div>
      )}

      {pickerFor && (
        <PhotoSourceSheet
          onCamera={() => {
            if (pickerFor === 'before') openCamera(b64 => setPhotosBefore(prev => [...prev, b64]))
            else openCamera(b64 => setPhotosAfter(prev => [...prev, b64]))
          }}
          onGallery={() => {
            if (pickerFor === 'before') openGallery(b64 => setPhotosBefore(prev => [...prev, b64]))
            else openGallery(b64 => setPhotosAfter(prev => [...prev, b64]))
          }}
          onClose={() => setPickerFor(null)}
        />
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
