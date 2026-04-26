import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStatus } from '../../db/db'
import StatusPill from '../../components/StatusPill/StatusPill'
import s from './HistoryFeed.module.css'

type Filter = 'all' | SharpeningStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',      label: 'Все' },
  { value: 'accepted', label: 'Принят' },
  { value: 'done',     label: 'Готов' },
]

// ≈ how many rows fit the screen on first load; min 10
const PAGE_SIZE = Math.max(10, Math.floor((window.innerHeight - 220) / 68))

function monthKey(date: Date | string) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  const label = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function dayLabel(date: Date | string) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function HistoryFeed() {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const data = useLiveQuery(async () => {
    const sharpenings = await db.sharpenings.orderBy('receivedAt').reverse().toArray()
    const clients = await db.clients.toArray()
    const clientMap = Object.fromEntries(clients.map(c => [c.id!, c.name]))
    return sharpenings.map(sh => ({ sh, clientName: clientMap[sh.clientId] ?? '—' }))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? []).filter(({ sh, clientName }) => {
      if (filter !== 'all' && sh.status !== filter) return false
      if (!q) return true
      return (
        sh.knifeBrand.toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q) ||
        (!!sh.steel && sh.steel.toLowerCase().includes(q)) ||
        (!!sh.comment && sh.comment.toLowerCase().includes(q))
      )
    })
  }, [data, filter, query])

  // reset pagination when search or filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE) // eslint-disable-line react-hooks/set-state-in-effect
  }, [filter, query])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // group visible slice by month
  const groups: { key: string; items: typeof visible }[] = []
  for (const item of visible) {
    const key = monthKey(item.sh.receivedAt)
    const existing = groups.find(g => g.key === key)
    if (existing) existing.items.push(item)
    else groups.push({ key, items: [item] })
  }

  const trimmed = query.trim()

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>ИСТОРИЯ</span>
      </div>

      <div className={s.searchWrap}>
        <input
          className={s.search}
          type="search"
          placeholder="Поиск по ножу, клиенту, стали..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className={s.filters}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`${s.filterChip} ${filter === f.value ? s.active : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={s.feed}>
        {data !== undefined && filtered.length === 0 && (
          <p className={s.empty}>
            {trimmed || filter !== 'all'
              ? 'Ничего не найдено'
              : 'Заточек пока нет'}
          </p>
        )}
        {groups.map(group => (
          <div key={group.key} className={s.monthGroup}>
            <div className={s.monthLabel}>{monthLabel(group.key)}</div>
            {group.items.map(({ sh, clientName }) => (
              <Link key={sh.id} to={`/sharpenings/${sh.id}`} className={s.row}>
                <div className={s.info}>
                  <div className={s.knife}>{sh.knifeBrand}</div>
                  <div className={s.meta}>{clientName}</div>
                </div>
                <div className={s.right}>
                  {sh.price != null && (
                    <span className={s.price}>{sh.price} ₽</span>
                  )}
                  <StatusPill status={sh.status} />
                  <span className={s.date}>{dayLabel(sh.receivedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}

        {hasMore && (
          <button
            className={s.loadMore}
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          >
            Ещё {Math.min(PAGE_SIZE, filtered.length - visibleCount)} из {filtered.length - visibleCount}
          </button>
        )}
      </div>
    </div>
  )
}
