import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SharpeningStatus } from '../../db/instance'
import StatusPill from '../../components/StatusPill/StatusPill'
import { useLocale, fmtMoney, fmtDateShort, fmtDateMonthYear, type Locale } from '../../i18n'
import s from './HistoryFeed.module.css'
import AppLogo from '../../components/AppLogo/AppLogo'

type Filter = 'all' | SharpeningStatus

const FILTER_VALUES: Filter[] = ['all', 'accepted', 'done']

// ≈ how many rows fit the screen on first load; min 10
const PAGE_SIZE = Math.max(10, Math.floor((window.innerHeight - 220) / 68))

function monthKey(date: Date | string) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string, locale: Locale) {
  const [year, month] = key.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  const label = fmtDateMonthYear(locale, d)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function dayLabel(date: Date | string, locale: Locale) {
  return fmtDateShort(locale, date)
}

export default function HistoryFeed() {
  const { t, locale } = useLocale()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const filterKey = `${filter}|${query.trim().toLowerCase()}`
  const [activeKey, setActiveKey] = useState(filterKey)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  if (activeKey !== filterKey) {
    setActiveKey(filterKey)
    setVisibleCount(PAGE_SIZE)
  }

  const data = useLiveQuery(async () => {
    const sharpenings = (await db.sharpenings.orderBy('receivedAt').reverse().toArray()).filter(s => !s.deletedAt)
    const clients = (await db.clients.toArray()).filter(c => !c.deletedAt)
    const clientMap = Object.fromEntries(clients.map(c => [c.id!, c.name]))
    return sharpenings.map(sh => ({
      sh: {
        ...sh,
        photosBefore: sh.photosBefore?.slice(0, 1),
        photosAfter: sh.photosAfter?.slice(0, 1),
      },
      clientName: clientMap[sh.clientId] ?? '—',
    }))
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
        <span className={s.title}>{t.history.title}</span>
      </div>

      <div className={s.searchWrap}>
        <input
          className={s.search}
          type="search"
          placeholder={t.history.searchPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className={s.filters}>
        {FILTER_VALUES.map(f => (
          <button
            key={f}
            className={`${s.filterChip} ${filter === f ? s.active : ''}`}
            onClick={() => setFilter(f)}
          >
            {t.history.filters[f]}
          </button>
        ))}
      </div>

      <div className={s.feed}>
        {data !== undefined && filtered.length === 0 && (
          <p className={s.empty}>
            {trimmed || filter !== 'all'
              ? t.history.notFound
              : t.history.empty}
          </p>
        )}
        {groups.map(group => (
          <div key={group.key} className={s.monthGroup}>
            <div className={s.monthLabel}>{monthLabel(group.key, locale)}</div>
            {group.items.map(({ sh, clientName }) => (
              <Link key={sh.id} to={`/sharpenings/${sh.id}`} className={s.row}>
                <div className={s.info}>
                  <div className={s.knife}>{sh.knifeBrand}</div>
                  <div className={s.meta}>{clientName}</div>
                  {trimmed && sh.comment?.toLowerCase().includes(trimmed.toLowerCase()) && (
                    <div className={s.commentSnippet}>
                      {sh.comment.length > 70 ? sh.comment.slice(0, 70) + '…' : sh.comment}
                    </div>
                  )}
                </div>
                {(() => {
                  const thumb = sh.photosAfter?.[0] ?? sh.photosBefore?.[0]
                  return thumb ? (
                    <img src={thumb} className={s.thumb} alt="" loading="lazy" decoding="async" />
                  ) : null
                })()}
                <div className={s.right}>
                  {sh.price != null && (
                    <span className={s.price}>{fmtMoney(locale, sh.price)}</span>
                  )}
                  <StatusPill status={sh.status} />
                  <span className={s.date}>{dayLabel(sh.receivedAt, locale)}</span>
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
            {t.history.loadMore(Math.min(PAGE_SIZE, filtered.length - visibleCount), filtered.length - visibleCount)}
          </button>
        )}
      </div>
      <AppLogo />
    </div>
  )
}
