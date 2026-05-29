import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useLocation, useBlocker } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStone, type Stone, type GritSource, MK_VALUES, stoneDisplayName, compareStonesForSort } from '../../db/instance'
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

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function SharpeningDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const sharpeningId = Number(id)
  const { showToast, setRaisedMode } = useToast()
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

  // Dictation (Z-2: angle / stones / comment)
  const dictation = useDictationMode()
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

  const sh = useLiveQuery(() => db.sharpenings.get(sharpeningId), [sharpeningId])
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
  }, [dictation.isActive])

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
  }

  function removeStone(index: number) {
    setSelectedStones(prev =>
      prev.filter((_, i) => i !== index).map((st, i) => ({ ...st, order: i + 1 }))
    )
  }

  async function saveNewStone() {
    if (!newStoneBrand.trim()) return
    let gritFields: ReturnType<typeof fromFepa> | Record<string, never> = {}
    if (newStoneGritSource === 'fepa' && newStoneGritVal) gritFields = fromFepa(Number(newStoneGritVal))
    else if (newStoneGritSource === 'jis' && newStoneGritVal) gritFields = fromJis(Number(newStoneGritVal))
    else if (newStoneGritSource === 'microns' && newStoneGritVal) gritFields = fromMicrons(Number(newStoneGritVal))
    else if (newStoneGritSource === 'mk' && newStoneGritMk) gritFields = fromMk(newStoneGritMk)
    const stone: Stone = {
      brand: newStoneBrand.trim(),
      ...gritFields,
      type: newStoneType || undefined,
      isCustom: true,
      updatedAt: new Date(),
    }
    try {
      await db.stones.add(stone)
    } catch {
      showToast('Не удалось сохранить камень')
      return
    }
    const displayName = stoneDisplayName(stone)
    addStone(displayName)
    showToast(`Камень добавлен: ${displayName}`)
    setNewStoneBrand('')
    setNewStoneGritSource('')
    setNewStoneGritVal('')
    setNewStoneGritMk('')
    setNewStoneType('')
    setNewStoneOpen(false)
  }

  // ─── Dictation command handling ───────────────────────────────────────────
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
      case 'notes': return 'Комментарий'
      case 'stone': return 'Камень'
      case 'angle': return 'Угол'
      case 'price': return 'Цена'
      case 'hrc': return 'HRC'
    }
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

  function dispatchStone(value: string) {
    if (!value.trim() || stoneSuggestions.length === 0) {
      showToast('Камень не найден')
      return
    }
    const all = findAllMatches(value, stoneSuggestions, 30)
    if (all.length === 1) {
      setStoneInput(all[0])
      closeDictationList()
      showToast(`Камень: ${all[0]}`)
      return
    }
    if (all.length > 1) {
      setDictationCandidates({ field: 'stone', items: all })
      setAwaitingListField('stone')
      showToast('Уточни камень')
      return
    }
    showToast('Камень не найден')
  }

  function applyFieldCommand(field: FieldKey, value: string) {
    switch (field) {
      case 'stone': dispatchStone(value); return
      case 'angle': setAngle(value); showToast(`Угол: ${value}`); return
      case 'notes':
        setComment(prev => prev ? `${prev} ${value}` : value)
        showToast('Дописано в комментарий')
        return
      case 'price': showToast('Цена — на экране приёмки'); return
      default: showToast(`${fieldLabel(field)} — на экране приёмки`); return
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
        addStone(stoneInputRef.current)
        return
      case 'removeLastStone':
        if (selectedStonesRef.current.length === 0) {
          showToast('Камней нет')
          return
        }
        removeStone(selectedStonesRef.current.length - 1)
        showToast('Последний камень удалён')
        return
      case 'clear':
        switch (cmd.field) {
          case 'stone': setStoneInput(''); break
          case 'angle': setAngle(''); break
          case 'notes': setComment(''); break
          default: showToast(`${fieldLabel(cmd.field)} — на экране приёмки`); return
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

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await db.sharpenings.update(sharpeningId, {
        angle: angle ? Number(angle) : undefined,
        stones: selectedStones.length ? selectedStones : undefined,
        comment: comment.trim() || undefined,
        photosAfter: photosAfter.length ? photosAfter : undefined,
        updatedAt: new Date(),
      })
      showToast('Сохранено')
    } catch {
      showToast('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkDone() {
    if (saving) return
    setSaving(true)
    try {
      await db.sharpenings.update(sharpeningId, {
        angle: angle ? Number(angle) : undefined,
        stones: selectedStones.length ? selectedStones : undefined,
        comment: comment.trim() || undefined,
        photosAfter: photosAfter.length ? photosAfter : undefined,
        status: 'done',
        doneAt: new Date(),
        updatedAt: new Date(),
      })
      navigate('/')
    } catch {
      showToast('Ошибка при сохранении')
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
    await softDeleteSharpening(db, sharpeningId)
    leavingRef.current = true
    navigate(-1)
  }

  if (sh === undefined) return null
  if (sh === null || sh.deletedAt) return (
    <div style={{ padding: 16, color: 'var(--text-300)' }}>Запись не найдена</div>
  )

  const isCoverAfter = photosAfter.length > 0
  const sharePhotos: SharePhoto[] = [
    ...(sh.photosBefore ?? []).map(b64 => ({ b64, label: 'До' })),
    ...photosAfter.map(b64 => ({ b64, label: 'После' })),
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
          <button className={s.editBtn}>Изменить</button>
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
            принят {formatDate(sh.receivedAt)}
            {sh.doneAt && ` · готов ${formatDate(sh.doneAt)}`}
          </span>
        </div>
        {sh.price != null && (
          <span className={s.price}>{sh.price} ₽</span>
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
              <div className={s.sectionTitle}>Состояние</div>
              <div className={s.chips}>
                {sh.condition.map(c => (
                  <span key={c} className={s.chip}>{c}</span>
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
            <div className={s.photoSectionTitle}>Фото «До»</div>
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
                    {isCover && <span className={s.coverBadge}>обложка</span>}
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
          <label className={s.fieldLabel}>Угол заточки, °</label>
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
          <label className={s.fieldLabel}>Камни</label>
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
              placeholder="Naniwa 1000, Shapton 2000..."
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
                {(['', 'fepa', 'jis', 'microns', 'mk'] as const).map(u => (
                  <button
                    key={u || 'none'}
                    className={`${s.gritUnitBtn} ${newStoneGritSource === u ? s.gritUnitActive : ''}`}
                    onClick={() => { setNewStoneGritSource(u); setNewStoneGritVal(''); setNewStoneGritMk('') }}
                  >
                    {u === '' ? 'нет' : u === 'mk' ? 'мк' : u === 'microns' ? 'мкм' : u.toUpperCase()}
                  </button>
                ))}
              </div>
              {(newStoneGritSource === 'fepa' || newStoneGritSource === 'jis' || newStoneGritSource === 'microns') && (
                <input
                  value={newStoneGritVal}
                  onChange={e => setNewStoneGritVal(e.target.value)}
                  placeholder={newStoneGritSource === 'microns' ? 'мкм, напр. 5' : `${newStoneGritSource.toUpperCase()}, напр. 1000`}
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
          <label className={s.fieldLabel}>Комментарий</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Особенности, замечания..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Photos after */}
        <div className={s.photoSectionEditable}>
          <span className={s.photoTitle}>
            Фото «После»{photosAfter.length > 0 ? ` · ${photosAfter.length} / ${PHOTO_LIMIT}` : ' (необязательно)'}
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
                  {i === 0 && <span className={s.coverBadge}>обложка</span>}
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
            {photosAfter.length >= PHOTO_LIMIT ? 'Лимит 5 фото достигнут' : 'Добавить фото'}
          </button>
        </div>

        {/* Action buttons */}
        <div className={s.actionBtns}>
          {sh.status === 'accepted' ? (
            <div className={s.btnRow}>
              <button className={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? '…' : 'Сохранить'}
              </button>
              <button className={s.doneBtn} onClick={handleMarkDone} disabled={saving}>
                {saving ? '…' : 'Готово'}
              </button>
            </div>
          ) : (
            <button className={s.saveBtn} onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          )}
        </div>
      </div>

      {/* Share */}
      {hasPhotos && (
        <button className={s.reportBtn} onClick={() => setShareMenuOpen(true)}>
          Поделиться фото
        </button>
      )}

      <button
        className={s.repeatBtn}
        onClick={() => navigate('/sharpenings/new', { state: { repeat: sh } })}
      >
        Повторить заточку
      </button>

      <button className={s.deleteBtn} onClick={() => setConfirmOpen(true)}>
        Удалить заточку
      </button>

      <ConfirmModal
        isOpen={confirmOpen}
        title="Удалить эту заточку?"
        message="Заточка попадёт в корзину и будет удалена навсегда через 3 дня."
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
          onCamera={() => openCamera(b64 => setPhotosAfter(prev => [...prev, b64]))}
          onGallery={() => openGallery(b64 => setPhotosAfter(prev => [...prev, b64]))}
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
              Отправить фотографии
            </button>
            <button
              className={`${s.shareOption} ${!photosAfter.length ? s.shareOptionDisabled : ''}`}
              disabled={!photosAfter.length}
              onClick={() => { setShareMenuOpen(false); setPhotoReportOpen(true) }}
            >
              Фотоотчёт
            </button>
            <button className={s.photoModalSkipBtn} onClick={() => setShareMenuOpen(false)}>
              Отмена
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
