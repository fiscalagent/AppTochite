import { useState, useRef, useEffect, useMemo, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Stone, type StoneCoolant, type GritSource, type Steel, type Knife, MK_VALUES, compareStonesForSort } from '../../db/instance'
import Autocomplete from '../../components/Autocomplete/Autocomplete'
import { useToast } from '../../components/Toast/ToastContext'
import { getGritDisplay, getGritSortValue, GRIT_TABLE, fromFepa, fromJis, fromMk, fromMicrons, type GritDisplayMode } from '../../data/gritTable'
import { buildCSV } from '../../utils/backup'
import { track } from '../../services/analytics'
import { normSteel } from '../../utils/steelMatch'
import { readSpreadsheet, detectColumns, extractRows, prepareImport, parseCsv, type ColumnMapping, type SkipReason, type PreparedKnife } from '../../utils/knifeImport'
import {
  steelRowsFromGrid, knifeRowsFromGrid, buildSteelsCSV, buildKnivesCSV, diffSteels, diffKnives,
  type RefSyncDiff, type ParsedSteelRow, type ParsedKnifeRow,
} from '../../utils/refSync'
import { startBlur } from '../../utils/modalBlur'
import { enumLabel, useT, useLocale, ru } from '../../i18n'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import s from './ReferenceScreen.module.css'
import AppLogo from '../../components/AppLogo/AppLogo'

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

type Tab = 'stones' | 'steels' | 'knives'

const TAB_VALUES: Tab[] = ['stones', 'steels', 'knives']

// Подписи типов абразива и СОЖ живут в словаре i18n (ru.enums) — единый источник.
// Здесь строим обратные карты «подпись → канонический ключ» для разбора русского
// CSV-формата и поиска по типу через `*`. CSV-формат и `*`-поиск завязаны на
// русские подписи независимо от языка интерфейса, поэтому источник — статический ru.
function invertLabels(map: Record<string, string>, exclude: readonly string[] = []): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, label] of Object.entries(map)) {
    if (exclude.includes(key)) continue
    out[label.toLowerCase()] = key
  }
  return out
}

// 'other' исключён намеренно — как и в прежней карте, «другой тип» из CSV не парсится.
const STONE_TYPE_BY_LABEL = invertLabels(ru.enums.stoneType, ['other'])
const COOLANT_BY_LABEL = invertLabels(ru.enums.coolant)

function SelectAllRow({
  total,
  selected,
  onSelectAll,
  onClearAll,
}: {
  total: number
  selected: number
  onSelectAll: () => void
  onClearAll: () => void
}) {
  const allSelected = total > 0 && selected === total
  const someSelected = selected > 0 && selected < total
  const t = useT()

  return (
    <div
      className={`${s.selectAllRow} ${allSelected ? s.selectAllRowActive : ''}`}
      onClick={allSelected ? onClearAll : onSelectAll}
    >
      <div className={`${s.checkbox} ${allSelected ? s.checkboxChecked : someSelected ? s.checkboxPartial : ''}`}>
        {allSelected && <span className={s.checkmark}><IconCheck /></span>}
        {someSelected && <span className={s.checkmark}>–</span>}
      </div>
      <span className={s.selectAllLabel}>
        {allSelected ? t.reference.deselectAll : t.reference.selectAll}
      </span>
      <span className={s.selectAllCount}>{t.reference.count(total)}</span>
    </div>
  )
}

function SelectionBar({
  count,
  onCancel,
  onDelete,
  onEdit,
}: {
  count: number
  onCancel: () => void
  onDelete: () => void
  onEdit?: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const t = useT()

  return (
    <div className={s.selectionBar}>
      {!confirm ? (
        <>
          <span className={s.selectionCount}>{t.reference.selected(count)}</span>
          <button className={s.cancelSelBtn} onClick={onCancel}>{t.common.cancel}</button>
          {count === 1 && onEdit && (
            <button className={s.editSelBtn} onClick={onEdit}>{t.reference.edit}</button>
          )}
          <button className={s.deleteSelBtn} onClick={() => setConfirm(true)}>
            {t.reference.deleteN(count)}
          </button>
        </>
      ) : (
        <>
          <span className={s.selectionCount}>{t.reference.confirmDelete}</span>
          <button className={s.cancelSelBtn} onClick={() => setConfirm(false)}>{t.reference.no}</button>
          <button className={s.deleteSelBtn} onClick={onDelete}>{t.reference.yes}</button>
        </>
      )}
    </div>
  )
}

// ─── Синхронизация справочника (сталь/ножи): превью add/update/delete ────────

function RefSyncPreviewDialog<E extends { id?: number }, R>({
  diff,
  renderAdd,
  renderExisting,
  renderUpdate,
  onCancel,
  onConfirm,
}: {
  diff: RefSyncDiff<E, R>
  renderAdd: (r: R) => string
  renderExisting: (e: E) => string
  renderUpdate: (before: E, patch: Partial<E>) => string
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useT()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const total = diff.toAdd.length + diff.toUpdate.length + diff.toDelete.length

  useEffect(() => startBlur(), [])

  function handleApply() {
    if (diff.toDelete.length > 0) { setConfirmDelete(true); return }
    onConfirm()
  }

  return createPortal(
    <div className={s.dialogOverlay} onClick={onCancel}>
      <div className={s.dialog} onClick={e => e.stopPropagation()}>
        <span className={s.addTitle}>{t.reference.syncPreviewTitle}</span>
        <div className={s.importStats}>
          <span>{t.reference.willAdd} <strong>{diff.toAdd.length}</strong></span>
          <span>{t.reference.willUpdate(diff.toUpdate.length)}</span>
          {diff.toDelete.length > 0 && (
            <span className={s.importSkipped} style={{ color: 'var(--danger)' }}>
              {t.reference.willDelete(diff.toDelete.length)}
            </span>
          )}
        </div>
        {total === 0 && <p className={s.importSkipped}>{t.reference.nothingToSync}</p>}
        {diff.toAdd.length > 0 && (
          <div className={s.importPreviewList}>
            {diff.toAdd.slice(0, 5).map((r, i) => (
              <div key={i} className={s.importPreviewItem}>
                <span className={s.importPreviewName}>{renderAdd(r)}</span>
              </div>
            ))}
            {diff.toAdd.length > 5 && <div className={s.importPreviewMore}>{t.reference.andMore(diff.toAdd.length - 5)}</div>}
          </div>
        )}
        {diff.toUpdate.length > 0 && (
          <div className={s.importPreviewList}>
            {diff.toUpdate.slice(0, 5).map((u, i) => (
              <div key={i} className={s.importPreviewItem}>
                <span className={s.importPreviewName}>{renderUpdate(u.before, u.patch)}</span>
              </div>
            ))}
            {diff.toUpdate.length > 5 && <div className={s.importPreviewMore}>{t.reference.andMore(diff.toUpdate.length - 5)}</div>}
          </div>
        )}
        {diff.toDelete.length > 0 && (
          <div className={s.importPreviewList}>
            {diff.toDelete.slice(0, 5).map(e => (
              <div key={e.id} className={s.importPreviewItem}>
                <span className={s.importPreviewName}>{renderExisting(e)}</span>
              </div>
            ))}
            {diff.toDelete.length > 5 && <div className={s.importPreviewMore}>{t.reference.andMore(diff.toDelete.length - 5)}</div>}
          </div>
        )}
        <div className={s.addRow}>
          <button className={s.addBtn} onClick={handleApply} disabled={total === 0}>{t.reference.applySync(total)}</button>
          <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={onCancel}>{t.common.cancel}</button>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmDelete}
        title={t.reference.syncConfirmTitle(diff.toDelete.length)}
        message={t.reference.syncConfirmText}
        confirmLabel={t.reference.syncConfirmBtn}
        onConfirm={() => { setConfirmDelete(false); onConfirm() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>,
    document.body
  )
}

// ─── Grit Converter ──────────────────────────────────────────────────────────

const IconConverter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <path d="M7 22l-4-4 4-4"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
)

const ITEM_H = 44
const FEPA_VALUES   = [...new Set(GRIT_TABLE.map(r => String(r.fepa)))]
const JIS_VALUES    = [...new Set(GRIT_TABLE.map(r => String(r.jis)))]
const GOST_VALUES   = [...new Set(GRIT_TABLE.map(r => r.gost))]
const MICRON_VALUES = [...new Set(GRIT_TABLE.map(r => String(r.microns)))]

function Drum({ values, selectedIdx, onSelect }: {
  values: string[]
  selectedIdx: number
  onSelect: (idx: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const settling = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const selectedIdxRef = useRef(selectedIdx)
  selectedIdxRef.current = selectedIdx // eslint-disable-line react-hooks/refs
  const valuesRef = useRef(values)
  valuesRef.current = values // eslint-disable-line react-hooks/refs
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect // eslint-disable-line react-hooks/refs

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Центр выбранного элемента должен совпадать с центром вьюпорта.
    // target = selectedIdx*H + topPad + H/2 - viewportH/2, topPad = 2*H → 2.5*H
    const target = selectedIdx * ITEM_H + 2.5 * ITEM_H - el.clientHeight / 2
    if (Math.abs(el.scrollTop - target) < 2) return
    settling.current = true
    el.scrollTo({ top: target, behavior: 'smooth' })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { settling.current = false }, 600)
  }, [selectedIdx])

  // На десктопе колёсико мыши даёт delta ~100px, scroll-snap перепрыгивает на 2+
  // позиции. Перехватываем wheel и двигаем ровно на ±1.
  // selectedIdxRef обновляем сразу в обработчике — иначе при быстром вращении
  // все события читают одно устаревшее значение и двигают только на 1 шаг.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const dir = e.deltaY > 0 ? 1 : -1
      selectedIdxRef.current = Math.max(0, Math.min(valuesRef.current.length - 1, selectedIdxRef.current + dir))
      onSelectRef.current(selectedIdxRef.current)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Пользователь коснулся барабана — снимаем флаг settling немедленно,
  // чтобы ручной touch-скролл не игнорировался во время программной синхронизации.
  function handlePointerDown() {
    settling.current = false
    clearTimeout(timer.current)
  }

  function handleScroll() {
    if (settling.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      // Обратная формула к target выше
      const idx = Math.round((el.scrollTop + el.clientHeight / 2 - 2.5 * ITEM_H) / ITEM_H)
      onSelect(Math.max(0, Math.min(values.length - 1, idx)))
    }, 120)
  }

  return (
    <div className={s.drumWrap}>
      <div className={s.drumHighlight} />
      <div ref={ref} className={s.drum} onScroll={handleScroll} onPointerDown={handlePointerDown}>
        <div style={{ height: 2 * ITEM_H }} />
        {values.map((v, i) => (
          <div key={v} className={`${s.drumItem} ${i === selectedIdx ? s.drumItemSelected : ''}`}>
            {v}
          </div>
        ))}
        <div style={{ height: 2 * ITEM_H }} />
      </div>
      <div className={s.drumFadeTop} />
      <div className={s.drumFadeBot} />
    </div>
  )
}

