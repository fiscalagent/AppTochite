import { useState, useRef, useEffect, Fragment } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Stone, type GritUnit, MK_VALUES, compareStonesForSort } from '../../db/instance'
import Autocomplete from '../../components/Autocomplete/Autocomplete'
import { getGritDisplay, getGritSortValue, GRIT_TABLE, type GritDisplayMode } from '../../data/gritTable'
import s from './ReferenceScreen.module.css'
import AppLogo from '../../components/AppLogo/AppLogo'

type Tab = 'stones' | 'steels' | 'knives'

const TABS: { value: Tab; label: string }[] = [
  { value: 'stones', label: 'Камни' },
  { value: 'steels', label: 'Стали' },
  { value: 'knives', label: 'Ножи' },
]

const STONE_TYPE_LABELS: Record<string, string> = {
  galvanic: 'гальваника',
  ao: 'ОА',
  kk: 'КК',
  diamond: 'алмаз',
  elbor: 'эльбор',
  natural: 'природа',
  pritir: 'притир',
  ceramic: 'керамика',
}

const STONE_TYPE_BY_LABEL: Record<string, Stone['type']> = {
  'гальваника': 'galvanic',
  'оа':         'ao',
  'кк':         'kk',
  'алмаз':      'diamond',
  'эльбор':     'elbor',
  'природа':    'natural',
  'притир':     'pritir',
  'керамика':   'ceramic',
}

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

  return (
    <div
      className={`${s.selectAllRow} ${allSelected ? s.selectAllRowActive : ''}`}
      onClick={allSelected ? onClearAll : onSelectAll}
    >
      <div className={`${s.checkbox} ${allSelected ? s.checkboxChecked : someSelected ? s.checkboxPartial : ''}`}>
        {allSelected && <span className={s.checkmark}>✓</span>}
        {someSelected && <span className={s.checkmark}>–</span>}
      </div>
      <span className={s.selectAllLabel}>
        {allSelected ? 'Снять все' : 'Выбрать все'}
      </span>
      <span className={s.selectAllCount}>{total} шт.</span>
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

  return (
    <div className={s.selectionBar}>
      {!confirm ? (
        <>
          <span className={s.selectionCount}>Выбрано: {count}</span>
          <button className={s.cancelSelBtn} onClick={onCancel}>Отмена</button>
          {count === 1 && onEdit && (
            <button className={s.editSelBtn} onClick={onEdit}>Изменить</button>
          )}
          <button className={s.deleteSelBtn} onClick={() => setConfirm(true)}>
            Удалить ({count})
          </button>
        </>
      ) : (
        <>
          <span className={s.selectionCount}>Точно хотите удалить?</span>
          <button className={s.cancelSelBtn} onClick={() => setConfirm(false)}>Нет</button>
          <button className={s.deleteSelBtn} onClick={onDelete}>Да</button>
        </>
      )}
    </div>
  )
}

// ─── Grit Converter ──────────────────────────────────────────────────────────

