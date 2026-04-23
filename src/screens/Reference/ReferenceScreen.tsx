import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Stone } from '../../db/db'
import s from './ReferenceScreen.module.css'

type Tab = 'stones' | 'steels' | 'knives'

const TABS: { value: Tab; label: string }[] = [
  { value: 'stones', label: 'Камни' },
  { value: 'steels', label: 'Стали' },
  { value: 'knives', label: 'Ножи' },
]

const STONE_TYPE_LABELS: Record<string, string> = {
  water: 'водный', oil: 'масляный', diamond: 'алмазный',
}

// ─── Stones ──────────────────────────────────────────────────────────────────

function StonesTab({ search }: { search: string }) {
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState('')
  const [grit, setGrit] = useState('')
  const [type, setType] = useState<Stone['type']>('water')

  const stones = useLiveQuery(() => db.stones.orderBy('grit').toArray(), [])

  const filtered = stones?.filter(st =>
    `${st.brand} ${st.grit}`.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  async function add() {
    if (!brand.trim() || !grit) return
    await db.stones.add({ brand: brand.trim(), grit: Number(grit), type, isCustom: true })
    setBrand(''); setGrit(''); setOpen(false)
  }

  return (
    <>
      <div className={s.list}>
        {filtered.length === 0 && <p className={s.empty}>Камней нет</p>}
        {filtered.map(st => (
          <div key={st.id} className={s.item}>
            <div className={s.itemInfo}>
              <div className={s.itemName}>{st.brand}</div>
              <div className={s.itemMeta}>{STONE_TYPE_LABELS[st.type]}</div>
            </div>
            <div className={s.itemRight}>
              <span className={s.gritBadge}>{st.grit}</span>
              {st.isCustom && <span className={s.customBadge}>мой</span>}
              <button className={s.deleteItemBtn} onClick={() => db.stones.delete(st.id!)}>×</button>
            </div>
          </div>
        ))}
      </div>

      {!open && (
        <button className={s.addToggle} onClick={() => setOpen(true)}>
          <span className={s.addToggleIcon}>+</span>
          Добавить камень
        </button>
      )}
      {open && (
        <div className={s.addCard}>
          <span className={s.addTitle}>Новый камень</span>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Бренд (Suehiro, Naniwa...)" />
          <div className={s.addRow}>
            <input value={grit} onChange={e => setGrit(e.target.value)} placeholder="Грит (1000)" type="number" min={1} />
            <select className={s.select} value={type} onChange={e => setType(e.target.value as Stone['type'])}>
              <option value="water">Водный</option>
              <option value="oil">Масляный</option>
              <option value="diamond">Алмазный</option>
            </select>
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!brand.trim() || !grit}>Добавить</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Steels ──────────────────────────────────────────────────────────────────

function SteelsTab({ search }: { search: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [hrc, setHrc] = useState('')
  const [angle, setAngle] = useState('')

  const steels = useLiveQuery(() => db.steels.orderBy('name').toArray(), [])

  const filtered = steels?.filter(st =>
    st.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  async function add() {
    if (!name.trim()) return
    await db.steels.add({
      name: name.trim(),
      hrc: hrc ? Number(hrc) : undefined,
      recommendedAngle: angle ? Number(angle) : undefined,
      isCustom: true,
    })
    setName(''); setHrc(''); setAngle(''); setOpen(false)
  }

  return (
    <>
      <div className={s.list}>
        {filtered.length === 0 && <p className={s.empty}>Сталей нет</p>}
        {filtered.map(st => (
          <div key={st.id} className={s.item}>
            <div className={s.itemInfo}>
              <div className={s.itemName}>{st.name}</div>
              <div className={s.itemMeta}>
                {[st.hrc && `${st.hrc} HRC`, st.recommendedAngle && `${st.recommendedAngle}°`]
                  .filter(Boolean).join(' · ') || 'нет данных'}
              </div>
            </div>
            <div className={s.itemRight}>
              {st.isCustom && <span className={s.customBadge}>моя</span>}
              <button className={s.deleteItemBtn} onClick={() => db.steels.delete(st.id!)}>×</button>
            </div>
          </div>
        ))}
      </div>

      {!open && (
        <button className={s.addToggle} onClick={() => setOpen(true)}>
          <span className={s.addToggleIcon}>+</span>
          Добавить сталь
        </button>
      )}
      {open && (
        <div className={s.addCard}>
          <span className={s.addTitle}>Новая сталь</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название (AUS-8, D2, VG-10...)" autoFocus />
          <div className={s.addRow}>
            <input value={hrc} onChange={e => setHrc(e.target.value)} placeholder="HRC" type="number" />
            <input value={angle} onChange={e => setAngle(e.target.value)} placeholder="Угол °" type="number" />
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!name.trim()}>Добавить</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Knives ──────────────────────────────────────────────────────────────────

function KnivesTab({ search }: { search: string }) {
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState('')
  const [country, setCountry] = useState('')
  const [knifeSteel, setKnifeSteel] = useState('')

  const knives = useLiveQuery(() => db.knives.orderBy('brand').toArray(), [])

  const filtered = knives?.filter(k =>
    `${k.brand} ${k.country ?? ''}`.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  async function add() {
    if (!brand.trim()) return
    await db.knives.add({
      brand: brand.trim(),
      country: country.trim() || undefined,
      steel: knifeSteel.trim() || undefined,
      isCustom: true,
    })
    setBrand(''); setCountry(''); setKnifeSteel(''); setOpen(false)
  }

  return (
    <>
      <div className={s.list}>
        {filtered.length === 0 && <p className={s.empty}>Ножей нет</p>}
        {filtered.map(k => (
          <div key={k.id} className={s.item}>
            <div className={s.itemInfo}>
              <div className={s.itemName}>{k.brand}</div>
              <div className={s.itemMeta}>
                {[k.country, k.steel].filter(Boolean).join(' · ') || 'нет данных'}
              </div>
            </div>
            <div className={s.itemRight}>
              {k.isCustom && <span className={s.customBadge}>мой</span>}
              <button className={s.deleteItemBtn} onClick={() => db.knives.delete(k.id!)}>×</button>
            </div>
          </div>
        ))}
      </div>

      {!open && (
        <button className={s.addToggle} onClick={() => setOpen(true)}>
          <span className={s.addToggleIcon}>+</span>
          Добавить нож
        </button>
      )}
      {open && (
        <div className={s.addCard}>
          <span className={s.addTitle}>Новый нож</span>
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Бренд (Mora, Victorinox...)" autoFocus />
          <div className={s.addRow}>
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Страна" />
            <input value={knifeSteel} onChange={e => setKnifeSteel(e.target.value)} placeholder="Сталь" />
          </div>
          <div className={s.addRow}>
            <button className={s.addBtn} onClick={add} disabled={!brand.trim()}>Добавить</button>
            <button className={s.addBtn} style={{ background: 'var(--bg-400)', color: 'var(--text-200)' }} onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </div>
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

  function goTab(t: Tab) {
    setSearch('')
    navigate(`/reference/${t}`, { replace: true })
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>СПРАВОЧНИК</span>
      </div>

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
            placeholder="Поиск..."
          />
        </div>

        {activeTab === 'stones' && <StonesTab search={search} />}
        {activeTab === 'steels' && <SteelsTab search={search} />}
        {activeTab === 'knives' && <KnivesTab search={search} />}
      </div>
    </div>
  )
}
