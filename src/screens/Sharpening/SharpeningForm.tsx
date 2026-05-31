import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStone } from '../../db/instance'
import { fromFepa, fromJis, fromMk, fromMicrons } from '../../data/gritTable'
import { useToast } from '../../components/Toast/ToastContext'
import { useCamera } from '../../hooks/useCamera'
import Autocomplete from '../../components/Autocomplete/Autocomplete'
import PhotoLightbox from '../../components/PhotoLightbox/PhotoLightbox'
import PhotoSourceSheet from '../../components/PhotoSourceSheet/PhotoSourceSheet'
import { trackSharpening } from '../../services/analytics'
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

const CONDITIONS = ['заточка', 'правка РК', 'ремонт']
const PHOTO_LIMIT = 5

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function parseStoneName(name: string): { brand: string } & Partial<ReturnType<typeof fromFepa>> {
  const mkMatch = name.match(/^(.*?)\s+(\d+\/\d+)мк$/)
  if (mkMatch) return { brand: mkMatch[1], ...fromMk(mkMatch[2]) }
  const fepaMatch = name.match(/^(.*?)\s+(\d+)\s+FEPA$/)
  if (fepaMatch) return { brand: fepaMatch[1], ...fromFepa(Number(fepaMatch[2])) }
  const jisMatch = name.match(/^(.*?)\s+(\d+)\s+JIS$/)
  if (jisMatch) return { brand: jisMatch[1], ...fromJis(Number(jisMatch[2])) }
  const mkмMatch = name.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+мкм$/)
  if (mkмMatch) return { brand: mkмMatch[1], ...fromMicrons(Number(mkмMatch[2])) }
  const numMatch = name.match(/^(.*?)\s+(\d+)$/)
  if (numMatch) return { brand: numMatch[1], ...fromJis(Number(numMatch[2])) }
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
  const { showToast, setRaisedMode } = useToast()
  const { openCamera, openGallery } = useCamera()
  const isEdit = Boolean(id)

  const prefilledClientId = searchParams.get('clientId')
    ? Number(searchParams.get('clientId'))
    : null

  const repeat = !isEdit ? parseRepeatState(location.state) : undefined

  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Reception fields
  const [clientId, setClientId] = useState<number | null>(repeat?.clientId ?? prefilledClientId)
  const [knifeBrand, setKnifeBrand] = useState(repeat?.knifeBrand ?? '')
  const [steel, setSteel] = useState(repeat?.steel ?? '')
  const [hrc, setHrc] = useState(repeat?.hrc != null ? String(repeat.hrc) : '')
  const [condition, setCondition] = useState<string[]>([])
  const [receivedAt, setReceivedAt] = useState(todayStr())
  const [photosBefore, setPhotosBefore] = useState<string[]>([])
  const [price, setPrice] = useState(repeat?.price != null ? String(repeat.price) : '')

  // Z-2 поля — на Z-1 не редактируются и нет голосовых команд (парсер отсекает по step=1).
  // Переносятся из repeat в acceptanceData при сохранении.
  const repeatAngle = repeat?.angle
  const repeatStones: SharpeningStone[] = repeat?.stones ?? []

  const dictation = useDictationMode()

  const [awaitingListField, setAwaitingListField] = useState<FieldKey | null>(null)
  const [awaitingCancelConfirm, setAwaitingCancelConfirm] = useState(false)
  const [dictationCandidates, setDictationCandidates] = useState<{ field: FieldKey; items: string[] } | null>(null)
  // In new mode stones are not shown; in edit mode there are no stones either (they live on Z-2).
  // stepRef stays at 1 to disable stone dictation commands on Z-1.
  const stepRef = useRef<1 | 2>(1)
  const awaitingListFieldRef = useRef<FieldKey | null>(null)
  const awaitingCancelConfirmRef = useRef(false)
  const lastRawRef = useRef('')
  const cancelTimerRef = useRef<number | null>(null)
  useEffect(() => { awaitingListFieldRef.current = awaitingListField }, [awaitingListField])
  useEffect(() => { awaitingCancelConfirmRef.current = awaitingCancelConfirm }, [awaitingCancelConfirm])
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

  useEffect(() => {
    setRaisedMode(dictation.isActive)
    return () => setRaisedMode(false)
  }, [dictation.isActive, setRaisedMode])

  function applyClientByName(name: string) {
    const c = clients?.find(cl => cl.name === name)
    if (c?.id) setClientId(c.id)
  }

  function applyByField(field: FieldKey, item: string) {
    switch (field) {
      case 'client': applyClientByName(item); break
      case 'knife': setKnifeBrand(item); break
      case 'steel': setSteel(item); break
      default: break
    }
  }

  function dispatchFuzzyField(field: FieldKey, value: string, suggestions: string[]) {
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
      case 'client': applyClientCommand(value); return
      case 'knife': dispatchFuzzyField('knife', value, knifeSuggestions); return
      case 'steel': dispatchFuzzyField('steel', value, steelSuggestions); return
      case 'condition': {
        const chip = normalizeConditionValue(value)
        if (!chip) { showToast('Не понял требование'); return }
        toggleCondition(chip)
        showToast(`Требуется: ${chip}`)
        return
      }
      case 'notes':
      case 'stone':
      case 'angle':
        // На Z-1 этих полей нет. Парсер отсекает их по step=1 — сюда попасть нельзя,
        // но оставлен явный отказ на случай рассогласования STEP1_FIELDS и UI.
        showToast(`${fieldLabel(field)} — на экране заточки`)
        return
      case 'price': setPrice(value); showToast(`Цена: ${value}`); return
      case 'hrc': setHrc(value); showToast(`HRC: ${value}`); return
    }
  }

  function handlePickFromList(hint: string) {
    const list = dictationCandidates
    const field = awaitingListField
    if (!list || !field) return
    const picked = pickFromFiltered(hint, list.items)
    if (!picked) return
    applyByField(field, picked)
    closeDictationList()
    showToast(`${fieldLabel(field)}: ${picked}`)
  }

  function handleDictationCommand(cmd: Command, raw: string) {
    lastRawRef.current = raw

    if (awaitingListFieldRef.current && cmd.kind !== 'pickFromList' && cmd.kind !== 'unknown') {
      closeDictationList()
    }

    if (awaitingCancelConfirmRef.current && cmd.kind !== 'confirmCancel' && cmd.kind !== 'unknown') {
      clearCancelConfirm(true)
    }

    switch (cmd.kind) {
      case 'field':
        applyFieldCommand(cmd.field, cmd.value)
        return
      case 'addStone':
      case 'removeLastStone':
        showToast('Камни — на экране заточки')
        return
      case 'clear':
        switch (cmd.field) {
          case 'client': setClientId(null); break
          case 'knife': setKnifeBrand(''); break
          case 'steel': setSteel(''); break
          case 'condition': setCondition([]); break
          case 'price': setPrice(''); break
          case 'hrc': setHrc(''); break
          // notes/stone/angle отсекаются парсером по step=1 — сюда не попадают.
          default: return
        }
        closeDictationList()
        showToast(`Очищено: ${fieldLabel(cmd.field)}`)
        return
      case 'nav':
        if (cmd.action === 'next' || cmd.action === 'prev') {
          showToast('Нет шагов')
          return
        }
        armCancelConfirm()
        return
      case 'submit':
        if (!clientId || !knifeBrand.trim()) {
          showToast('Заполни клиента и нож')
          return
        }
        dictation.stop()
        handleSave({ voiceTriggered: true })
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

  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray().then(arr => arr.filter(c => !c.deletedAt)), [])
  const knifeSuggestions = useLiveQuery(async () => {
    const items = await db.knives.orderBy('brand').toArray()
    const allBrands = [...new Set(items.map(k => k.brand))]
    if (clientId) {
      const clientSharpenings = (await db.sharpenings.where('clientId').equals(clientId).toArray()).filter(s => !s.deletedAt)
      if (clientSharpenings.length > 0) {
        const freq = new Map<string, number>()
        for (const sh of clientSharpenings) {
          freq.set(sh.knifeBrand, (freq.get(sh.knifeBrand) ?? 0) + 1)
        }
        const prior = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([brand]) => brand)
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
      if (sh.deletedAt) { navigate('/', { replace: true }); return }
      setClientId(sh.clientId)
      setKnifeBrand(sh.knifeBrand)
      setSteel(sh.steel ?? '')
      setHrc(sh.hrc != null ? String(sh.hrc) : '')
      setCondition(sh.condition ?? [])
      setReceivedAt(new Date(sh.receivedAt).toISOString().slice(0, 10))
      setPhotosBefore(sh.photosBefore ?? [])
      setPrice(sh.price != null ? String(sh.price) : '')
    })
    return () => { cancelled = true }
  }, [id, navigate])

  const sortedClients = clients
    ? [...clients.filter(c => c.isSelf), ...clients.filter(c => !c.isSelf)]
    : []

  function toggleCondition(val: string) {
    setCondition(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    )
  }

  async function handleSave(opts: { voiceTriggered?: boolean } = {}) {
    if (!clientId || !knifeBrand.trim() || saving) return
    setSaving(true)

    const now = new Date()

    // Edit mode saves only reception fields; sharpening details live on Z-2.
    // New mode (acceptance) also saves repeat-state sharpening fields so they appear on Z-2.
    const receptionFields = {
      clientId,
      knifeBrand: knifeBrand.trim(),
      steel: steel.trim() || undefined,
      hrc: hrc ? Number(hrc) : undefined,
      condition: condition.length ? condition : undefined,
      receivedAt: new Date(receivedAt),
      photosBefore: photosBefore.length ? photosBefore : undefined,
      price: price ? Number(price) : undefined,
      updatedAt: now,
    }

    try {
      if (isEdit) {
        await db.transaction('rw', [db.knives, db.steels, db.sharpenings], async () => {
          const addIfMissing = async <T,>(value: string, existing: string[], add: (v: string) => Promise<T>) => {
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
          await db.sharpenings.update(Number(id), receptionFields)
        })
        trackSharpening(receptionFields as Parameters<typeof trackSharpening>[0])
        if (opts.voiceTriggered) showToast('Заточка сохранена')
        navigate(`/sharpenings/${id}`, { replace: true })
      } else {
        const acceptanceData = {
          ...receptionFields,
          angle: repeatAngle,
          stones: repeatStones.length ? repeatStones : undefined,
          status: 'accepted' as const,
        }
        const savedId = await db.transaction('rw', [db.knives, db.steels, db.stones, db.sharpenings], async () => {
          const addIfMissing = async <T,>(value: string, existing: string[], add: (v: string) => Promise<T>) => {
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
          if (repeatStones.length) {
            const existingStones = await db.stones.toArray()
            const existingKeys = new Set(existingStones.map(st => {
              if (st.gritMk) return `${st.brand.toLowerCase()} mk:${st.gritMk}`
              return `${st.brand.toLowerCase()} ${st.gritMicrons ?? st.gritFepa ?? st.gritJis ?? 0}`
            }))
            for (const stone of repeatStones) {
              const parsed = parseStoneName(stone.name)
              const key = parsed.gritMk
                ? `${parsed.brand.toLowerCase()} mk:${parsed.gritMk}`
                : `${parsed.brand.toLowerCase()} ${parsed.gritMicrons ?? parsed.gritFepa ?? parsed.gritJis ?? 0}`
              if (!existingKeys.has(key)) {
                const { brand, ...gritFields } = parsed
                await db.stones.add({ brand, ...gritFields, type: 'ao', isCustom: true, updatedAt: now })
                existingKeys.add(key)
              }
            }
          }
          return Number(await db.sharpenings.add(acceptanceData))
        })
        trackSharpening(acceptanceData as Parameters<typeof trackSharpening>[0])
        if (opts.voiceTriggered) showToast('Принято в заточку')
        // fromAcceptance: на Z-2 «назад» (верхняя и аппаратная) ведёт обратно на Z-1 этой заточки
        navigate(`/sharpenings/${savedId}`, { replace: true, state: { fromAcceptance: true } })
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
        <button className={s.backBtn} onClick={() => navigate(-1)}><IconChevronLeft /></button>
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

        {/* Фото «До» */}
        <div className={s.photoSection}>
          <span className={s.photoTitle}>
            Фото «До»{photosBefore.length > 0 ? ` · ${photosBefore.length} / ${PHOTO_LIMIT}` : ' (необязательно)'}
          </span>
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
            disabled={photosBefore.length >= PHOTO_LIMIT}
            onClick={() => setPickerOpen(true)}
          >
            <span className={s.photoAddIcon}><IconCamera /></span>
            {photosBefore.length >= PHOTO_LIMIT ? 'Лимит 5 фото достигнут' : 'Добавить фото'}
          </button>
        </div>

        <div className={s.actions}>
          {isEdit ? (
            <button className={s.primaryBtn} onClick={() => handleSave()} disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          ) : (
            <button className={s.primaryBtn} onClick={() => handleSave()} disabled={!canProceed || saving}>
              {saving ? 'Сохранение…' : 'Принять в заточку'}
            </button>
          )}
        </div>
      </div>

      {pickerOpen && (
        <PhotoSourceSheet
          onCamera={() => openCamera(b64 => setPhotosBefore(prev => [...prev, b64]))}
          onGallery={() => openGallery(b64 => setPhotosBefore(prev => [...prev, b64]))}
          onClose={() => setPickerOpen(false)}
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