function GritConverter() {
  const [current, setCurrent] = useState(GRIT_TABLE[0])

  const fepaIdx   = FEPA_VALUES.indexOf(String(current.fepa))
  const jisIdx    = JIS_VALUES.indexOf(String(current.jis))
  const gostIdx   = GOST_VALUES.indexOf(current.gost)
  const micronIdx = MICRON_VALUES.indexOf(String(current.microns))

  function onFepa(idx: number) {
    const row = GRIT_TABLE.find(r => r.fepa === Number(FEPA_VALUES[idx]))
    if (row) setCurrent(row)
  }
  function onJis(idx: number) {
    const row = GRIT_TABLE.find(r => r.jis === Number(JIS_VALUES[idx]))
    if (row) setCurrent(row)
  }
  function onGost(idx: number) {
    const row = GRIT_TABLE.find(r => r.gost === GOST_VALUES[idx])
    if (row) setCurrent(row)
  }
  function onMicron(idx: number) {
    const row = GRIT_TABLE.find(r => String(r.microns) === MICRON_VALUES[idx])
    if (row) setCurrent(row)
  }

  return (
    <div className={s.converterBody}>
      <div className={s.drumCol}>
        <span className={s.drumLabel}>µm</span>
        <Drum values={MICRON_VALUES} selectedIdx={micronIdx} onSelect={onMicron} />
      </div>
      <div className={s.drumCol}>
        <span className={s.drumLabel}>FEPA</span>
        <Drum values={FEPA_VALUES} selectedIdx={fepaIdx} onSelect={onFepa} />
      </div>
      <div className={s.drumCol}>
        <span className={s.drumLabel}>JIS</span>
        <Drum values={JIS_VALUES} selectedIdx={jisIdx} onSelect={onJis} />
      </div>
      <div className={s.drumCol}>
        <span className={s.drumLabel}>GOST</span>
        <Drum values={GOST_VALUES} selectedIdx={gostIdx} onSelect={onGost} />
      </div>
    </div>
  )
}

// ─── Stone Heatmap ───────────────────────────────────────────────────────────

const IconHeatmap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)

const IconGames = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="11" x2="10" y2="11"/>
    <line x1="8" y1="9" x2="8" y2="13"/>
    <line x1="15" y1="12" x2="15.01" y2="12"/>
    <line x1="18" y1="10" x2="18.01" y2="10"/>
    <rect x="2" y="6" width="20" height="12" rx="4"/>
  </svg>
)

const HEATMAP_POSITIONS = [1, 2, 3, 4, 5] as const

function heatColor(pct: number): string {
  if (pct <= 0) return ''
  const stops = [
    { t: 0,    r: 22,  g: 22,  b: 22  },
    { t: 0.25, r: 27,  g: 135, b: 82  },
    { t: 0.5,  r: 210, g: 175, b: 20  },
    { t: 0.75, r: 210, g: 100, b: 15  },
    { t: 1.0,  r: 200, g: 60,  b: 60  },
  ]
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i].t && pct <= stops[i + 1].t) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  const range = hi.t - lo.t
  const f = range > 0 ? (pct - lo.t) / range : 0
  const r = Math.round(lo.r + (hi.r - lo.r) * f)
  const g = Math.round(lo.g + (hi.g - lo.g) * f)
  const b = Math.round(lo.b + (hi.b - lo.b) * f)
  return `rgb(${r},${g},${b})`
}

