import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStatus } from '../../db/db'
import StatusPill from '../../components/StatusPill/StatusPill'
import s from './HistoryFeed.module.css'

type Filter = 'all' | SharpeningStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',      label: 'Все' },
  { value: 'accepted', label: 'Принят' },
  { value: 'inwork',   label: 'В работе' },
  { value: 'done',     label: 'Готов' },
]

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

  const data = useLiveQuery(async () => {
    const sharpenings = await db.sharpenings.orderBy('receivedAt').reverse().toArray()
    const clients = await db.clients.toArray()
    const clientMap = Object.fromEntries(clients.map(c => [c.id!, c.name]))
    return sharpenings.map(sh => ({ sh, clientName: clientMap[sh.clientId] ?? '—' }))
  }, [])

  const filtered = data?.filter(({ sh }) =>
    filter === 'all' || sh.status === filter
  ) ?? []

  // Group by month
  const groups: { key: string; items: typeof filtered }[] = []
  for (const item of filtered) {
    const key = monthKey(item.sh.receivedAt)
    const existing = groups.find(g => g.key === key)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.push({ key, items: [item] })
    }
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>ИСТОРИЯ</span>
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
        {filtered.length === 0 && (
          <p className={s.empty}>
            {filter === 'all' ? 'Заточек пока нет' : 'Нет заточек с таким статусом'}
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
      </div>
    </div>
  )
}
