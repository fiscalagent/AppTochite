import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db, type SharpeningStatus, type Sharpening } from '../../db/instance'
import StatusPill from '../../components/StatusPill/StatusPill'
import { useLocale, fmtMoney, fmtDateShort, fmtDateMonthYear, type Locale } from '../../i18n'
import s from './HistoryFeed.module.css'
import AppLogo from '../../components/AppLogo/AppLogo'

type Filter = 'all' | SharpeningStatus

const FILTER_VALUES: Filter[] = ['all', 'accepted', 'done']
const SEARCH_DEBOUNCE_MS = 250

// ≈ how many rows fit the screen on first load; min 10
const PAGE_SIZE = Math.max(10, Math.floor((window.innerHeight - 220) / 68))

// Стоп-сигнал для курсора Dexie: бросаем его внутри each(), чтобы прервать
// обход таблицы, как только набрали нужное для экрана количество совпадений —
// не читаем (и не разворачиваем фото) записи, которые всё равно не попадут
// на страницу.
const STOP = Symbol('stop')

type Row = { sh: Sharpening; clientName: string }

function toRow(sh: Sharpening, clientMap: Record<number, string>): Row {
  return {
    sh: { ...sh, photosBefore: sh.photosBefore?.slice(0, 1), photosAfter: sh.photosAfter?.slice(0, 1) },
    clientName: clientMap[sh.clientId] ?? '—',
  }
}

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
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const isSearching = debouncedQuery.length > 0

  useEffect(() => {
    const trimmed = query.trim().toLowerCase()
    const h = window.setTimeout(() => setDebouncedQuery(trimmed), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(h)
  }, [query])

  const filterKey = `${filter}|${debouncedQuery}`
  const [activeKey, setActiveKey] = useState(filterKey)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  if (activeKey !== filterKey) {
    setActiveKey(filterKey)
    setVisibleCount(PAGE_SIZE)
  }

  // Дешёвый точный подсчёт «сколько всего» — доступен только без текстового
  // поиска: status/deletedAt индексированы, .count() не разворачивает записи
  // (в т.ч. фото). При активном поиске точный остаток недоступен без полного
  // скана таблицы, поэтому для этого случая ниже показываем «Ещё N» без «из».
  const indexedTotal = useLiveQuery(async () => {
    if (isSearching) return undefined
    if (filter === 'all') {
      const total = await db.sharpenings.count()
      const deleted = await db.sharpenings.where('deletedAt').above(new Date(0)).count()
      return total - deleted
    }
    const total = await db.sharpenings.where('status').equals(filter).count()
    const deletedInStatus = await db.sharpenings.where('deletedAt').above(new Date(0))
      .filter(sh => sh.status === filter).count()
    return total - deletedInStatus
  }, [filter, isSearching])

  // Счётчик «заточено N» в шапке — не зависит от фильтра/поиска, поэтому
  // считается отдельно и всегда через индекс status, а не по загруженным rows.
  const doneTotal = useLiveQuery(async () => {
    const total = await db.sharpenings.where('status').equals('done').count()
    const deletedDone = await db.sharpenings.where('deletedAt').above(new Date(0))
      .filter(sh => sh.status === 'done').count()
    return total - deletedDone
  }, [])

  // Раньше здесь была db.sharpenings.orderBy('receivedAt').toArray() целиком —
  // абсолютно все заточки со всеми фото «до/после» за всё время использования,
  // при КАЖДОМ заходе на вкладку «История» (и при любой правке где-либо в
  // sharpenings, из-за реактивности useLiveQuery). Показывались при этом от
  // силы десяток строк. Теперь без поиска читаем строго visibleCount записей
  // напрямую из индекса [status+receivedAt]/receivedAt; с поиском — курсором
  // с ранней остановкой, как только набрали достаточно совпадений.
  const data = useLiveQuery(async () => {
    const clients = (await db.clients.toArray()).filter(c => !c.deletedAt)
    const clientMap = Object.fromEntries(clients.map(c => [c.id!, c.name])) as Record<number, string>

    if (!isSearching) {
      // .filter() ДО .limit() — иначе limit режет по сырому индексу (включая
      // мягко удалённые записи), а indexedTotal (и hasMore/restCount от него)
      // считает только живые: при накопленных в корзине заточках кнопка «Ещё»
      // могла пропасть раньше, чем реально подгружены все живые записи.
      const coll = filter === 'all'
        ? db.sharpenings.orderBy('receivedAt').reverse()
        : db.sharpenings.where('[status+receivedAt]')
            .between([filter, Dexie.minKey], [filter, Dexie.maxKey])
            .reverse()
      const page = await coll.filter(sh => !sh.deletedAt).limit(visibleCount).toArray()
      return page.map(sh => toRow(sh, clientMap))
    }

    const rows: Row[] = []
    try {
      await db.sharpenings.orderBy('receivedAt').reverse().each(sh => {
        if (sh.deletedAt) return
        if (filter !== 'all' && sh.status !== filter) return
        const clientName = clientMap[sh.clientId] ?? '—'
        const hit =
          sh.knifeBrand.toLowerCase().includes(debouncedQuery) ||
          clientName.toLowerCase().includes(debouncedQuery) ||
          (!!sh.steel && sh.steel.toLowerCase().includes(debouncedQuery)) ||
          (!!sh.comment && sh.comment.toLowerCase().includes(debouncedQuery))
        if (!hit) return
        rows.push(toRow(sh, clientMap))
        if (rows.length >= visibleCount + 1) throw STOP
      })
    } catch (e) {
      if (e !== STOP) throw e
    }
    return rows
  }, [filter, isSearching, debouncedQuery, visibleCount])

  const visible = isSearching ? (data ?? []).slice(0, visibleCount) : (data ?? [])
  const hasMore = isSearching
    ? (data?.length ?? 0) > visibleCount
    : indexedTotal != null && indexedTotal > visibleCount
  const restCount = !isSearching && indexedTotal != null ? indexedTotal - visibleCount : undefined

  // group visible slice by month
  const groups: { key: string; items: typeof visible }[] = []
  for (const item of visible) {
    const key = monthKey(item.sh.receivedAt)
    const existing = groups.find(g => g.key === key)
    if (existing) existing.items.push(item)
    else groups.push({ key, items: [item] })
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>{t.history.title}</span>
        {!!doneTotal && <span className={s.total}>{t.history.doneTotal(doneTotal)}</span>}
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
        {data !== undefined && visible.length === 0 && (
          <p className={s.empty}>
            {isSearching || filter !== 'all'
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
                  {isSearching && sh.comment?.toLowerCase().includes(debouncedQuery) && (
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
            {restCount != null
              ? t.history.loadMore(Math.min(PAGE_SIZE, restCount), restCount)
              : t.history.loadMoreShort(PAGE_SIZE)}
          </button>
        )}
      </div>
      <AppLogo />
    </div>
  )
}