const IconConverter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
    <circle cx="8"  cy="6"  r="2.5" fill="var(--bg-300)" stroke="currentColor"/>
    <circle cx="15" cy="12" r="2.5" fill="var(--bg-300)" stroke="currentColor"/>
    <circle cx="11" cy="18" r="2.5" fill="var(--bg-300)" stroke="currentColor"/>
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
  const timer = useRef<number | undefined>(undefined)
  const selectedIdxRef = useRef(selectedIdx)
  selectedIdxRef.current = selectedIdx // eslint-disable-line react-hooks/refs
  const valuesRef = useRef(values)
  valuesRef.current = values // eslint-disable-line react-hooks/refs
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect // eslint-disable-line react-hooks/refs

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = selectedIdx * ITEM_H
    if (Math.abs(el.scrollTop - target) < 2) return
    settling.current = true
    el.scrollTo({ top: target, behavior: 'smooth' })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { settling.current = false }, 600)
  }, [selectedIdx])

  // На десктопе колёсико мыши даёт delta ~100px, scroll-snap перепрыгивает на 2+
  // позиции. Перехватываем wheel и двигаем ровно на ±1.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const dir = e.deltaY > 0 ? 1 : -1
      const next = Math.max(0, Math.min(valuesRef.current.length - 1, selectedIdxRef.current + dir))
      onSelectRef.current(next)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  function handleScroll() {
    if (settling.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const idx = Math.round(el.scrollTop / ITEM_H)
      onSelect(Math.max(0, Math.min(values.length - 1, idx)))
    }, 120)
  }

  return (
    <div className={s.drumWrap}>
      <div className={s.drumHighlight} />
      <div ref={ref} className={s.drum} onScroll={handleScroll}>
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="6" height="6" rx="1"/>
    <rect x="9" y="2" width="6" height="6" rx="1"/>
    <rect x="16" y="2" width="6" height="6" rx="1"/>
    <rect x="2" y="9" width="6" height="6" rx="1"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
    <rect x="16" y="9" width="6" height="6" rx="1"/>
    <rect x="2" y="16" width="6" height="6" rx="1"/>
    <rect x="9" y="16" width="6" height="6" rx="1"/>
    <rect x="16" y="16" width="6" height="6" rx="1"/>
  </svg>
)

