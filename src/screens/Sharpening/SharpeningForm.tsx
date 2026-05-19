import { useState, useEffect, useRef } from 'react'
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
import { startBlur } from '../../utils/modalBlur'
import { useDictationMode, type DictationErrorCode, type AutoStopReason } from '../../hooks/useDictationMode'
import { findClientMatch, findAllMatches, pickFromFiltered } from '../../utils/voiceMatch'
import type { Command, CommandContext, FieldKey } from '../../utils/voiceCommand'
import DictationButton from '../../components/DictationButton/DictationButton'
import DictationIndicator from '../../components/DictationIndicator/DictationIndicator'
import DictationCandidates from '../../components/DictationCandidates/DictationCandidates'
import { isVoiceEnabled } from '../../config/features'
import s from './SharpeningForm.module.css'


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

type RepeatState = {
  clientId: number
  knifeBrand: string
  steel?: string
  hrc?: number
  angle?: number
  stones?: SharpeningStone[]
  price?: number
}

function parseRepeatState(state: unknown): RepeatState | undefined {
  if (!state || typeof state !== 'object') return undefined
  const r = (state as { repeat?: unknown }).repeat
  if (!r || typeof r !== 'object') return undefined
  const x = r as Record<string, unknown>
  if (typeof x.clientId !== 'number' || typeof x.knifeBrand !== 'string') return undefined
  return {
    clientId: x.clientId,
    knifeBrand: x.knifeBrand,
    steel: typeof x.steel === 'string' ? x.steel : undefined,
    hrc: typeof x.hrc === 'number' ? x.hrc : undefined,
    angle: typeof x.angle === 'number' ? x.angle : undefined,
    stones: Array.isArray(x.stones) ? (x.stones as SharpeningStone[]) : undefined,
    price: typeof x.price === 'number' ? x.price : undefined,
  }
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

  const repeat = !isEdit ? parseRepeatState(location.state) : undefined

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

  const dictation = useDictationMode()

  // Dictation context — re-read on every recognition event via getContext().
  const [awaitingListField, setAwaitingListField] = useState<FieldKey | null>(null)
  const [awaitingCancelConfirm, setAwaitingCancelConfirm] = useState(false)
  const [dictationCandidates, setDictationCandidates] = useState<{ field: FieldKey; items: string[] } | null>(null)
  const stepRef = useRef<1 | 2>(1)
  const awaitingListFieldRef = useRef<FieldKey | null>(null)
  const awaitingCancelConfirmRef = useRef(false)
  const lastRawRef = useRef('')
  const stoneInputRef = useRef('')
  const selectedStonesRef = useRef<SharpeningStone[]>([])
  const cancelTimerRef = useRef<number | null>(null)
  useEffect(() => { stepRef.current = step as 1 | 2 }, [step])
  useEffect(() => { awaitingListFieldRef.current = awaitingListField }, [awaitingListField])
  useEffect(() => { awaitingCancelConfirmRef.current = awaitingCancelConfirm }, [awaitingCancelConfirm])
  useEffect(() => { stoneInputRef.current = stoneInput }, [stoneInput])
  useEffect(() => { selectedStonesRef.current = selectedStones }, [selectedStones])
  const getDictationContext = (): CommandContext => ({
    step: stepRef.current,
    awaitingListField: awaitingListFieldRef.current,
    awaitingCancelConfirm: awaitingCancelConfirmRef.current,
  })

  function fieldLabel(f: FieldKey): string {
    switch (f) {
      case 'client': return 'Клиент'
      case 'knife': return 'Нож'
      case 'steel': return 'Сталь'
      case 'condition': return 'Требуется'
      case 'notes': return 'Примечание'
      case 'stone': return 'Камень'
      case 'angle': return 'Угол'
      case 'price': return 'Цена'
      case 'hrc': return 'HRC'
    }
  }

  function normalizeConditionValue(v: string): string | null {
    const lc = v.toLowerCase().trim()
    if (lc === 'заточка') return 'заточка'
    if (lc === 'ремонт') return 'ремонт'
    if (lc === 'правка' || lc === 'правка рк') return 'правка РК'
    return null
  }

  function closeDictationList() {
    setAwaitingListField(null)
    setDictationCandidates(null)
  }

  function clearCancelConfirm(silent: boolean) {
    if (cancelTimerRef.current !== null) {
      clearTimeout(cancelTimerRef.current)
      cancelTimerRef.current = null
    }
    setAwaitingCancelConfirm(false)
    awaitingCancelConfirmRef.current = false
    if (!silent) showToast('Отмена сброшена')
  }

  function armCancelConfirm() {
    if (cancelTimerRef.current !== null) clearTimeout(cancelTimerRef.current)
    setAwaitingCancelConfirm(true)
    awaitingCancelConfirmRef.current = true
    cancelTimerRef.current = window.setTimeout(() => {
      cancelTimerRef.current = null
      setAwaitingCancelConfirm(false)
      awaitingCancelConfirmRef.current = false
      showToast('Отмена сброшена')
    }, 5000)
    showToast('Сказать «да» для отмены')
  }

  useEffect(() => {
    return () => {
      if (cancelTimerRef.current !== null) clearTimeout(cancelTimerRef.current)
    }
  }, [])

  function applyClientByName(name: string) {
    const c = clients?.find(cl => cl.name === name)
    if (c?.id) setClientId(c.id)
  }

  function applyByField(field: FieldKey, item: string) {
    switch (field) {
      case 'client': applyClientByName(item); break
      case 'knife': setKnifeBrand(item); break
      case 'steel': setSteel(item); break
      case 'stone': setStoneInput(item); break
      default: break
    }
  }

  function dispatchFuzzyField(
    field: FieldKey,
    value: string,
    suggestions: string[],
  ) {
    if (!value.trim() || suggestions.length === 0) {
      showToast(`${fieldLabel(field)} не найдено`)
      return
    }
    const all = findAllMatches(value, suggestions, 30)

    if (all.length === 1) {
      applyByField(field, all[0])
      closeDictationList()
      showToast(`${fieldLabel(field)}: ${all[0]}`)
      return
    }

    if (all.length > 1) {
      setDictationCandidates({ field, items: all })
      setAwaitingListField(field)
      showToast(`Уточни ${fieldLabel(field).toLowerCase()}`)
      return
    }

    showToast(`${fieldLabel(field)} не найдено`)
  }

  function applyClientCommand(value: string) {
    const names = (clients ?? []).map(c => c.name)
    const single = findClientMatch(value, names)
    if (single) {
      applyClientByName(single)
      closeDictationList()
      showToast(`Клиент: ${single}`)
      return
    }
    const all = findAllMatches(value, names, 30)
    if (all.length > 0) {
      setDictationCandidates({ field: 'client', items: all })
      setAwaitingListField('client')
      showToast('Уточни клиента')
      return
    }
    showToast('Клиент не найден')
  }

  function applyFieldCommand(field: FieldKey, value: string) {
    switch (field) {
      case 'client':
        applyClientCommand(value)
        return
      case 'knife':
        dispatchFuzzyField('knife', value, knifeSuggestions)
        return
      case 'steel':
        dispatchFuzzyField('steel', value, steelSuggestions)
        return
      case 'condition': {
        const chip = normalizeConditionValue(value)
        if (!chip) { showToast('Не понял требование'); return }
        toggleCondition(chip)
        showToast(`Требуется: ${chip}`)
        return
      }
      case 'notes':
        setComment(prev => prev ? `${prev} ${value}` : value)
        showToast('Дописано в примечание')
        return
      case 'stone':
        dispatchFuzzyField('stone', value, stoneSuggestions)
        return
      case 'angle':
        setAngle(value)
        showToast(`Угол: ${value}`)
        return
      case 'price':
        setPrice(value)
        showToast(`Цена: ${value}`)
        return
      case 'hrc':
        setHrc(value)
        showToast(`HRC: ${value}`)
        return
    }
  }

  function handlePickFromList(hint: string) {
    const list = dictationCandidates
    const field = awaitingListField
    if (!list || !field) return
    const picked = pickFromFiltered(hint, list.items)
    if (!picked) return  // mismatch — list stays per β
    applyByField(field, picked)
    closeDictationList()
    showToast(`${fieldLabel(field)}: ${picked}`)
  }

  function handleDictationCommand(cmd: Command, raw: string) {
    lastRawRef.current = raw

    // Variant β: any valid non-pick non-unknown command while list is hanging closes it first.
    if (awaitingListFieldRef.current && cmd.kind !== 'pickFromList' && cmd.kind !== 'unknown') {
      // For same-field field command, dispatchFuzzyField/applyClientCommand will reopen the list as needed.
      closeDictationList()
    }

    // DI-41: any recognized non-confirmCancel command resets the cancel-confirm window.
    if (awaitingCancelConfirmRef.current && cmd.kind !== 'confirmCancel' && cmd.kind !== 'unknown') {
      clearCancelConfirm(true)
    }

    switch (cmd.kind) {
      case 'field':
        applyFieldCommand(cmd.field, cmd.value)
        return
      case 'addStone':
        if (stepRef.current !== 2) {
          showToast('Команда недоступна на этом шаге')
          return
        }
        if (!stoneInputRef.current.trim()) {
          showToast('Нет камня для добавления')
          return
        }
        addStone(stoneInputRef.current)
        showToast(`Камень добавлен: ${stoneInputRef.current}`)
        return
      case 'removeLastStone':
        if (stepRef.current !== 2) { showToast('Команда недоступна на этом шаге'); return }
        if (selectedStonesRef.current.length === 0) { showToast('Нет камней для удаления'); return }
        removeStone(selectedStonesRef.current.length - 1)
        showToast('Последний камень удалён')
        return
      case 'clear':
        switch (cmd.field) {
          case 'client': setClientId(null); break
          case 'knife': setKnifeBrand(''); break
          case 'steel': setSteel(''); break
          case 'condition': setCondition([]); break
          case 'notes': setComment(''); break
          case 'stone': setStoneInput(''); break
          case 'angle': setAngle(''); break
          case 'price': setPrice(''); break
          case 'hrc': setHrc(''); break
        }
        closeDictationList()
        showToast(`Очищено: ${fieldLabel(cmd.field)}`)
        return
      case 'nav':
        if (cmd.action === 'next') {
          if (stepRef.current === 2) { showToast('Вы уже на последнем шаге'); return }
          if (!canProceed) { showToast('Заполни клиента и нож'); return }
          setStep(2)
          return
        }
        if (cmd.action === 'prev') {
          if (stepRef.current === 1) { showToast('Это первый шаг'); return }
          setStep(1)
          return
        }
        // cancel
        armCancelConfirm()
        return
      case 'submit':
        if (!clientId || !knifeBrand.trim()) {
          showToast('Заполни клиента и нож')
          return
        }
        dictation.stop()
        handleSave({ markDoneOverride: cmd.markDone })
        return
      case 'stop':
        dictation.stop()
        return
      case 'confirmCancel':
        clearCancelConfirm(true)
        dictation.stop()
        navigate(-1)
        return
      case 'pickFromList':
        handlePickFromList(cmd.hint)
        return
      case 'repeat':
        showToast(`Слышал: «${lastRawRef.current}»`)
        return
      case 'unknown':
        showToast(`Не понял: «${raw}»`)
        return
    }
  }

  function handleDictationListenError(_code: DictationErrorCode) {
    // Тихо — счётчик в хуке сам остановит после 3 подряд.
  }

  function handleDictationAutoStop(reason: AutoStopReason) {
    if (reason === 'errors') showToast('Микрофон отключён, проверь связь')
    else if (reason === 'fatal') showToast('Нет доступа к микрофону')
    else if (reason === 'unavailable') showToast('Голосовой ввод недоступен офлайн')
  }

  // Stable callback refs — recognition events fire with the closure captured at
  // start() time, so we must read the latest handlers through a ref instead.
  const dictationCallbacksRef = useRef({
    onCommand: handleDictationCommand,
    onAutoStop: handleDictationAutoStop,
    onListenError: handleDictationListenError,
  })
  useEffect(() => {
    dictationCallbacksRef.current = {
      onCommand: handleDictationCommand,
      onAutoStop: handleDictationAutoStop,
      onListenError: handleDictationListenError,
    }
  })

  function toggleDictation() {
    if (dictation.isActive) {
      dictation.stop()
      closeDictationList()
      clearCancelConfirm(true)
    } else {
      dictation.start({
        onCommand: (cmd, raw) => dictationCallbacksRef.current.onCommand(cmd, raw),
        getContext: getDictationContext,
        onAutoStop: (reason) => dictationCallbacksRef.current.onAutoStop(reason),
        onListenError: (code) => dictationCallbacksRef.current.onListenError(code),
      })
    }
  }


  const [newStoneOpen, setNewStoneOpen] = useState(false)

  useEffect(() => {
    if (!newStoneOpen) return
    return startBlur()
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
    const items = await db.knives.orderBy('brand').toArray()
    const allBrands = [...new Set(items.map(k => k.brand))]
    if (clientId) {
      const clientSharpenings = await db.sharpenings.where('clientId').equals(clientId).toArray()
      if (clientSharpenings.length > 0) {
        const freq = new Map<string, number>()
        for (const sh of clientSharpenings) {
          freq.set(sh.knifeBrand, (freq.get(sh.knifeBrand) ?? 0) + 1)
        }
        const prior = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([brand]) => brand)
        // Client's prior knives ranked first, then rest of the dictionary so
        // adding a brand the client hasn't used before still works via search.
        const seen = new Set(prior)
        return [...prior, ...allBrands.filter(b => !seen.has(b))]
      }
    }
    return allBrands
  }, [clientId]) ?? []
  const steelSuggestions = useLiveQuery(async () => {
    const items = await db.steels.orderBy('name').toArray()
    return [...new Set(items.map(st => st.name))]
  }, []) ?? []

  useEffect(() => {
    if (!id) return
    let cancelled = false
    db.sharpenings.get(Number(id)).then(sh => {
      if (cancelled || !sh) return
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
    return () => { cancelled = true }
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

  async function handleSave(opts: { markDoneOverride?: boolean } = {}) {
    if (!clientId || !knifeBrand.trim() || saving) return
    setSaving(true)

    const effectiveStatus: SharpeningStatus = opts.markDoneOverride ? 'done' : status
    const effectiveDoneAt = effectiveStatus === 'done' ? (doneAt ?? new Date()) : undefined

    const now = new Date()

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
      status: effectiveStatus,
      doneAt: effectiveDoneAt,
      photosAfter: photosAfter.length ? photosAfter : undefined,
      updatedAt: now,
    }

    try {
      const savedId = await db.transaction(
        'rw',
        [db.knives, db.steels, db.stones, db.sharpenings],
        async () => {
          const addIfMissing = async <T,>(
            value: string,
            existing: string[],
            add: (v: string) => Promise<T>,
          ) => {
            const v = value.trim()
            if (!v) return
            if (existing.some(e => e.toLowerCase() === v.toLowerCase())) return
            await add(v)
          }

          await addIfMissing(knifeBrand, knifeSuggestions, v =>
            db.knives.add({ brand: v, isCustom: true, updatedAt: now })
          )
          await addIfMissing(steel, steelSuggestions, v =>
            db.steels.add({ name: v, isCustom: true, updatedAt: now })
          )

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

          if (isEdit) {
            await db.sharpenings.update(Number(id), data)
            return Number(id)
          }
          return Number(await db.sharpenings.add(data))
        }
      )

      trackSharpening(data)
      if (isEdit) {
        showToast('Заточка сохранена')
        navigate('/', { replace: true })
      } else {
        showToast(step === 1 ? 'Приёмка сохранена' : 'Заточка создана')
        navigate(`/sharpenings/${savedId}`)
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
        {isVoiceEnabled() && (
          <div className={s.headerRight}>
            <DictationButton
              isAvailable={dictation.isAvailable}
              isActive={dictation.isActive}
              onToggle={toggleDictation}
            />
          </div>
        )}
      </div>

      {dictation.isActive && (
        <DictationIndicator lastTranscript={dictation.lastTranscript} />
      )}

      {dictationCandidates && (
        <DictationCandidates
          label={fieldLabel(dictationCandidates.field).toLowerCase()}
          items={dictationCandidates.items}
          onPick={(item) => {
            applyByField(dictationCandidates.field, item)
            closeDictationList()
            showToast(`${fieldLabel(dictationCandidates.field)}: ${item}`)
          }}
          onClose={closeDictationList}
        />
      )}

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
              <select
                  className={`${s.select} ${!clientId ? s.selectPlaceholder : ''}`}
                  value={clientId ?? ''}
                  onChange={e => setClientId(Number(e.target.value))}
                  autoFocus={!prefilledClientId}
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
              onSelect={setKnifeBrand}
              suggestions={knifeSuggestions}
              placeholder={dictation.isActive ? 'нож ...' : (knifeSuggestions.length > 0 ? knifeSuggestions.slice(0, 3).join(', ') + '...' : 'Mora, Victorinox, самодел...')}
              autoFocus={Boolean(prefilledClientId)}
            />
          </div>

          <div className={s.field}>
            <label className={s.label}>Сталь</label>
            <Autocomplete
              value={steel}
              onChange={setSteel}
              onSelect={setSteel}
              suggestions={steelSuggestions}
              placeholder={dictation.isActive ? 'сталь ...' : 'AUS-8, D2...'}
            />
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>HRC</label>
              <input
                  value={hrc}
                  onChange={e => setHrc(e.target.value)}
                  placeholder={dictation.isActive ? 'твёрдость ...' : '58'}
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
              Заточить сейчас
            </button>
            <button
              className={s.secondaryBtn}
              onClick={() => handleSave()}
              disabled={!canProceed || saving}
            >
              {saving ? 'Сохранение…' : 'Сохранить как принятый'}
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
              placeholder={dictation.isActive ? 'угол ...' : '15'}
              type="number"
              min={1}
              max={45}
            />
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
                onSelect={addStone}
                suggestions={stoneSuggestions}
                placeholder={dictation.isActive ? 'камень ...' : 'Naniwa 1000, Shapton 2000...'}
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
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={dictation.isActive ? 'примечание ...' : 'Особенности, замечания...'}
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
                  placeholder={dictation.isActive ? 'цена ...' : '500'}
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
            <button className={s.primaryBtn} onClick={() => handleSave()} disabled={saving}>
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
