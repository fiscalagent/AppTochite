import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useLocation, useBlocker } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStone, type Stone, type GritSource, MK_VALUES, stoneDisplayName, compareStonesForSort } from '../../db/instance'
import { trackSharpening, track } from '../../services/analytics'
import { getCanInstall } from '../../utils/installPrompt'
import { isIosInstallable } from '../../utils/platform'
import { writeSentinel } from '../../utils/backup'
import { useAutoBackup } from '../../contexts/AutoBackupContext'
import { getAltGrits, fromFepa, fromJis, fromMk, fromMicrons } from '../../data/gritTable'
import { useToast } from '../../components/Toast/ToastContext'
import { useCamera } from '../../hooks/useCamera'
import StatusPill from '../../components/StatusPill/StatusPill'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import PhotoLightbox from '../../components/PhotoLightbox/PhotoLightbox'
import PhotoReportSheet from '../../components/PhotoReport/PhotoReportSheet'
import PhotoShareSheet, { type SharePhoto } from '../../components/PhotoShare/PhotoShareSheet'
import PhotoSourceSheet from '../../components/PhotoSourceSheet/PhotoSourceSheet'
import Autocomplete from '../../components/Autocomplete/Autocomplete'
import { useDictationMode, type DictationErrorCode, type AutoStopReason } from '../../hooks/useDictationMode'
import { findAllMatches, pickFromFiltered } from '../../utils/voiceMatch'
import type { Command, CommandContext, FieldKey } from '../../utils/voiceCommand'
import DictationButton from '../../components/DictationButton/DictationButton'
import DictationIndicator from '../../components/DictationIndicator/DictationIndicator'
import DictationCandidates from '../../components/DictationCandidates/DictationCandidates'
import { isVoiceEnabled } from '../../config/features'
import { startBlur } from '../../utils/modalBlur'
import { softDeleteSharpening } from '../../utils/trash'
import { useLocale, enumLabel, fmtMoney, fmtDateLong, type Locale } from '../../i18n'
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

const IconCamera = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

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

const PHOTO_LIMIT = 5
const ANGLE_MIN = 1
const ANGLE_MAX = 45
const SLIDER_MIN = 10 // нижняя граница ползунка и шкалы (рабочий диапазон углов)
const MICROBEVEL_DELTA = 2 // микроподвод по умолчанию = основной угол + 2°
const ANGLE_SCALE = [10, 15, 20, 25, 30, 35, 40, 45] // деления едва заметной шкалы