const HEATMAP_POSITIONS = [1, 2, 3, 4, 5] as const
const POS_LABELS: Record<number, string> = { 1: '1', 2: '2', 3: '3', 4: '4', 5: 'Фин' }

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
  const sharpenings = useLiveQuery(() => db.sharpenings.toArray(), [])

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
    return <p className={s.heatmapEmpty}>Нет данных — добавьте заточки с камнями</p>
  }

  const posTotals: Record<number, number> = {}
  for (const p of HEATMAP_POSITIONS) {
    posTotals[p] = Object.values(byPos[p] ?? {}).reduce((a, b) => a + b, 0)
  }

  return (
    <div className={s.heatmap}>
      <div className={s.heatmapCorner} />
      {HEATMAP_POSITIONS.map(p => (
        <div key={p} className={s.heatmapPosHeader}>{POS_LABELS[p]}</div>
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
                {pct >= 0.08 && (
                  <span className={s.heatmapPct}>{Math.round(pct * 100)}%</span>
                )}
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

// ─── Stones ──────────────────────────────────────────────────────────────────

function StonesTab({ search }: { search: string }) {
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState('')
  const [gritUnit, setGritUnit] = useState<GritUnit | ''>('')
  const [grit, setGrit] = useState('')
  const [gritMk, setGritMk] = useState('')
  const [type, setType] = useState<Stone['type'] | ''>('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBrand, setEditBrand] = useState('')
  const [editGritUnit, setEditGritUnit] = useState<GritUnit | ''>('')
  const [editGrit, setEditGrit] = useState('')
  const [editGritMk, setEditGritMk] = useState('')
  const [editType, setEditType] = useState<Stone['type'] | ''>('')
  const [displayUnit, setDisplayUnit] = useState<GritDisplayMode>('native')

  const stones = useLiveQuery(
    () => db.stones.toArray().then(arr => arr.sort(compareStonesForSort)),
    []
  )

  const allFiltered = stones?.filter(st => {
    if (search.startsWith('*')) {
      const typeQuery = search.slice(1).toLowerCase().trim()
      if (!typeQuery) return true
      const matchedTypes = Object.entries(STONE_TYPE_BY_LABEL)
        .filter(([label]) => label.includes(typeQuery))
        .map(([, t]) => t)
      return matchedTypes.includes(st.type as Stone['type'])
    }
    const name = `${st.brand} ${st.grit ?? ''} ${st.gritMk ?? ''}`.toLowerCase()
    return name.includes(search.toLowerCase())
  }) ?? []

  // Мои камни идут первыми, отсортированные по выбранной шкале.
  // Стандартные камни — в подвале списка, в исходном порядке.
  const filtered = (() => {
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

  async function deleteSelected() {
    await db.stones.bulkDelete([...selected])
    setSelected(new Set())
  }

  function switchEditUnit(newUnit: GritUnit | '') {
    if (newUnit === editGritUnit) return
    let row = undefined as typeof GRIT_TABLE[0] | undefined
    if (editGritUnit === 'fepa' && editGrit) row = GRIT_TABLE.find(r => r.fepa === Number(editGrit))
    else if (editGritUnit === 'jis' && editGrit) row = GRIT_TABLE.find(r => r.jis === Number(editGrit))
    else if (editGritUnit === 'mk' && editGritMk) row = GRIT_TABLE.find(r => r.gost === editGritMk)
    setEditGritUnit(newUnit)
    if (row && newUnit !== '') {
      if (newUnit === 'fepa') { setEditGrit(String(row.fepa)); setEditGritMk('') }
      else if (newUnit === 'jis') { setEditGrit(String(row.jis)); setEditGritMk('') }
      else if (newUnit === 'mk') { setEditGrit(''); setEditGritMk(row.gost) }
    } else {
      setEditGrit(''); setEditGritMk('')
    }
  }

  function startEdit() {
    const id = [...selected][0]
    const stone = stones?.find(st => st.id === id)
    if (!stone) return
    setEditingId(id)
    setEditBrand(stone.brand)
    setEditGritUnit((stone.gritUnit as GritUnit | '') ?? '')
    setEditGrit(stone.grit != null ? String(stone.grit) : '')
    setEditGritMk(stone.gritMk ?? '')
    setEditType((stone.type as Stone['type'] | '') ?? '')
    setSelected(new Set())
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editBrand.trim() || editingId === null) return
    await db.stones.update(editingId, {
      brand: editBrand.trim(),
      grit: (editGritUnit === 'fepa' || editGritUnit === 'jis') && editGrit ? Number(editGrit) : undefined,
      gritUnit: editGritUnit || undefined,
      gritMk: editGritUnit === 'mk' && editGritMk ? editGritMk : undefined,
      type: editType || undefined,
      isCustom: true,
    })
    setEditingId(null)
  }

  async function add() {
    if (!brand.trim()) return
    await db.stones.add({
      brand: brand.trim(),
      grit: (gritUnit === 'fepa' || gritUnit === 'jis') && grit ? Number(grit) : undefined,
      gritUnit: gritUnit || undefined,
      gritMk: gritUnit === 'mk' && gritMk ? gritMk : undefined,
      type: type || undefined,
      isCustom: true,
    })
    setBrand(''); setGrit(''); setGritMk(''); setGritUnit(''); setType(''); setOpen(false)
  }

  return (
    <>
      {!open && selected.size === 0 && editingId === null && (
        <button className={s.addTogglePrimary} onClick={() => setOpen(true)}>
          + Добавить камень
        </button>
      )}
      {open && (
        <div className={s.addCard}>
          <span className={s.addTitle}>Новый камень</span>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Бренд (Suehiro, Naniwa...)" autoFocus />
          <div className={s.gritUnitRow}>
            {(['fepa', 'jis', 'mk'] as const).map(u => (
              <button
                key={u}
                className={`${s.gritUnitBtn} ${gritUnit === u ? s.gritUnitActive : ''}`}
                onClick={() => { setGritUnit(u); setGrit(''); setGritMk('') }}
              >
                {u === 'mk' ? 'мк' : u.toUpperCase()}
              </button>
            ))}
          </div>
          {(gritUnit === 'fepa' || gritUnit === 'jis') && (
            <input
              value={grit}
              onChange={e => setGrit(e.target.value)}
              placeholder={`${gritUnit.toUpperCase()}, напр. 1000`}
              type="number"
              min={1}
            />
          )}
          {gritUnit === 'mk' && (
            <select className={s.select} value={gritMk} onChange={e => setGritMk(e.target.value)}>
              <option value="">Выбрать мк</option>
              {MK_VALUES.map(v => <option key={v} value={v}>{v} мк</option>)}
            </select>
          )}
          <div className={s.addRow}>
            <select className={s.select} value={type} onChange={e => setType(e.target.value as Stone['type'] | '')}>
              <option value="">иное</option>
              <option value="galvanic">Гальваника</option>
              <option value="ao">ОА</option>
              <option value="kk">КК</option>
              <option value="diamond">Алмаз</option>
              <option value="elbor">Эльбор</option>
              <option value="natural">Природа</option>
              <option value="pritir">Притир</option>
              <option value="ceramic">Керамика</option>
            </select>
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!brand.trim()}>Добавить</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      {editingId !== null && (
        <div className={s.addCard}>
          <span className={s.addTitle}>Редактировать камень</span>
          <input value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="Бренд (Suehiro, Naniwa...)" autoFocus />
          <div className={s.gritUnitRow}>
            {(['fepa', 'jis', 'mk'] as const).map(u => (
              <button
                key={u}
                className={`${s.gritUnitBtn} ${editGritUnit === u ? s.gritUnitActive : ''}`}
                onClick={() => switchEditUnit(u)}
              >
                {u === 'mk' ? 'мк' : u.toUpperCase()}
              </button>
            ))}
          </div>
          {(editGritUnit === 'fepa' || editGritUnit === 'jis') && (
            <input
              value={editGrit}
              onChange={e => setEditGrit(e.target.value)}
              placeholder={`${editGritUnit.toUpperCase()}, напр. 1000`}
              type="number"
              min={1}
            />
          )}
          {editGritUnit === 'mk' && (
            <select className={s.select} value={editGritMk} onChange={e => setEditGritMk(e.target.value)}>
              <option value="">Выбрать мк</option>
              {MK_VALUES.map(v => <option key={v} value={v}>{v} мк</option>)}
            </select>
          )}
          <div className={s.addRow}>
            <select className={s.select} value={editType} onChange={e => setEditType(e.target.value as Stone['type'] | '')}>
              <option value="">иное</option>
              <option value="galvanic">Гальваника</option>
              <option value="ao">ОА</option>
              <option value="kk">КК</option>
              <option value="diamond">Алмаз</option>
              <option value="elbor">Эльбор</option>
              <option value="natural">Природа</option>
              <option value="pritir">Притир</option>
              <option value="ceramic">Керамика</option>
            </select>
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={saveEdit} disabled={!editBrand.trim()}>Сохранить</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={cancelEdit}>Отмена</button>
          </div>
        </div>
      )}

      <div className={s.displayUnitRow}>
        {([
          ['native', 'Своя'],
          ['fepa',   'FEPA'],
          ['jis',    'JIS'],
          ['gost',   'мк'],
        ] as [GritDisplayMode, string][]).map(([unit, label]) => (
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
        {filtered.length === 0 && <p className={s.empty}>Камней нет</p>}
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
                {sel && <span className={s.checkmark}>✓</span>}
              </div>
              <div className={s.itemInfo}>
                <div className={s.itemName}>{st.brand}</div>
                <div className={s.itemMeta}>{st.type ? STONE_TYPE_LABELS[st.type] : ''}</div>
              </div>
              <div className={s.itemRight}>
                {(st.grit != null || (st.gritUnit === 'mk' && st.gritMk)) && (() => {
                  const { mainValue, mainUnit, alts } = getGritDisplay(st, displayUnit)
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
                {st.isCustom && <span className={s.customBadge}>мой</span>}
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
    </>
  )
}

// ─── Steels ──────────────────────────────────────────────────────────────────

function SteelsTab({ search }: { search: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [hrc, setHrc] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

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
    })
    setName(''); setHrc(''); setOpen(false)
  }

  return (
    <>
      {!open && selected.size === 0 && (
        <button className={s.addTogglePrimary} onClick={() => setOpen(true)}>
          + Добавить сталь
        </button>
      )}
      {open && (
        <div className={s.addCard}>
          <span className={s.addTitle}>Новая сталь</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название (AUS-8, D2, VG-10...)" autoFocus />
          <div className={s.addRow}>
            <input value={hrc} onChange={e => setHrc(e.target.value)} placeholder="HRC" type="number" />
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!name.trim()}>Добавить</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      <div className={s.list}>
        {filtered.length === 0 && <p className={s.empty}>Сталей нет</p>}
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
                {sel && <span className={s.checkmark}>✓</span>}
              </div>
              <div className={s.itemInfo}>
                <div className={s.itemName}>{st.name}</div>
                <div className={s.itemMeta}>
                  {st.hrc ? `${st.hrc} HRC` : 'нет данных'}
                </div>
              </div>
              <div className={s.itemRight}>
                {st.isCustom && <span className={s.customBadge}>моя</span>}
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
    </>
  )
}

// ─── Knives ──────────────────────────────────────────────────────────────────

function KnivesTab({ search }: { search: string }) {
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState('')

  const [knifeSteel, setKnifeSteel] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const knives = useLiveQuery(() => db.knives.orderBy('brand').toArray(), [])
  const steelNames = useLiveQuery(() => db.steels.orderBy('name').toArray().then(arr => arr.map(st => st.name)), []) ?? []

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

  async function add() {
    if (!brand.trim()) return
    await db.knives.add({
      brand: brand.trim(),
      steel: knifeSteel.trim() || undefined,
      isCustom: true,
    })
    setBrand(''); setKnifeSteel(''); setOpen(false)
  }

  return (
    <>
      {!open && selected.size === 0 && (
        <button className={s.addTogglePrimary} onClick={() => setOpen(true)}>
          + Добавить нож
        </button>
      )}
      {open && (
        <div className={s.addCard}>
          <span className={s.addTitle}>Новый нож</span>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Бренд (Mora, Victorinox...)" autoFocus />
          <div className={s.addRow}>
            <Autocomplete
              value={knifeSteel}
              onChange={setKnifeSteel}
              suggestions={steelNames}
              placeholder="Сталь"
            />
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!brand.trim()}>Добавить</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      <div className={s.list}>
        {filtered.length === 0 && <p className={s.empty}>Ножей нет</p>}
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
                {sel && <span className={s.checkmark}>✓</span>}
              </div>
              <div className={s.itemInfo}>
                <div className={s.itemName}>{k.brand}</div>
                <div className={s.itemMeta}>
                  {[k.country, k.steel].filter(Boolean).join(' · ') || 'нет данных'}
                </div>
              </div>
              <div className={s.itemRight}>
                {k.isCustom && <span className={s.customBadge}>мой</span>}
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
    </>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ReferenceScreen() {
  const { tab } = useParams<{ tab: Tab }>()
  const navigate = useNavigate()
  const activeTab: Tab = (tab as Tab) || 'stones'
  const [search, setSearch] = useState('')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showConverter, setShowConverter] = useState(false)

  function goTab(t: Tab) {
    setSearch('')
    navigate(`/reference/${t}`, { replace: true })
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>СПРАВОЧНИК</span>
        {activeTab === 'stones' && (
          <>
            <button className={s.iconBtn} onClick={() => setShowConverter(true)}>
              <IconConverter />
            </button>
            <button className={s.iconBtn} onClick={() => setShowHeatmap(true)}>
              <IconHeatmap />
            </button>
          </>
        )}
      </div>

      {showConverter && (
        <div className={s.overlay} onClick={() => setShowConverter(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetHeader}>
              <span className={s.sheetTitle}>Конвертер гритности</span>
              <button className={s.sheetClose} onClick={() => setShowConverter(false)}>✕</button>
            </div>
            <GritConverter />
          </div>
        </div>
      )}

      {showHeatmap && (
        <div className={s.overlay} onClick={() => setShowHeatmap(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetHeader}>
              <span className={s.sheetTitle}>Топ камней по позициям</span>
              <button className={s.sheetClose} onClick={() => setShowHeatmap(false)}>✕</button>
            </div>
            <StoneHeatmap />
          </div>
        </div>
      )}

      <div className={s.tabs}>
        {TABS.map(t => (
          <button
            key={t.value}
            className={`${s.tab} ${activeTab === t.value ? s.active : ''}`}
            onClick={() => goTab(t.value)}
          >
            {t.label}
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
            placeholder={activeTab === 'stones' ? 'Поиск... или *алмаз по типу' : 'Поиск...'}
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