function StoneHeatmap() {
  const t = useT()
  const sharpenings = useLiveQuery(() => db.sharpenings.toArray().then(arr => arr.filter(s => !s.deletedAt)), [])

  if (!sharpenings) return null

  const byPos: Record<number, Record<string, number>> = {}
  for (const sh of sharpenings) {
    const stones = sh.stones ?? []
    if (stones.length === 0) continue
    const maxOrder = Math.max(...stones.map(s => s.order))
    for (const stone of stones) {
      const isLast = stone.order === maxOrder
      const pos = (isLast || stone.order >= 5) ? 5 : stone.order
      if (!byPos[pos]) byPos[pos] = {}
      byPos[pos][stone.name] = (byPos[pos][stone.name] ?? 0) + 1
    }
  }

  const totals: Record<string, number> = {}
  for (const posMap of Object.values(byPos)) {
    for (const [name, cnt] of Object.entries(posMap)) {
      totals[name] = (totals[name] ?? 0) + cnt
    }
  }

  const top10 = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name)

  if (top10.length === 0) {
    return <p className={s.heatmapEmpty}>{t.reference.heatmapEmpty}</p>
  }

  const posTotals: Record<number, number> = {}
  for (const p of HEATMAP_POSITIONS) {
    posTotals[p] = Object.values(byPos[p] ?? {}).reduce((a, b) => a + b, 0)
  }

  return (
    <div className={s.heatmap}>
      <div className={s.heatmapCorner} />
      {HEATMAP_POSITIONS.map(p => (
        <div key={p} className={s.heatmapPosHeader}>{p === 5 ? t.reference.posFin : String(p)}</div>
      ))}
      {top10.map(name => (
        <Fragment key={name}>
          <div className={s.heatmapStone} title={name}>{name}</div>
          {HEATMAP_POSITIONS.map(p => {
            const count = byPos[p]?.[name] ?? 0
            const total = posTotals[p] ?? 0
            const pct = total > 0 ? count / total : 0
            const bg = heatColor(pct)
            return (
              <div
                key={p}
                className={s.heatmapCell}
                style={bg ? { background: bg } : undefined}
              >
                {count > 0 && (
                  <span className={s.heatmapPct}>{count}</span>
                )}
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

// ─── CSV import/export ───────────────────────────────────────────────────────

interface ParsedStoneRow {
  brand: string
  gritFepa?: number
  gritJis?: number
  gritMicrons?: number
  gritMk?: string
  gritSource?: GritSource
  type?: Stone['type']
  coolant?: StoneCoolant
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadStonesCSV(stones: Stone[]) {
  downloadCSV(buildCSV([
    ['Название', 'мкм', 'FEPA', 'JIS', 'ГОСТ', 'тип', 'СОЖ'],
    ...stones.map(st => [
      st.brand,
      st.gritMicrons ?? null,
      st.gritFepa    ?? null,
      st.gritJis     ?? null,
      st.gritMk ? `\t${st.gritMk}` : null,
      st.type    ? enumLabel(ru.enums.stoneType, st.type) : null,
      st.coolant ? enumLabel(ru.enums.coolant, st.coolant) : null,
    ]),
  ]), 'stones.csv')
}

function downloadSteelsCSV(steels: Steel[]) {
  downloadCSV(buildSteelsCSV(steels), 'steels.csv')
}

function downloadKnivesCSV(knives: Knife[]) {
  downloadCSV(buildKnivesCSV(knives), 'knives.csv')
}

function parseStonesCSV(text: string): ParsedStoneRow[] {
  // parseCsv (knifeImport.ts) — квотоосознанный построчный парсер, а не наивный
  // split(sep). buildCSV (backup.ts) всегда оборачивает поля в кавычки, поэтому
  // название камня с «;» или переносом строки внутри кавычек не резалось бы
  // случайно посередине, а колонки правее не сдвигались бы при реимпорте.
  const rows = parseCsv(text)
  if (rows.length < 2) return []

  const headers = rows[0].map(h => h.trim().toLowerCase())
  const col = (...names: string[]) => headers.findIndex(h => names.includes(h))
  const cNazv    = col('название')
  const cMkm     = col('мкм', 'µm')
  const cFepa    = col('fepa')
  const cJis     = col('jis')
  const cGost    = col('гост', 'gost', 'мк')
  const cType    = col('тип')
  const cCoolant = col('сож')

  if (cNazv === -1) return []

  const result: ParsedStoneRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]
    const get = (c: number) => (c >= 0 ? (cells[c] ?? '').trim() : '')

    const brand = get(cNazv)
    if (!brand) continue

    const mkmVal  = parseFloat(get(cMkm))
    const fepaVal = parseFloat(get(cFepa))
    const jisVal  = parseFloat(get(cJis))
    const gostVal = get(cGost).trim()

    // Приоритет: мкм > FEPA > JIS > ГОСТ — используем первую заполненную колонку
    let gritFields: Partial<ParsedStoneRow> = {}
    if (!isNaN(mkmVal) && mkmVal > 0) {
      gritFields = fromMicrons(mkmVal)
    } else if (!isNaN(fepaVal) && fepaVal > 0) {
      gritFields = fromFepa(fepaVal)
    } else if (!isNaN(jisVal) && jisVal > 0) {
      gritFields = fromJis(jisVal)
    } else if (gostVal) {
      gritFields = fromMk(gostVal)
    }

    const typeLabel = get(cType).toLowerCase()
    const coolantLabel = get(cCoolant).toLowerCase()

    result.push({
      brand,
      ...gritFields,
      type:    (typeLabel    ? STONE_TYPE_BY_LABEL[typeLabel]  : undefined) as Stone['type'] | undefined,
      coolant: (coolantLabel ? COOLANT_BY_LABEL[coolantLabel]  : undefined) as StoneCoolant | undefined,
    })
  }

  return result
}

// ─── Fuzzy match ─────────────────────────────────────────────────────────────

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t === q) return 1000
  if (t.startsWith(q)) return 500 + q.length
  if (t.includes(q)) return 200 + q.length
  // subsequence with consecutive-run bonus
  let qi = 0, score = 0, consecutive = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1 + consecutive * 2
      consecutive++
      qi++
    } else {
      consecutive = 0
    }
  }
  return qi === q.length ? score : 0
}

// ─── Stones ──────────────────────────────────────────────────────────────────

function StonesTab({ search }: { search: string }) {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState('')
  const [gritSource, setGritSource] = useState<GritSource | ''>('')
  const [gritVal, setGritVal] = useState('')
  const [gritMk, setGritMk] = useState('')
  const [type, setType] = useState<Stone['type'] | ''>('')
  const [coolant, setCoolant] = useState<StoneCoolant | ''>('')
  const [filterTypes, setFilterTypes] = useState<Set<Stone['type']>>(new Set())
  const [filterCoolants, setFilterCoolants] = useState<Set<StoneCoolant>>(new Set())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBrand, setEditBrand] = useState('')
  const [editGritSource, setEditGritSource] = useState<GritSource | ''>('')
  const [editGritVal, setEditGritVal] = useState('')
  const [editGritMk, setEditGritMk] = useState('')
  const [editType, setEditType] = useState<Stone['type'] | ''>('')
  const [editCoolant, setEditCoolant] = useState<StoneCoolant | ''>('')
  const [displayUnit, setDisplayUnit] = useState<GritDisplayMode | 'alpha'>('native')
  const [importPreview, setImportPreview] = useState<{ toAdd: ParsedStoneRow[], skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open && editingId === null && importPreview === null) return
    return startBlur()
  }, [open, editingId, importPreview])

  const stones = useLiveQuery(
    () => db.stones.toArray().then(arr => arr.sort(compareStonesForSort)),
    []
  )

  const allFiltered = stones?.filter(st => {
    if (filterTypes.size > 0 && (st.type == null || !filterTypes.has(st.type))) return false
    if (filterCoolants.size > 0) {
      const matchesAny = [...filterCoolants].some(f =>
        f === 'water' ? (st.coolant === 'water' || st.coolant === 'both' || st.coolant === 'dry') :
        f === 'oil'   ? (st.coolant === 'oil'   || st.coolant === 'both' || st.coolant === 'dry') :
        st.coolant === f
      )
      if (!matchesAny) return false
    }
    if (search.startsWith('*')) {
      const q = search.slice(1).toLowerCase().trim()
      if (!q) return true
      const matchedTypes = Object.entries(STONE_TYPE_BY_LABEL)
        .filter(([label]) => label.includes(q))
        .map(([, key]) => key)
      if (matchedTypes.length > 0) return st.type != null && matchedTypes.includes(st.type)
      if ('вода'.includes(q)) return st.coolant === 'water' || st.coolant === 'both' || st.coolant === 'dry'
      if ('масло'.includes(q)) return st.coolant === 'oil' || st.coolant === 'both' || st.coolant === 'dry'
      if ('сухой'.includes(q)) return st.coolant === 'dry'
      return false
    }
    const name = `${st.brand} ${st.gritFepa ?? ''} ${st.gritJis ?? ''} ${st.gritMicrons ?? ''} ${st.gritMk ?? ''}`.toLowerCase()
    return name.includes(search.toLowerCase())
  }) ?? []

  // При А-Я — весь список по алфавиту. Иначе: мои камни первыми по гритности, стандартные в подвале.
  const filtered = (() => {
    if (displayUnit === 'alpha') {
      return [...allFiltered].sort((a, b) => a.brand.localeCompare(b.brand, locale))
    }
    const custom   = allFiltered.filter(st => st.isCustom)
    const standard = allFiltered.filter(st => !st.isCustom)
    const sortedCustom = [...custom].sort((a, b) =>
      getGritSortValue(a, displayUnit) - getGritSortValue(b, displayUnit)
    )
    return [...sortedCustom, ...standard]
  })()

  const filteredSelectedCount = filtered.filter(st => selected.has(st.id!)).length

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function toggleFilterType(v: Stone['type']) {
    setFilterTypes(prev => {
      const next = new Set(prev)
      if (next.has(v)) { next.delete(v) } else { next.add(v) }
      return next
    })
  }

  function toggleFilterCoolant(v: StoneCoolant) {
    setFilterCoolants(prev => {
      const next = new Set(prev)
      if (next.has(v)) { next.delete(v) } else { next.add(v) }
      return next
    })
  }

  async function deleteSelected() {
    await db.stones.bulkDelete([...selected])
    setSelected(new Set())
  }

  function buildGritFields(src: GritSource | '', val: string, mk: string) {
    if (!src) return {}
    if (src === 'fepa'    && val) return fromFepa(Number(val))
    if (src === 'jis'     && val) return fromJis(Number(val))
    if (src === 'microns' && val) return fromMicrons(Number(val))
    if (src === 'mk'      && mk)  return fromMk(mk)
    return {}
  }

  function switchEditUnit(newSrc: GritSource | '') {
    if (newSrc === editGritSource) return
    // При смене единицы переводим текущее значение через таблицу
    let row: typeof GRIT_TABLE[0] | undefined
    if (editGritSource === 'fepa'    && editGritVal) row = GRIT_TABLE.find(r => r.fepa    === Number(editGritVal))
    else if (editGritSource === 'jis'     && editGritVal) row = GRIT_TABLE.find(r => r.jis     === Number(editGritVal))
    else if (editGritSource === 'microns' && editGritVal) row = GRIT_TABLE.find(r => r.microns === Number(editGritVal))
    else if (editGritSource === 'mk'      && editGritMk)  row = GRIT_TABLE.find(r => r.gost    === editGritMk)
    setEditGritSource(newSrc)
    if (row && newSrc) {
      if (newSrc === 'fepa')    { setEditGritVal(String(row.fepa));    setEditGritMk('') }
      else if (newSrc === 'jis')     { setEditGritVal(String(row.jis));     setEditGritMk('') }
      else if (newSrc === 'microns') { setEditGritVal(String(row.microns)); setEditGritMk('') }
      else if (newSrc === 'mk')      { setEditGritVal(''); setEditGritMk(row.gost) }
    } else {
      setEditGritVal(''); setEditGritMk('')
    }
  }

  function startEdit() {
    const id = [...selected][0]
    const stone = stones?.find(st => st.id === id)
    if (!stone) return
    setEditingId(id)
    setEditBrand(stone.brand)
    setEditGritSource(stone.gritSource ?? '')
    const src = stone.gritSource
    setEditGritVal(
      src === 'fepa'    ? String(stone.gritFepa ?? '')    :
      src === 'jis'     ? String(stone.gritJis  ?? '')    :
      src === 'microns' ? String(stone.gritMicrons ?? '') : ''
    )
    setEditGritMk(stone.gritMk ?? '')
    setEditType((stone.type as Stone['type'] | '') ?? '')
    setEditCoolant((stone.coolant as StoneCoolant | '') ?? '')
    setSelected(new Set())
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editBrand.trim() || editingId === null) return
    await db.stones.update(editingId, {
      brand: editBrand.trim(),
      ...buildGritFields(editGritSource, editGritVal, editGritMk),
      type: editType || undefined,
      coolant: editCoolant || undefined,
      isCustom: true,
      updatedAt: new Date(),
    })
    setEditingId(null)
  }

  async function add() {
    if (!brand.trim()) return
    await db.stones.add({
      brand: brand.trim(),
      ...buildGritFields(gritSource, gritVal, gritMk),
      type: type || undefined,
      coolant: coolant || undefined,
      isCustom: true,
      updatedAt: new Date(),
    })
    setBrand(''); setGritVal(''); setGritMk(''); setGritSource(''); setType(''); setCoolant(''); setOpen(false)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let text: string
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      text = new TextDecoder('utf-8').decode(buf)
    } else if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
      text = new TextDecoder('utf-16le').decode(buf)
    } else {
      const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf)
      text = utf8.includes('�') ? new TextDecoder('windows-1251').decode(buf) : utf8
    }
    const parsed = parseStonesCSV(text)
    if (parsed.length === 0) return
    const existing = await db.stones.toArray()
    const toAdd: ParsedStoneRow[] = []
    let skipped = 0
    for (const p of parsed) {
      const isDup = existing.some(ex => {
        if (ex.brand.toLowerCase() !== p.brand.toLowerCase()) return false
        // Сравниваем только по нативной шкале импортируемого камня,
        // чтобы nearest-neighbour gritMicrons не давал ложных совпадений
        if (p.gritSource === 'fepa'    && p.gritFepa    != null) return ex.gritFepa    === p.gritFepa
        if (p.gritSource === 'jis'     && p.gritJis     != null) return ex.gritJis     === p.gritJis
        if (p.gritSource === 'mk'      && p.gritMk)              return ex.gritMk      === p.gritMk
        if (p.gritSource === 'microns' && p.gritMicrons != null) return ex.gritMicrons === p.gritMicrons
        // Камень без гритности — дубль если у обоих нет гритности
        return !ex.gritFepa && !ex.gritJis && !ex.gritMicrons && !ex.gritMk
      })
      if (isDup) skipped++
      else toAdd.push(p)
    }
    setImportPreview({ toAdd, skipped })
  }

  async function handleConfirmImport() {
    if (!importPreview) return
    const now = new Date()
    await db.stones.bulkAdd(importPreview.toAdd.map(p => ({
      brand:        p.brand,
      gritFepa:     p.gritFepa,
      gritJis:      p.gritJis,
      gritMicrons:  p.gritMicrons,
      gritMk:       p.gritMk,
      gritSource:   p.gritSource,
      type:         p.type,
      coolant:      p.coolant,
      isCustom:     true,
      updatedAt:    now,
    })))
    setImportPreview(null)
  }

  const allBrands = [...new Set(stones?.map(st => st.brand) ?? [])]
  const addBrandSuggestions = brand.trim().length >= 2
    ? allBrands
        .map(b => ({ b, score: fuzzyScore(brand.trim(), b) }))
        .filter(x => x.score > 0 && x.b.toLowerCase() !== brand.trim().toLowerCase())
        .sort((a, b2) => b2.score - a.score)
        .slice(0, 5)
        .map(x => x.b)
    : []

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      {!open && selected.size === 0 && editingId === null && (
        <>
          <button className={s.addTogglePrimary} onClick={() => setOpen(true)}>
            {t.reference.addStone}
          </button>
          <div className={s.csvActions}>
            <button className={s.csvBtn} onClick={() => downloadStonesCSV(stones ?? [])}>{t.reference.exportCsv}</button>
            <button className={s.csvBtn} onClick={() => fileInputRef.current?.click()}>{t.reference.importCsv}</button>
          </div>
        </>
      )}
      {open && createPortal(
        <div className={s.dialogOverlay} onClick={() => setOpen(false)}>
        <div className={s.dialog} onClick={e => e.stopPropagation()}>
          <span className={s.addTitle}>{t.reference.newStone}</span>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder={t.reference.brandPlaceholder} autoFocus />
          {addBrandSuggestions.length > 0 && (
            <div className={s.fuzzySuggestions}>
              <span className={s.fuzzyLabel}>{t.reference.similarInDict}</span>
              <div className={s.fuzzyChips}>
                {addBrandSuggestions.map(b => (
                  <button key={b} className={s.fuzzyChip} onClick={() => setBrand(b)}>{b}</button>
                ))}
              </div>
            </div>
          )}
          <div className={s.gritUnitRow}>
            {(['fepa', 'jis', 'microns', 'mk'] as const).map(u => (
              <button
                key={u}
                className={`${s.gritUnitBtn} ${gritSource === u ? s.gritUnitActive : ''}`}
                onClick={() => { setGritSource(u); setGritVal(''); setGritMk('') }}
              >
                {u === 'mk' ? 'мк' : u === 'microns' ? 'мкм' : u.toUpperCase()}
              </button>
            ))}
          </div>
          {(gritSource === 'fepa' || gritSource === 'jis' || gritSource === 'microns') && (
            <input
              value={gritVal}
              onChange={e => setGritVal(e.target.value)}
              placeholder={gritSource === 'microns' ? t.reference.micronsHint : t.reference.gritHint(gritSource.toUpperCase())}
              type="number"
              min={1}
            />
          )}
          {gritSource === 'mk' && (
            <select className={s.select} value={gritMk} onChange={e => setGritMk(e.target.value)}>
              <option value="">{t.reference.selectMk}</option>
              {MK_VALUES.map(v => <option key={v} value={v}>{v} мк</option>)}
            </select>
          )}
          <div className={s.addRow}>
            <select className={s.select} value={type} onChange={e => setType(e.target.value as Stone['type'] | '')}>
              <option value="" disabled>{t.reference.selectTypePlaceholder}</option>
              {Object.entries(t.enums.stoneType).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select className={s.select} value={coolant} onChange={e => setCoolant(e.target.value as StoneCoolant | '')}>
              <option value="">{t.reference.coolantPlaceholder}</option>
              {Object.entries(t.enums.coolant).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!brand.trim()}>{t.common.add}</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>{t.common.cancel}</button>
          </div>
        </div>
        </div>,
        document.body
      )}

      {editingId !== null && createPortal(
        <div className={s.dialogOverlay} onClick={cancelEdit}>
        <div className={s.dialog} onClick={e => e.stopPropagation()}>
          <span className={s.addTitle}>{t.reference.editStone}</span>
          <input value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder={t.reference.brandPlaceholder} autoFocus />
          <div className={s.gritUnitRow}>
            {(['fepa', 'jis', 'microns', 'mk'] as const).map(u => (
              <button
                key={u}
                className={`${s.gritUnitBtn} ${editGritSource === u ? s.gritUnitActive : ''}`}
                onClick={() => switchEditUnit(u)}
              >
                {u === 'mk' ? 'мк' : u === 'microns' ? 'мкм' : u.toUpperCase()}
              </button>
            ))}
          </div>
          {(editGritSource === 'fepa' || editGritSource === 'jis' || editGritSource === 'microns') && (
            <input
              value={editGritVal}
              onChange={e => setEditGritVal(e.target.value)}
              placeholder={editGritSource === 'microns' ? t.reference.micronsHint : t.reference.gritHint(editGritSource.toUpperCase())}
              type="number"
              min={1}
            />
          )}
          {editGritSource === 'mk' && (
            <select className={s.select} value={editGritMk} onChange={e => setEditGritMk(e.target.value)}>
              <option value="">{t.reference.selectMk}</option>
              {MK_VALUES.map(v => <option key={v} value={v}>{v} мк</option>)}
            </select>
          )}
          <div className={s.addRow}>
            <select className={s.select} value={editType} onChange={e => setEditType(e.target.value as Stone['type'] | '')}>
              <option value="" disabled>{t.reference.selectTypePlaceholder}</option>
              {Object.entries(t.enums.stoneType).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select className={s.select} value={editCoolant} onChange={e => setEditCoolant(e.target.value as StoneCoolant | '')}>
              <option value="">{t.reference.coolantPlaceholder}</option>
              {Object.entries(t.enums.coolant).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={saveEdit} disabled={!editBrand.trim()}>{t.common.save}</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={cancelEdit}>{t.common.cancel}</button>
          </div>
        </div>
        </div>,
        document.body
      )}

      <div className={s.filterChipsRow}>
        <button
          className={`${s.filterChip} ${filterTypes.size === 0 ? s.filterChipActive : ''}`}
          onClick={() => setFilterTypes(new Set())}
        >
          {t.reference.filterTypeAll}
        </button>
        {Object.entries(t.enums.stoneType).map(([val, label]) => (
          <button
            key={val}
            className={`${s.filterChip} ${filterTypes.has(val as Stone['type']) ? s.filterChipActive : ''}`}
            onClick={() => toggleFilterType(val as Stone['type'])}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={s.filterChipsRow}>
        <button
          className={`${s.filterChip} ${filterCoolants.size === 0 ? s.filterChipActive : ''}`}
          onClick={() => setFilterCoolants(new Set())}
        >
          {t.reference.filterCoolantAll}
        </button>
        {Object.entries(t.enums.coolant).map(([val, label]) => (
          <button
            key={val}
            className={`${s.filterChip} ${filterCoolants.has(val as StoneCoolant) ? s.filterChipActive : ''}`}
            onClick={() => toggleFilterCoolant(val as StoneCoolant)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={s.displayUnitRow}>
        {([
          ['native', t.reference.unitNative],
          ['fepa',   'FEPA'],
          ['jis',    'JIS'],
          ['gost',   t.reference.unitGost],
          ['alpha',  t.reference.unitAlpha],
        ] as [GritDisplayMode | 'alpha', string][]).map(([unit, label]) => (
          <button
            key={unit}
            className={`${s.displayUnitBtn} ${displayUnit === unit ? s.displayUnitActive : ''}`}
            onClick={() => setDisplayUnit(unit)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={s.list}>
        {filtered.length === 0 && <p className={s.empty}>{t.reference.stonesEmpty}</p>}
        {filtered.length > 0 && (
          <SelectAllRow
            total={filtered.length}
            selected={filteredSelectedCount}
            onSelectAll={() => setSelected(new Set(filtered.map(st => st.id!)))}
            onClearAll={() => setSelected(new Set())}
          />
        )}
        {filtered.map(st => {
          const sel = selected.has(st.id!)
          return (
            <div
              key={st.id}
              className={`${s.item} ${sel ? s.itemSelected : ''}`}
              onClick={() => toggle(st.id!)}
            >
              <div className={`${s.checkbox} ${sel ? s.checkboxChecked : ''}`}>
                {sel && <span className={s.checkmark}><IconCheck /></span>}
              </div>
              <div className={s.itemInfo}>
                <div className={s.itemName}>{st.brand}</div>
                <div className={s.itemMeta}>
                  {[enumLabel(t.enums.stoneType, st.type), enumLabel(t.enums.coolant, st.coolant)].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className={s.itemRight}>
                {(st.gritFepa != null || st.gritJis != null || st.gritMicrons != null || st.gritMk) && (() => {
                  const { mainValue, mainUnit, alts } = getGritDisplay(st, displayUnit === 'alpha' ? 'native' : displayUnit)
                  return (
                    <div className={s.gritGroup}>
                      {alts[0] && <span className={s.gritAlts}>{alts[0]}</span>}
                      <span className={s.gritBadge}>
                        {mainValue}
                        {mainUnit && <span className={s.gritUnitLabel}>{mainUnit}</span>}
                      </span>
                      {alts[1] && <span className={s.gritAlts}>{alts[1]}</span>}
                    </div>
                  )
                })()}
                {st.isCustom && <span className={s.customBadge}>{t.reference.mineM}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          onCancel={() => setSelected(new Set())}
          onDelete={deleteSelected}
          onEdit={startEdit}
        />
      )}

      {importPreview !== null && createPortal(
        <div className={s.dialogOverlay} onClick={() => setImportPreview(null)}>
          <div className={s.dialog} onClick={e => e.stopPropagation()}>
            <span className={s.addTitle}>{t.reference.importStones}</span>
            <div className={s.importStats}>
              <span>{t.reference.willAdd} <strong>{importPreview.toAdd.length}</strong></span>
              {importPreview.skipped > 0 && (
                <span className={s.importSkipped}>{t.reference.dupSkipped(importPreview.skipped)}</span>
              )}
            </div>
            {importPreview.toAdd.length > 0 && (
              <div className={s.importPreviewList}>
                {importPreview.toAdd.slice(0, 5).map((p, i) => (
                  <div key={i} className={s.importPreviewItem}>
                    <span className={s.importPreviewName}>{p.brand}</span>
                    {(p.gritFepa != null || p.gritJis != null || p.gritMicrons != null || p.gritMk) && (
                      <span className={s.importPreviewGrit}>
                        {p.gritSource === 'mk'      ? `${p.gritMk} мк`          :
                         p.gritSource === 'fepa'    ? `${p.gritFepa} FEPA`      :
                         p.gritSource === 'jis'     ? `${p.gritJis} JIS`        :
                         p.gritSource === 'microns' ? `${p.gritMicrons} мкм`    :
                         p.gritMk ? `${p.gritMk} мк` : p.gritFepa != null ? `${p.gritFepa} FEPA` : ''}
                      </span>
                    )}
                  </div>
                ))}
                {importPreview.toAdd.length > 5 && (
                  <div className={s.importPreviewMore}>{t.reference.andMore(importPreview.toAdd.length - 5)}</div>
                )}
              </div>
            )}
            {importPreview.toAdd.length === 0 && (
              <p className={s.importSkipped}>{t.reference.allStonesExist}</p>
            )}
            <div className={s.addRow}>
              <button
                className={s.addBtn}
                onClick={handleConfirmImport}
                disabled={importPreview.toAdd.length === 0}
              >
                {t.reference.addCount(importPreview.toAdd.length)}
              </button>
              <button
                className={s.addBtn}
                style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }}
                onClick={() => setImportPreview(null)}
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Steels ──────────────────────────────────────────────────────────────────

function SteelsTab({ search }: { search: string }) {
  const t = useT()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [hrc, setHrc] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [syncDiff, setSyncDiff] = useState<RefSyncDiff<Steel, ParsedSteelRow> | null>(null)
  const syncFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open && syncDiff === null) return
    return startBlur()
  }, [open, syncDiff])

  const steels = useLiveQuery(() => db.steels.orderBy('name').toArray(), [])

  const filtered = steels?.filter(st =>
    st.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const filteredSelectedCount = filtered.filter(st => selected.has(st.id!)).length

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function deleteSelected() {
    await db.steels.bulkDelete([...selected])
    setSelected(new Set())
  }

  async function add() {
    if (!name.trim()) return
    await db.steels.add({
      name: name.trim(),
      hrc: hrc ? Number(hrc) : undefined,
      isCustom: true,
      updatedAt: new Date(),
    })
    setName(''); setHrc(''); setOpen(false)
  }

  async function handleSyncFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const grid = await readSpreadsheet(file)
      const rows = steelRowsFromGrid(grid)
      if (grid.length === 0 || rows.length === 0) {
        showToast(t.reference.fileEmpty)
        return
      }
      setSyncDiff(diffSteels(steels ?? [], rows))
    } catch {
      showToast(t.reference.fileReadError)
    }
  }

  async function applySync() {
    if (!syncDiff) return
    const now = new Date()
    await db.transaction('rw', db.steels, async () => {
      if (syncDiff.toAdd.length > 0) {
        await db.steels.bulkAdd(syncDiff.toAdd.map(row => ({
          name: row.name,
          hrc: row.hrc,
          isCustom: true,
          updatedAt: now,
        })))
      }
      for (const u of syncDiff.toUpdate) {
        await db.steels.update(u.id, { ...u.patch, isCustom: true, updatedAt: now })
      }
      if (syncDiff.toDelete.length > 0) {
        await db.steels.bulkDelete(syncDiff.toDelete.map(st => st.id!))
      }
    })
    track('reference_sync', {
      table: 'steels',
      added: syncDiff.toAdd.length,
      updated: syncDiff.toUpdate.length,
      deleted: syncDiff.toDelete.length,
    }).catch(() => {})
    showToast(t.reference.syncDone(syncDiff.toAdd.length, syncDiff.toUpdate.length, syncDiff.toDelete.length))
    setSyncDiff(null)
  }

  return (
    <>
      <input
        ref={syncFileInputRef}
        type="file"
        accept=".xlsx,.csv"
        style={{ display: 'none' }}
        onChange={handleSyncFileSelect}
      />
      {!open && selected.size === 0 && (
        <>
          <button className={s.addTogglePrimary} onClick={() => setOpen(true)}>
            {t.reference.addSteel}
          </button>
          <div className={s.csvActions}>
            <button className={s.csvBtn} onClick={() => downloadSteelsCSV(steels ?? [])}>{t.reference.exportCsv}</button>
            <button className={s.csvBtn} onClick={() => syncFileInputRef.current?.click()}>{t.reference.syncCsv}</button>
          </div>
          <p className={s.importHint}>{t.reference.syncHint}</p>
        </>
      )}
      {open && createPortal(
        <div className={s.dialogOverlay} onClick={() => setOpen(false)}>
        <div className={s.dialog} onClick={e => e.stopPropagation()}>
          <span className={s.addTitle}>{t.reference.newSteel}</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.reference.steelNamePlaceholder} autoFocus />
          <div className={s.addRow}>
            <input value={hrc} onChange={e => setHrc(e.target.value)} placeholder="HRC" type="number" />
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!name.trim()}>{t.common.add}</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>{t.common.cancel}</button>
          </div>
        </div>
        </div>,
        document.body
      )}

      <div className={s.list}>
        {filtered.length === 0 && <p className={s.empty}>{t.reference.steelsEmpty}</p>}
        {filtered.length > 0 && (
          <SelectAllRow
            total={filtered.length}
            selected={filteredSelectedCount}
            onSelectAll={() => setSelected(new Set(filtered.map(st => st.id!)))}
            onClearAll={() => setSelected(new Set())}
          />
        )}
        {filtered.map(st => {
          const sel = selected.has(st.id!)
          return (
            <div
              key={st.id}
              className={`${s.item} ${sel ? s.itemSelected : ''}`}
              onClick={() => toggle(st.id!)}
            >
              <div className={`${s.checkbox} ${sel ? s.checkboxChecked : ''}`}>
                {sel && <span className={s.checkmark}><IconCheck /></span>}
              </div>
              <div className={s.itemInfo}>
                <div className={s.itemName}>{st.name}</div>
                <div className={s.itemMeta}>
                  {st.hrc ? `${st.hrc} HRC` : t.reference.noData}
                </div>
              </div>
              <div className={s.itemRight}>
                {st.isCustom && <span className={s.customBadge}>{t.reference.mineF}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          onCancel={() => setSelected(new Set())}
          onDelete={deleteSelected}
        />
      )}

      {syncDiff && (
        <RefSyncPreviewDialog
          diff={syncDiff}
          renderAdd={row => row.hrc ? `${row.name} — ${row.hrc} HRC` : row.name}
          renderExisting={st => st.hrc ? `${st.name} — ${st.hrc} HRC` : st.name}
          renderUpdate={(before, patch) => `${before.name}: ${before.hrc ?? '—'} → ${patch.hrc ?? '—'} HRC`}
          onCancel={() => setSyncDiff(null)}
          onConfirm={applySync}
        />
      )}
    </>
  )
}

// ─── Knife import preview ─────────────────────────────────────────────────────

function colLabel(grid: string[][], idx: number, hasHeader: boolean, columnN: (n: number) => string): string {
  if (hasHeader) {
    const h = (grid[0]?.[idx] ?? '').trim()
    if (h) return h
  }
  return columnN(idx + 1)
}

// Экран превью импорта ножей: маппинг колонок, разрешение сталей (точные —
// связаны автоматически, остальные — с подсказкой ближайшей и ручным вводом),
// сводка непрошедших строк. В БД ничего не пишется до «Импортировать».
function KnifeImportPreview({ grid, knives, steels, onClose }: {
  grid: string[][]
  knives: Knife[]
  steels: Steel[]
  onClose: () => void
}) {
  const { showToast } = useToast()
  const t = useT()
  const skipLabel = (r: SkipReason) => (r === 'empty-name' ? t.reference.skipEmptyName : t.reference.skipDuplicate)
  const [mapping, setMapping] = useState<ColumnMapping>(() => detectColumns(grid))
  // Только пользовательские правки, ключ — индекс строки в файле. Эффективное
  // значение = override ?? дефолт. Так не нужен эффект-пересев при смене маппинга,
  // а ручные правки переживают её (rowIndex стабилен).
  const [overrides, setOverrides] = useState<Record<number, string>>({})

  const steelNames = useMemo(() => steels.map(st => st.name), [steels])
  const refByNorm = useMemo(() => {
    const m = new Map<string, Steel>()
    for (const st of steels) m.set(normSteel(st.name), st)
    return m
  }, [steels])

  const prepared = useMemo(
    () => prepareImport(extractRows(grid, mapping), knives, steels),
    [grid, mapping, knives, steels],
  )

  useEffect(() => startBlur(), [])

  // Дефолтное значение стали: exact → каноничное имя из справочника, остальные
  // с указанной сталью → как в файле, без стали → пусто.
  function defaultSteel(k: PreparedKnife): string {
    if (k.match?.kind === 'exact') return k.match.steel?.name ?? ''
    if (k.match) return k.rawSteel
    return ''
  }
  const valueOf = (k: PreparedKnife) => overrides[k.rowIndex] ?? defaultSteel(k)

  function classify(val: string): { kind: 'none' } | { kind: 'link'; ref: Steel } | { kind: 'create' } {
    const t = val.trim()
    if (!t) return { kind: 'none' }
    const ref = refByNorm.get(normSteel(t))
    return ref ? { kind: 'link', ref } : { kind: 'create' }
  }

  const cols = grid[0] ?? []

  async function handleImport() {
    const now = new Date()
    const newSteels = new Map<string, string>()
    for (const k of prepared.knives) {
      const val = valueOf(k).trim()
      if (val && !refByNorm.has(normSteel(val))) newSteels.set(normSteel(val), val)
    }
    await db.transaction('rw', db.steels, db.knives, async () => {
      if (newSteels.size > 0) {
        await db.steels.bulkAdd([...newSteels.values()].map(name => ({
          name, isCustom: true, updatedAt: now,
        })))
      }
      await db.knives.bulkAdd(prepared.knives.map(k => {
        const val = valueOf(k).trim()
        const c = classify(val)
        const steel = c.kind === 'link' ? c.ref.name : c.kind === 'create' ? val : undefined
        return { brand: k.name, steel, isCustom: true, updatedAt: now }
      }))
    })
    track('reference_import', {
      count: prepared.knives.length,
      newSteels: newSteels.size,
      skipped: prepared.skipped.length,
    }).catch(() => {})
    const parts = [t.reference.importedKnives(prepared.knives.length)]
    if (newSteels.size > 0) parts.push(t.reference.newSteelsN(newSteels.size))
    if (prepared.skipped.length > 0) parts.push(t.reference.skippedN(prepared.skipped.length))
    showToast(parts.join(', '))
    onClose()
  }

  return createPortal(
    <div className={s.dialogOverlay} onClick={onClose}>
      <div className={s.importSheet} onClick={e => e.stopPropagation()}>
        <span className={s.addTitle}>{t.reference.importKnives}</span>

        <div className={s.importMapping}>
          <label className={s.importMapField}>
            <span>{t.reference.colName}</span>
            <select
              className={s.select}
              value={mapping.nameCol}
              onChange={e => setMapping(m => ({ ...m, nameCol: Number(e.target.value) }))}
            >
              {cols.map((_, i) => (
                <option key={i} value={i}>{colLabel(grid, i, mapping.hasHeader, t.reference.columnN)}</option>
              ))}
            </select>
          </label>
          <label className={s.importMapField}>
            <span>{t.reference.colSteel}</span>
            <select
              className={s.select}
              value={mapping.steelCol ?? ''}
              onChange={e => setMapping(m => ({ ...m, steelCol: e.target.value === '' ? null : Number(e.target.value) }))}
            >
              <option value="">{t.reference.notSpecified}</option>
              {cols.map((_, i) => (
                <option key={i} value={i}>{colLabel(grid, i, mapping.hasHeader, t.reference.columnN)}</option>
              ))}
            </select>
          </label>
          <label className={s.importHeaderToggle}>
            <input
              type="checkbox"
              checked={mapping.hasHeader}
              onChange={e => setMapping(m => ({ ...m, hasHeader: e.target.checked }))}
            />
            <span>{t.reference.firstRowHeader}</span>
          </label>
        </div>

        <div className={s.importStats}>
          <span>{t.reference.willAddKnives} <strong>{prepared.knives.length}</strong></span>
        </div>

        <div className={s.importRows}>
          {prepared.knives.length === 0 && (
            <p className={s.importSkipped}>{t.reference.noRowsToImport}</p>
          )}
          {prepared.knives.map(k => {
            const val = valueOf(k)
            const c = classify(val)
            const suggestions = c.kind === 'link'
              ? []
              : (k.match?.suggestions ?? []).filter(sg => normSteel(sg.name) !== normSteel(val)).slice(0, 3)
            return (
              <div key={k.rowIndex} className={s.importRow}>
                <div className={s.importRowName}>{k.name}</div>
                <div className={s.importRowSteel}>
                  <Autocomplete
                    value={val}
                    onChange={v => setOverrides(r => ({ ...r, [k.rowIndex]: v }))}
                    suggestions={steelNames}
                    placeholder={t.reference.steelOptionalPlaceholder}
                  />
                  {c.kind === 'link' && <span className={s.steelBadgeLink}>✓ {c.ref.name}</span>}
                  {c.kind === 'create' && <span className={s.steelBadgeNew}>{t.reference.newSteelBadge}</span>}
                </div>
                {suggestions.length > 0 && (
                  <div className={s.fuzzyChips}>
                    <span className={s.fuzzyLabel}>{t.reference.similarShort}</span>
                    {suggestions.map(sg => (
                      <button
                        key={sg.name}
                        className={s.fuzzyChip}
                        onClick={() => setOverrides(r => ({ ...r, [k.rowIndex]: sg.name }))}
                      >
                        {sg.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {prepared.skipped.length > 0 && (
          <div className={s.importSkippedBlock}>
            <span className={s.importSkipped}>{t.reference.skippedRows(prepared.skipped.length)}</span>
            <div className={s.importSkippedList}>
              {prepared.skipped.map(sk => (
                <div key={sk.rowIndex} className={s.importSkippedRow}>
                  {t.reference.rowLine(sk.rowIndex + 1, sk.name || '—', skipLabel(sk.reason))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={s.addRow}>
          <button className={s.addBtn} onClick={handleImport} disabled={prepared.knives.length === 0}>
            {t.reference.importBtn(prepared.knives.length)}
          </button>
          <button
            className={s.addBtn}
            style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }}
            onClick={onClose}
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Knives ──────────────────────────────────────────────────────────────────

function KnivesTab({ search }: { search: string }) {
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState('')

  const [knifeSteel, setKnifeSteel] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importGrid, setImportGrid] = useState<string[][] | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBrand, setEditBrand] = useState('')
  const [editSteel, setEditSteel] = useState('')
  const [syncDiff, setSyncDiff] = useState<RefSyncDiff<Knife, ParsedKnifeRow> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const syncFileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()
  const t = useT()

  useEffect(() => {
    if (!open && editingId === null && syncDiff === null) return
    return startBlur()
  }, [open, editingId, syncDiff])

  const knives = useLiveQuery(() => db.knives.orderBy('brand').toArray(), [])
  const steels = useLiveQuery(() => db.steels.orderBy('name').toArray(), []) ?? []
  const steelNames = steels.map(st => st.name)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const grid = await readSpreadsheet(file)
      if (grid.length === 0) {
        showToast(t.reference.fileEmpty)
        return
      }
      setImportGrid(grid)
    } catch {
      showToast(t.reference.fileReadError)
    }
  }

  const filtered = knives?.filter(k =>
    `${k.brand} ${k.country ?? ''}`.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const filteredSelectedCount = filtered.filter(k => selected.has(k.id!)).length

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function deleteSelected() {
    await db.knives.bulkDelete([...selected])
    setSelected(new Set())
  }

  function startEdit() {
    const id = [...selected][0]
    const knife = knives?.find(k => k.id === id)
    if (!knife) return
    setEditingId(id)
    setEditBrand(knife.brand)
    setEditSteel(knife.steel ?? '')
    setSelected(new Set())
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editBrand.trim() || editingId === null) return
    await db.knives.update(editingId, {
      brand: editBrand.trim(),
      steel: editSteel.trim() || undefined,
      isCustom: true,
      updatedAt: new Date(),
    })
    setEditingId(null)
  }

  async function add() {
    if (!brand.trim()) return
    await db.knives.add({
      brand: brand.trim(),
      steel: knifeSteel.trim() || undefined,
      isCustom: true,
      updatedAt: new Date(),
    })
    setBrand(''); setKnifeSteel(''); setOpen(false)
  }

  async function handleSyncFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const grid = await readSpreadsheet(file)
      const rows = knifeRowsFromGrid(grid)
      if (grid.length === 0 || rows.length === 0) {
        showToast(t.reference.fileEmpty)
        return
      }
      setSyncDiff(diffKnives(knives ?? [], rows))
    } catch {
      showToast(t.reference.fileReadError)
    }
  }

  async function applySync() {
    if (!syncDiff) return
    const now = new Date()
    await db.transaction('rw', db.knives, async () => {
      if (syncDiff.toAdd.length > 0) {
        await db.knives.bulkAdd(syncDiff.toAdd.map(row => ({
          brand: row.brand,
          steel: row.steel,
          country: row.country,
          isCustom: true,
          updatedAt: now,
        })))
      }
      for (const u of syncDiff.toUpdate) {
        await db.knives.update(u.id, { ...u.patch, isCustom: true, updatedAt: now })
      }
      if (syncDiff.toDelete.length > 0) {
        await db.knives.bulkDelete(syncDiff.toDelete.map(k => k.id!))
      }
    })
    track('reference_sync', {
      table: 'knives',
      added: syncDiff.toAdd.length,
      updated: syncDiff.toUpdate.length,
      deleted: syncDiff.toDelete.length,
    }).catch(() => {})
    showToast(t.reference.syncDone(syncDiff.toAdd.length, syncDiff.toUpdate.length, syncDiff.toDelete.length))
    setSyncDiff(null)
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.csv"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={syncFileInputRef}
        type="file"
        accept=".xlsx,.csv"
        style={{ display: 'none' }}
        onChange={handleSyncFileSelect}
      />
      {!open && selected.size === 0 && editingId === null && (
        <>
          <button className={s.addTogglePrimary} onClick={() => setOpen(true)}>
            {t.reference.addKnife}
          </button>
          <div className={s.csvActions}>
            <button className={s.csvBtn} onClick={() => fileInputRef.current?.click()}>{t.reference.loadFromFile}</button>
          </div>
          <p className={s.importHint}>{t.reference.knivesImportHint}</p>
          <div className={s.csvActions}>
            <button className={s.csvBtn} onClick={() => downloadKnivesCSV(knives ?? [])}>{t.reference.exportCsv}</button>
            <button className={s.csvBtn} onClick={() => syncFileInputRef.current?.click()}>{t.reference.syncCsv}</button>
          </div>
          <p className={s.importHint}>{t.reference.syncHintKnives}</p>
        </>
      )}
      {importGrid && knives && (
        <KnifeImportPreview
          grid={importGrid}
          knives={knives}
          steels={steels}
          onClose={() => setImportGrid(null)}
        />
      )}
      {open && createPortal(
        <div className={s.dialogOverlay} onClick={() => setOpen(false)}>
        <div className={s.dialog} onClick={e => e.stopPropagation()}>
          <span className={s.addTitle}>{t.reference.newKnife}</span>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder={t.reference.knifeBrandPlaceholder} autoFocus />
          <div className={s.addRow}>
            <Autocomplete
              value={knifeSteel}
              onChange={setKnifeSteel}
              suggestions={steelNames}
              placeholder={t.reference.steelPlaceholder}
            />
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!brand.trim()}>{t.common.add}</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>{t.common.cancel}</button>
          </div>
        </div>
        </div>,
        document.body
      )}

      {editingId !== null && createPortal(
        <div className={s.dialogOverlay} onClick={cancelEdit}>
        <div className={s.dialog} onClick={e => e.stopPropagation()}>
          <span className={s.addTitle}>{t.reference.editKnife}</span>
          <input value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder={t.reference.knifeBrandPlaceholder} autoFocus />
          <div className={s.addRow}>
            <Autocomplete
              value={editSteel}
              onChange={setEditSteel}
              suggestions={steelNames}
              placeholder={t.reference.steelPlaceholder}
            />
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={saveEdit} disabled={!editBrand.trim()}>{t.common.save}</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={cancelEdit}>{t.common.cancel}</button>
          </div>
        </div>
        </div>,
        document.body
      )}

      <div className={s.list}>
        {filtered.length === 0 && <p className={s.empty}>{t.reference.knivesEmpty}</p>}
        {filtered.length > 0 && (
          <SelectAllRow
            total={filtered.length}
            selected={filteredSelectedCount}
            onSelectAll={() => setSelected(new Set(filtered.map(k => k.id!)))}
            onClearAll={() => setSelected(new Set())}
          />
        )}
        {filtered.map(k => {
          const sel = selected.has(k.id!)
          return (
            <div
              key={k.id}
              className={`${s.item} ${sel ? s.itemSelected : ''}`}
              onClick={() => toggle(k.id!)}
            >
              <div className={`${s.checkbox} ${sel ? s.checkboxChecked : ''}`}>
                {sel && <span className={s.checkmark}><IconCheck /></span>}
              </div>
              <div className={s.itemInfo}>
                <div className={s.itemName}>{k.brand}</div>
                <div className={s.itemMeta}>
                  {[enumLabel(t.enums.country, k.country), k.steel].filter(Boolean).join(' · ') || t.reference.noData}
                </div>
              </div>
              <div className={s.itemRight}>
                {k.isCustom && <span className={s.customBadge}>{t.reference.mineM}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          onCancel={() => setSelected(new Set())}
          onDelete={deleteSelected}
          onEdit={startEdit}
        />
      )}

      {syncDiff && (
        <RefSyncPreviewDialog
          diff={syncDiff}
          renderAdd={row => [row.brand, row.country, row.steel].filter(Boolean).join(' · ')}
          renderExisting={k => [k.brand, k.country, k.steel].filter(Boolean).join(' · ')}
          renderUpdate={(before, patch) => `${before.brand}: ${before.country ?? '—'} → ${patch.country ?? '—'}`}
          onCancel={() => setSyncDiff(null)}
          onConfirm={applySync}
        />
      )}
    </>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ReferenceScreen() {
  const { tab } = useParams<{ tab: Tab }>()
  const navigate = useNavigate()
  const activeTab: Tab = (tab as Tab) || 'stones'
  const t = useT()
  const [search, setSearch] = useState('')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showConverter, setShowConverter] = useState(false)

  useEffect(() => {
    if (!showConverter && !showHeatmap) return
    return startBlur()
  }, [showConverter, showHeatmap])

  function goTab(next: Tab) {
    setSearch('')
    navigate(`/reference/${next}`, { replace: true })
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>{t.reference.title}</span>
        {activeTab === 'stones' && (
          <>
            <button className={s.iconBtn} onClick={() => setShowConverter(true)}>
              <IconConverter />
            </button>
            <button className={s.iconBtn} onClick={() => setShowHeatmap(true)}>
              <IconHeatmap />
            </button>
            <button className={s.iconBtn} onClick={() => navigate('/games')} aria-label={t.game.hubTitle}>
              <IconGames />
            </button>
          </>
        )}
      </div>

      {showConverter && createPortal(
        <div className={s.overlay} onClick={() => setShowConverter(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetHeader}>
              <span className={s.sheetTitle}>{t.reference.gritConverter}</span>
              <button className={s.sheetClose} onClick={() => setShowConverter(false)}>✕</button>
            </div>
            <GritConverter />
          </div>
        </div>,
        document.body
      )}

      {showHeatmap && createPortal(
        <div className={s.overlay} onClick={() => setShowHeatmap(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetHeader}>
              <span className={s.sheetTitle}>{t.reference.topStones}</span>
              <button className={s.sheetClose} onClick={() => setShowHeatmap(false)}>✕</button>
            </div>
            <StoneHeatmap />
          </div>
        </div>,
        document.body
      )}

      <div className={s.tabs}>
        {TAB_VALUES.map(tabVal => (
          <button
            key={tabVal}
            className={`${s.tab} ${activeTab === tabVal ? s.active : ''}`}
            onClick={() => goTab(tabVal)}
          >
            {t.reference.tabs[tabVal]}
          </button>
        ))}
      </div>

      <div className={s.content}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon}>🔍</span>
          <input
            className={s.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'stones' ? t.reference.searchStones : t.reference.search}
          />
        </div>

        {activeTab === 'stones' && <StonesTab search={search} />}
        {activeTab === 'steels' && <SteelsTab search={search} />}
        {activeTab === 'knives' && <KnivesTab search={search} />}
        <AppLogo />
      </div>
    </div>
  )
}