// Горизонтальный ползунок угла (шаг 0,1°) с едва заметной шкалой 10–45°.
// Управляет тем же строковым значением, что и number-инпут над ним.
function AngleSlider({ value, onChange, ariaLabel }: {
  value: string
  onChange: (v: string) => void
  ariaLabel: string
}) {
  return (
    <div className={s.angleSliderWrap}>
      <input
        className={s.angleSlider}
        type="range"
        min={SLIDER_MIN}
        max={ANGLE_MAX}
        step={0.1}
        value={value === '' ? SLIDER_MIN : value}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
      <div className={s.angleScale} aria-hidden="true">
        {ANGLE_SCALE.map(tick => (
          <span key={tick} className={s.angleTick}>
            <span className={s.angleTickMark} />
            <span className={s.angleTickLabel}>{tick}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function formatDate(date: Date | string, locale: Locale) {
  return fmtDateLong(locale, date)
}

export default function SharpeningDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const sharpeningId = Number(id)
  const { showToast, setRaisedMode } = useToast()
  const { requestBackup } = useAutoBackup()
  const { t, locale } = useLocale()
  const { openCamera, openGallery } = useCamera()

  // Пришли сюда сразу после «Принять в заточку» (Z-1 → Z-2)?
  // Тогда «назад» (верхняя ◀ и аппаратная) ведёт на Z-1 этой заточки, а не на список.
  const [fromAcceptance] = useState(() =>
    Boolean((location.state as { fromAcceptance?: boolean } | null)?.fromAcceptance)
  )

  function goBack() {
    if (fromAcceptance) navigate(`/sharpenings/${sharpeningId}/edit`, { replace: true })
    else navigate(-1)
  }

  // Перехват аппаратной «назад» (POP) в потоке приёмки → редирект на Z-1.
  // leavingRef: пропускаем перехват, когда уходим намеренно (например, после удаления записи).
  const leavingRef = useRef(false)
  const blocker = useBlocker(
    ({ historyAction }) => fromAcceptance && historyAction === 'POP' && !leavingRef.current
  )
  useEffect(() => {
    if (blocker.state === 'blocked') {
      navigate(`/sharpenings/${sharpeningId}/edit`, { replace: true })
    }
  }, [blocker.state, sharpeningId, navigate])

  // Overlay/modal state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const [photoReportOpen, setPhotoReportOpen] = useState(false)
  const [photoShareOpen, setPhotoShareOpen] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Editable sharpening fields
  const [angle, setAngle] = useState('')
  const [microbevel, setMicrobevel] = useState(false)
  const [microbevelAngle, setMicrobevelAngle] = useState('')
  const [selectedStones, setSelectedStones] = useState<SharpeningStone[]>([])
  const [stoneInput, setStoneInput] = useState('')
  const [comment, setComment] = useState('')
  const [photosAfter, setPhotosAfter] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // New stone modal
  const [newStoneOpen, setNewStoneOpen] = useState(false)
  const [newStoneBrand, setNewStoneBrand] = useState('')
  const [newStoneGritSource, setNewStoneGritSource] = useState<GritSource | ''>('')
  const [newStoneGritVal, setNewStoneGritVal] = useState('')
  const [newStoneGritMk, setNewStoneGritMk] = useState('')
  const [newStoneType, setNewStoneType] = useState<Stone['type'] | ''>('')
  // Режим «уточнения»: модалка редактирует уже созданный камень справочника,
  // а не добавляет новый. refineFromName — текущее имя камня в этой заточке (для переименования тега).
  const [editingStoneId, setEditingStoneId] = useState<number | null>(null)
  const [refineFromName, setRefineFromName] = useState('')

  // Dictation (Z-2: angle / stones / comment)
  const dictation = useDictationMode(locale)
  const [awaitingListField, setAwaitingListField] = useState<FieldKey | null>(null)
  const [awaitingCancelConfirm, setAwaitingCancelConfirm] = useState(false)
  const [dictationCandidates, setDictationCandidates] = useState<{ field: FieldKey; items: string[] } | null>(null)
  const stepRef = useRef<1 | 2>(2)
  const awaitingListFieldRef = useRef<FieldKey | null>(null)
  const awaitingCancelConfirmRef = useRef(false)
  const lastRawRef = useRef('')
  const stoneInputRef = useRef('')
  const selectedStonesRef = useRef<SharpeningStone[]>([])
  const cancelTimerRef = useRef<number | null>(null)
  useEffect(() => { awaitingListFieldRef.current = awaitingListField }, [awaitingListField])
  useEffect(() => { awaitingCancelConfirmRef.current = awaitingCancelConfirm }, [awaitingCancelConfirm])

  // ?? null: get() для отсутствующей записи отдаёт undefined — неотличимо от
  // «ещё грузится». null явно означает «записи нет» и включает ветку not-found.
  const sh = useLiveQuery(async () => (await db.sharpenings.get(sharpeningId)) ?? null, [sharpeningId])
  const client = useLiveQuery(
    () => sh ? db.clients.get(sh.clientId) : undefined,
    [sh?.clientId]
  )
  const stoneSuggestions = useLiveQuery(async () => {
    const items = await db.stones.toArray().then(arr => arr.sort(compareStonesForSort))
    return items.map(st => stoneDisplayName(st))
  }, []) ?? []

  // Initialise editable state once from DB (guard prevents resetting user edits on live-query refires)
  const initialized = useRef(false)
  useEffect(() => { initialized.current = false }, [sharpeningId])
  useEffect(() => {
    if (!sh || initialized.current) return
    setAngle(sh.angle != null ? String(sh.angle) : '')
    setMicrobevel(sh.microbevelAngle != null)
    setMicrobevelAngle(sh.microbevelAngle != null ? String(sh.microbevelAngle) : '')
    setSelectedStones(sh.stones ?? [])
    setComment(sh.comment ?? '')
    setPhotosAfter(sh.photosAfter ?? [])
    initialized.current = true
  }, [sh])

  useEffect(() => { stoneInputRef.current = stoneInput }, [stoneInput])
  useEffect(() => { selectedStonesRef.current = selectedStones }, [selectedStones])

  useEffect(() => {
    setRaisedMode(dictation.isActive)
    return () => setRaisedMode(false)
  }, [dictation.isActive, setRaisedMode])

  useEffect(() => {
    return () => {
      if (cancelTimerRef.current !== null) clearTimeout(cancelTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!newStoneOpen) return
    return startBlur()
  }, [newStoneOpen])

  function addStone(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (selectedStones.find(st => st.name.toLowerCase() === trimmed.toLowerCase())) return
    setSelectedStones(prev => [...prev, { name: trimmed, order: prev.length + 1 }])
    setStoneInput('')
    // Новый камень — заодно заводим его в справочник, чтобы он стал «моим».
    void ensureStoneInReference(trimmed)
  }

  function renameStone(from: string, to: string) {
    if (from === to) return
    setSelectedStones(prev => prev.map(st => (st.name === from ? { ...st, name: to } : st)))
  }

  // Если камня с таким именем нет в справочнике — создаём его (бренд + распознанная
  // из имени гритность), нормализуем тег к каноничному имени и предлагаем уточнить тип/гритность.
  async function ensureStoneInReference(typedName: string) {
    const trimmed = typedName.trim()
    if (!trimmed) return
    const all = await db.stones.toArray()
    if (all.some(st => stoneDisplayName(st).toLowerCase() === trimmed.toLowerCase())) return
    const { brand, ...gritFields } = parseStoneName(trimmed)
    const stone: Stone = {
      brand: brand.trim(),
      ...gritFields,
      isCustom: true,
      updatedAt: new Date(),
    }
    let newId: number
    try {
      newId = (await db.stones.add(stone)) as number
    } catch {
      return // справочник не записался — работу не прерываем
    }
    const display = stoneDisplayName(stone)
    renameStone(trimmed, display)
    showToast(t.sharpening.stoneAutoAdded(display), {
      label: t.sharpening.refineStone,
      onClick: () => openRefineStone(newId, stone),
    })
  }

  function openRefineStone(id: number, stone: Stone) {
    setEditingStoneId(id)
    setRefineFromName(stoneDisplayName(stone))
    setNewStoneBrand(stone.brand)
    setNewStoneGritVal('')
    setNewStoneGritMk('')
    switch (stone.gritSource) {
      case 'mk': setNewStoneGritSource('mk'); setNewStoneGritMk(stone.gritMk ?? ''); break
      case 'fepa': setNewStoneGritSource('fepa'); setNewStoneGritVal(stone.gritFepa != null ? String(stone.gritFepa) : ''); break
      case 'jis': setNewStoneGritSource('jis'); setNewStoneGritVal(stone.gritJis != null ? String(stone.gritJis) : ''); break
      case 'microns': setNewStoneGritSource('microns'); setNewStoneGritVal(stone.gritMicrons != null ? String(stone.gritMicrons) : ''); break
      default: setNewStoneGritSource('')
    }
    setNewStoneType(stone.type ?? '')
    setNewStoneOpen(true)
  }

  function closeNewStone() {
    setNewStoneOpen(false)
    setEditingStoneId(null)
    setRefineFromName('')
    setNewStoneBrand('')
    setNewStoneGritSource('')
    setNewStoneGritVal('')
    setNewStoneGritMk('')
    setNewStoneType('')
  }

  function removeStone(index: number) {
    setSelectedStones(prev =>
      prev.filter((_, i) => i !== index).map((st, i) => ({ ...st, order: i + 1 }))
    )
  }

  function toggleMicrobevel(on: boolean) {
    setMicrobevel(on)
    // При включении подставляем основной угол + 2° (значение редактируется вручную).
    if (on && !microbevelAngle && angle) {
      const base = Number(angle)
      if (!Number.isNaN(base)) setMicrobevelAngle(String(base + MICROBEVEL_DELTA))
    }
  }

  async function saveNewStone() {
    if (!newStoneBrand.trim()) return
    let gritFields: ReturnType<typeof fromFepa> | Record<string, never> = {}
    if (newStoneGritSource === 'fepa' && newStoneGritVal) gritFields = fromFepa(Number(newStoneGritVal))
    else if (newStoneGritSource === 'jis' && newStoneGritVal) gritFields = fromJis(Number(newStoneGritVal))
    else if (newStoneGritSource === 'microns' && newStoneGritVal) gritFields = fromMicrons(Number(newStoneGritVal))
    else if (newStoneGritSource === 'mk' && newStoneGritMk) gritFields = fromMk(newStoneGritMk)
    // Явные undefined-дефолты, чтобы при уточнении update мог СБРОСИТЬ ранее распознанную гритность.
    const stone: Stone = {
      brand: newStoneBrand.trim(),
      gritFepa: undefined,
      gritJis: undefined,
      gritMicrons: undefined,
      gritMk: undefined,
      gritSource: undefined,
      ...gritFields,
      type: newStoneType || undefined,
      isCustom: true,
      updatedAt: new Date(),
    }
    if (editingStoneId != null) {
      // Уточнение уже созданного камня: обновляем запись и переименовываем тег в заточке.
      try {
        await db.stones.update(editingStoneId, stone)
      } catch {
        showToast(t.sharpening.voice.stoneSaveFailed)
        return
      }
      const display = stoneDisplayName({ ...stone, id: editingStoneId })
      renameStone(refineFromName, display)
      showToast(t.sharpening.stoneAdded(display))
      closeNewStone()
      return
    }
    try {
      await db.stones.add(stone)
    } catch {
      showToast(t.sharpening.voice.stoneSaveFailed)
      return
    }
    const displayName = stoneDisplayName(stone)
    addStone(displayName)
    showToast(t.sharpening.stoneAdded(displayName))
    closeNewStone()
  }

  // ─── Dictation command handling ───────────────────────────────────────────
  const getDictationContext = (): CommandContext => ({
    step: stepRef.current,
    awaitingListField: awaitingListFieldRef.current,
    awaitingCancelConfirm: awaitingCancelConfirmRef.current,
  })

  function fieldLabel(f: FieldKey): string {
    if (f === 'notes') return t.sharpening.commentLabel
    return t.sharpening.fieldLabels[f] ?? f
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
    if (!silent) showToast(t.sharpening.voice.cancelReset)
  }

  function armCancelConfirm() {
    if (cancelTimerRef.current !== null) clearTimeout(cancelTimerRef.current)
    setAwaitingCancelConfirm(true)
    awaitingCancelConfirmRef.current = true
    cancelTimerRef.current = window.setTimeout(() => {
      cancelTimerRef.current = null
      setAwaitingCancelConfirm(false)
      awaitingCancelConfirmRef.current = false
      showToast(t.sharpening.voice.cancelReset)
    }, 5000)
    showToast(t.sharpening.voice.cancelConfirm)
  }

  function dispatchStone(value: string) {
    if (!value.trim() || stoneSuggestions.length === 0) {
      showToast(t.sharpening.voice.stoneNotFound)
      return
    }
    const all = findAllMatches(value, stoneSuggestions, 30)
    if (all.length === 1) {
      setStoneInput(all[0])
      closeDictationList()
      showToast(t.sharpening.voice.fieldSet(fieldLabel('stone'), all[0]))
      return
    }
    if (all.length > 1) {
      setDictationCandidates({ field: 'stone', items: all })
      setAwaitingListField('stone')
      showToast(t.sharpening.voice.clarifyStone)
      return
    }
    showToast(t.sharpening.voice.stoneNotFound)
  }

  function applyFieldCommand(field: FieldKey, value: string) {
    switch (field) {
      case 'stone': dispatchStone(value); return
      case 'angle': setAngle(value); showToast(t.sharpening.voice.fieldSet(fieldLabel('angle'), value)); return
      case 'notes':
        setComment(prev => prev ? `${prev} ${value}` : value)
        showToast(t.sharpening.voice.commentAppended)
        return
      case 'price': showToast(t.sharpening.voice.priceOnAcceptance); return
      default: showToast(t.sharpening.voice.fieldOnAcceptance(fieldLabel(field))); return
    }
  }

  function handlePickFromList(hint: string) {
    const list = dictationCandidates
    const field = awaitingListField
    if (!list || !field) return
    const picked = pickFromFiltered(hint, list.items)
    if (!picked) return
    if (field === 'stone') setStoneInput(picked)
    closeDictationList()
    showToast(t.sharpening.voice.fieldSet(fieldLabel(field), picked))
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
        addStone(stoneInputRef.current)
        return
      case 'removeLastStone':
        if (selectedStonesRef.current.length === 0) {
          showToast(t.sharpening.voice.noStones)
          return
        }
        removeStone(selectedStonesRef.current.length - 1)
        showToast(t.sharpening.voice.lastStoneRemoved)
        return
      case 'clear':
        switch (cmd.field) {
          case 'stone': setStoneInput(''); break
          case 'angle': setAngle(''); break
          case 'notes': setComment(''); break
          default: showToast(t.sharpening.voice.fieldOnAcceptance(fieldLabel(cmd.field))); return
        }
        closeDictationList()
        showToast(t.sharpening.voice.fieldClear(fieldLabel(cmd.field)))
        return
      case 'nav':
        if (cmd.action === 'next' || cmd.action === 'prev') {
          showToast(t.sharpening.voice.noSteps)
          return
        }
        armCancelConfirm()
        return
      case 'submit':
        dictation.stop()
        if (cmd.markDone && sh?.status === 'accepted') handleMarkDone()
        else handleSave()
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
        showToast(t.sharpening.voice.heard(lastRawRef.current))
        return
      case 'unknown':
        showToast(t.sharpening.voice.notUnderstood(raw))
        return
    }
  }

  function handleDictationListenError(_code: DictationErrorCode) {
    // Тихо — счётчик в хуке сам остановит после 3 подряд.
  }

  function handleDictationAutoStop(reason: AutoStopReason) {
    if (reason === 'errors') showToast(t.sharpening.voice.micErrors)
    else if (reason === 'fatal') showToast(t.sharpening.voice.micFatal)
    else if (reason === 'unavailable') showToast(t.components.voiceOffline)
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

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await db.sharpenings.update(sharpeningId, {
        angle: angle ? Number(angle) : undefined,
        microbevelAngle: microbevel && microbevelAngle ? Number(microbevelAngle) : undefined,
        stones: selectedStones.length ? selectedStones : undefined,
        comment: comment.trim() || undefined,
        photosAfter: photosAfter.length ? photosAfter : undefined,
        updatedAt: new Date(),
      })
      showToast(t.sharpening.saved)
    } catch {
      showToast(t.sharpening.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkDone() {
    if (saving) return
    setSaving(true)
    try {
      const doneAt = new Date()
      const updatedFields = {
        angle: angle ? Number(angle) : undefined,
        microbevelAngle: microbevel && microbevelAngle ? Number(microbevelAngle) : undefined,
        stones: selectedStones.length ? selectedStones : undefined,
        comment: comment.trim() || undefined,
        photosAfter: photosAfter.length ? photosAfter : undefined,
        status: 'done' as const,
        doneAt,
        updatedAt: doneAt,
      }
      await db.sharpenings.update(sharpeningId, updatedFields)
      if (sh) trackSharpening({ ...sh, ...updatedFields }).catch(() => {})
      // Дублируем ключевое событие в events (в raw остаётся детальная запись).
      track('sharpening_done', {
        stoneCount: selectedStones.length,
        hasAngle: !!angle,
        hasPhotosAfter: photosAfter.length > 0,
      }).catch(() => {})
      // Немедленный бэкап (обходит дебаунс) — «готово» естественный чекпоинт:
      // данные точно изменились, а pagehide на закрытии не гарантирует запись
      // папочного/native-бэкапа до выгрузки страницы.
      requestBackup()
      writeSentinel(db).catch(() => {})
      // Момент ценности: только что записали заточку → предлагаем поставить PWA.
      // Один раз за всё время; для Android/Ya — системный промпт, для iOS — инструкция.
      if ((getCanInstall() || isIosInstallable()) && localStorage.getItem('installNudgeSeen') == null) {
        localStorage.setItem('installNudgeSeen', 'pending')
        window.dispatchEvent(new Event('apptochite:install-nudge'))
      }
      navigate('/')
    } catch {
      showToast(t.sharpening.saveError)
      setSaving(false)
    }
  }

  async function handleRemovePhotoBefore(index: number) {
    const updated = (sh?.photosBefore ?? []).filter((_, i) => i !== index)
    await db.sharpenings.update(sharpeningId, {
      photosBefore: updated.length ? updated : undefined,
      updatedAt: new Date(),
    })
  }

  async function handleDelete() {
    if (leavingRef.current) return
    leavingRef.current = true
    await softDeleteSharpening(db, sharpeningId)
    showToast(t.sharpening.movedToTrash)
    navigate(-1)
  }

  if (sh === undefined) return null
  if (sh === null || sh.deletedAt) return (
    <div style={{ padding: 16, color: 'var(--text-300)' }}>{t.sharpening.notFound}</div>
  )

  const isCoverAfter = photosAfter.length > 0
  const sharePhotos: SharePhoto[] = [
    ...(sh.photosBefore ?? []).map(b64 => ({ b64, label: t.sharpening.photoBeforeBadge })),
    ...photosAfter.map(b64 => ({ b64, label: t.sharpening.photoAfterBadge })),
  ]
  const hasPhotos = (sh.photosBefore?.length ?? 0) > 0 || photosAfter.length > 0

  return (
    <div className={s.screen}>
      {/* Header */}
      <div className={s.header}>
        <button className={s.backBtn} onClick={goBack}><IconChevronLeft /></button>
        <span className={s.headerTitle}>{sh.knifeBrand.toUpperCase()}</span>
        {isVoiceEnabled() && (
          <DictationButton
            isAvailable={dictation.isAvailable}
            isActive={dictation.isActive}
            onToggle={toggleDictation}
          />
        )}
        <Link to={`/sharpenings/${sharpeningId}/edit`}>
          <button className={s.editBtn}>{t.sharpening.editBtn}</button>
        </Link>
      </div>

      {dictation.isActive && (
        <DictationIndicator lastTranscript={dictation.lastTranscript} />
      )}

      {dictationCandidates && (
        <DictationCandidates
          label={fieldLabel(dictationCandidates.field).toLowerCase()}
          items={dictationCandidates.items}
          onPick={(item) => {
            if (dictationCandidates.field === 'stone') setStoneInput(item)
            closeDictationList()
            showToast(`${fieldLabel(dictationCandidates.field)}: ${item}`)
          }}
          onClose={closeDictationList}
        />
      )}

      {/* Status + price */}
      <div className={s.statusRow}>
        <div className={s.statusInfo}>
          <StatusPill status={sh.status} />
          <span className={s.statusDate}>
            {t.sharpening.acceptedAt(formatDate(sh.receivedAt, locale))}
            {sh.doneAt && t.sharpening.doneAtSuffix(formatDate(sh.doneAt, locale))}
          </span>
        </div>
        {sh.price != null && (
          <span className={s.price}>{fmtMoney(locale, sh.price)}</span>
        )}
      </div>

      {/* Client link */}
      {client && !client.isSelf && (
        <Link to={`/clients/${client.id}`} className={s.clientLink}>
          <span className={s.clientLinkIcon}><IconPerson /></span>
          <span>{client.name}</span>
          <span className={s.clientLinkArrow}><IconChevronRight /></span>
        </Link>
      )}

      {/* Knife info — read-only */}
      <div className={s.card}>
        <div className={s.sectionTitle}>{t.sharpening.knifeSection}</div>
        <div className={s.row}>
          <span className={s.rowLabel}>{t.sharpening.brandLabel}</span>
          <span className={s.rowValue}>{sh.knifeBrand}</span>
        </div>
        {sh.steel && (
          <div className={s.row}>
            <span className={s.rowLabel}>{t.sharpening.steelLabel}</span>
            <span className={s.rowValue}>{sh.steel}{sh.hrc ? ` · ${sh.hrc} HRC` : ''}</span>
          </div>
        )}
        {sh.condition && sh.condition.length > 0 && (
          <>
            <div className={s.divider} />
            <div>
              <div className={s.sectionTitle}>{t.sharpening.conditionSection}</div>
              <div className={s.chips}>
                {sh.condition.map(c => (
                  <span key={c} className={s.chip}>{enumLabel(t.enums.condition, c)}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Photos before — read-only */}
      {sh.photosBefore && sh.photosBefore.length > 0 && (
        <div className={s.card}>
          <div className={s.photoSection}>
            <div className={s.photoSectionTitle}>{t.sharpening.photoBefore}</div>
            <div className={s.photoScroll}>
              {sh.photosBefore.map((src, i) => {
                const isCover = !isCoverAfter && i === 0
                return (
                  <div key={i} className={s.photoWrapper}>
                    <img
                      src={src}
                      className={`${s.photoImg} ${isCover ? s.photoImgCover : ''}`}
                      alt=""
                      onClick={() => setLightbox({ photos: sh.photosBefore!, index: i })}
                    />
                    {isCover && <span className={s.coverBadge}>{t.sharpening.cover}</span>}
                    <button className={s.photoRemove} onClick={() => handleRemovePhotoBefore(i)}>×</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sharpening fields — inline editable */}
      <div className={s.sharpeningForm}>
        <div className={s.field}>
          <label className={s.fieldLabel}>{t.sharpening.angleLabel}</label>
          <input
            className={s.angleNumber}
            value={angle}
            onChange={e => setAngle(e.target.value)}
            placeholder={t.sharpening.anglePlaceholder}
            type="number"
            min={ANGLE_MIN}
            max={ANGLE_MAX}
            step={0.1}
          />
          <AngleSlider value={angle} onChange={setAngle} ariaLabel={t.sharpening.angleLabel} />
          <label className={s.microbevelToggle}>
            <input
              type="checkbox"
              checked={microbevel}
              onChange={e => toggleMicrobevel(e.target.checked)}
            />
            <span className={s.fieldLabel}>{t.sharpening.microbevelToggle}</span>
          </label>
          {microbevel && (
            <>
              <input
                className={s.angleNumber}
                value={microbevelAngle}
                onChange={e => setMicrobevelAngle(e.target.value)}
                placeholder={t.sharpening.microbevelPlaceholder}
                type="number"
                min={ANGLE_MIN}
                max={ANGLE_MAX}
                step={0.1}
                aria-label={t.sharpening.microbevelLabel}
              />
              <AngleSlider value={microbevelAngle} onChange={setMicrobevelAngle} ariaLabel={t.sharpening.microbevelLabel} />
            </>
          )}
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>{t.sharpening.stonesLabel}</label>
          {selectedStones.length > 0 && (
            <div className={s.stoneTags}>
              {selectedStones.map((ss, i) => {
                const parsed = parseStoneName(ss.name)
                const alts = getAltGrits(parsed)
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
              placeholder={t.sharpening.stonePlaceholder}
            />
            <button
              className={s.stoneAddBtn}
              onClick={() => addStone(stoneInput)}
              disabled={!stoneInput.trim()}
            >+</button>
          </div>
          {!newStoneOpen && (
            <button className={s.newStoneToggle} onClick={() => setNewStoneOpen(true)}>
              {t.sharpening.createNewStone}
            </button>
          )}
          {newStoneOpen && createPortal(
            <div
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'var(--space-4)' }}
              onClick={closeNewStone}
            >
            <div style={{ width:'100%', background:'var(--bg-100)', borderRadius:'var(--radius-lg)', maxHeight:'92vh', overflowY:'auto', padding:'var(--space-4)', display:'flex', flexDirection:'column', gap:'var(--space-2)' }}
              onClick={e => e.stopPropagation()}
            >
            <span className={s.newStoneTitle}>{editingStoneId != null ? t.sharpening.refineStoneTitle : t.sharpening.newStoneTitle}</span>
              <input
                value={newStoneBrand}
                onChange={e => setNewStoneBrand(e.target.value)}
                placeholder={t.sharpening.brandPlaceholder}
                autoFocus
              />
              <div className={s.gritUnitRow}>
                {(['', 'fepa', 'jis', 'microns', 'mk'] as const).map(u => (
                  <button
                    key={u || 'none'}
                    className={`${s.gritUnitBtn} ${newStoneGritSource === u ? s.gritUnitActive : ''}`}
                    onClick={() => { setNewStoneGritSource(u); setNewStoneGritVal(''); setNewStoneGritMk('') }}
                  >
                    {u === '' ? t.sharpening.gritNone : u === 'mk' ? 'мк' : u === 'microns' ? 'мкм' : u.toUpperCase()}
                  </button>
                ))}
              </div>
              {(newStoneGritSource === 'fepa' || newStoneGritSource === 'jis' || newStoneGritSource === 'microns') && (
                <input
                  value={newStoneGritVal}
                  onChange={e => setNewStoneGritVal(e.target.value)}
                  placeholder={newStoneGritSource === 'microns' ? t.sharpening.micronsHint : t.sharpening.gritHint(newStoneGritSource.toUpperCase())}
                  type="number"
                  min={1}
                />
              )}
              {newStoneGritSource === 'mk' && (
                <select
                  className={s.select}
                  value={newStoneGritMk}
                  onChange={e => setNewStoneGritMk(e.target.value)}
                >
                  <option value="">{t.sharpening.selectMk}</option>
                  {MK_VALUES.map(v => <option key={v} value={v}>{v} мк</option>)}
                </select>
              )}
              <div className={s.newStoneRow}>
                <select
                  className={s.select}
                  value={newStoneType}
                  onChange={e => setNewStoneType(e.target.value as Stone['type'] | '')}
                >
                  <option value="" disabled>{t.reference.selectTypePlaceholder}</option>
                  {Object.entries(t.enums.stoneType).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={s.newStoneRow}>
                <button className={s.newStoneSaveBtn} onClick={saveNewStone} disabled={!newStoneBrand.trim()}>{editingStoneId != null ? t.common.save : t.common.add}</button>
                <button className={s.newStoneCancelBtn} onClick={closeNewStone}>{t.common.cancel}</button>
              </div>
            </div>
            </div>,
            document.body
          )}
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>{t.sharpening.commentLabel}</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t.sharpening.commentPlaceholder}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Photos after */}
        <div className={s.photoSectionEditable}>
          <span className={s.photoTitle}>
            {t.sharpening.photoAfter}{photosAfter.length > 0 ? t.sharpening.photoCount(photosAfter.length, PHOTO_LIMIT) : t.sharpening.photoOptional}
          </span>
          {photosAfter.length > 0 && (
            <div className={s.photoThumbs}>
              {photosAfter.map((src, i) => (
                <div key={i} className={`${s.photoThumb} ${i === 0 ? s.photoThumbCover : ''}`}>
                  <img
                    src={src}
                    alt=""
                    onClick={() => setLightbox({ photos: photosAfter, index: i })}
                  />
                  {i === 0 && <span className={s.coverBadge}>{t.sharpening.cover}</span>}
                  <button
                    className={s.photoRemoveSm}
                    onClick={() => setPhotosAfter(prev => prev.filter((_, j) => j !== i))}
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <button
            className={s.photoAddBtn}
            disabled={photosAfter.length >= PHOTO_LIMIT}
            onClick={() => setPickerOpen(true)}
          >
            <span className={s.photoAddIcon}><IconCamera /></span>
            {photosAfter.length >= PHOTO_LIMIT ? t.sharpening.photoLimit : t.sharpening.addPhoto}
          </button>
        </div>

        {/* Action buttons */}
        <div className={s.actionBtns}>
          {sh.status === 'accepted' ? (
            <div className={s.btnRow}>
              <button className={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? '…' : t.common.save}
              </button>
              <button className={s.doneBtn} onClick={handleMarkDone} disabled={saving}>
                {saving ? '…' : t.sharpening.markDone}
              </button>
            </div>
          ) : (
            <button className={s.saveBtn} onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
              {saving ? t.sharpening.saving : t.common.save}
            </button>
          )}
        </div>
      </div>

      {/* Share */}
      {hasPhotos && (
        <button className={s.reportBtn} onClick={() => setShareMenuOpen(true)}>
          {t.sharpening.sharePhoto}
        </button>
      )}

      <button
        className={s.repeatBtn}
        onClick={() => navigate('/sharpenings/new', { state: { repeat: sh } })}
      >
        {t.sharpening.repeat}
      </button>

      <button className={s.deleteBtn} onClick={() => setConfirmOpen(true)}>
        {t.sharpening.deleteSharpening}
      </button>

      <ConfirmModal
        isOpen={confirmOpen}
        title={t.sharpening.deleteTitle}
        message={t.sharpening.deleteMessage}
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

      {pickerOpen && (
        <PhotoSourceSheet
          onCamera={() => openCamera(b64 => { setPhotosAfter(prev => [...prev, b64]); track('photo_added', { phase: 'after', source: 'camera' }).catch(() => {}) })}
          onGallery={() => openGallery(b64 => { setPhotosAfter(prev => [...prev, b64]); track('photo_added', { phase: 'after', source: 'gallery' }).catch(() => {}) })}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {shareMenuOpen && (
        <div className={s.photoModalOverlay} onClick={() => setShareMenuOpen(false)}>
          <div className={s.photoModalSheet} onClick={e => e.stopPropagation()}>
            <div className={s.handle} />
            <button
              className={s.shareOption}
              onClick={() => { setShareMenuOpen(false); setPhotoShareOpen(true) }}
            >
              {t.sharpening.sendPhotos}
            </button>
            <button
              className={`${s.shareOption} ${!photosAfter.length ? s.shareOptionDisabled : ''}`}
              disabled={!photosAfter.length}
              onClick={() => { setShareMenuOpen(false); setPhotoReportOpen(true) }}
            >
              {t.sharpening.photoReport}
            </button>
            <button className={s.photoModalSkipBtn} onClick={() => setShareMenuOpen(false)}>
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      {photoReportOpen && photosAfter.length > 0 && (
        <PhotoReportSheet
          photos={photosAfter}
          sharpening={sh}
          onClose={() => setPhotoReportOpen(false)}
        />
      )}

      {photoShareOpen && (
        <PhotoShareSheet
          photos={sharePhotos}
          onClose={() => setPhotoShareOpen(false)}
        />
      )}
    </div>
  )
}
