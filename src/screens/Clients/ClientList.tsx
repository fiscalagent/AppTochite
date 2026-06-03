import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import Avatar from '../../components/Avatar/Avatar'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import { useT, useLocale } from '../../i18n'
import type { Locale } from '../../i18n/locale'
import type { Client } from '../../db/instance'
import s from './ClientList.module.css'
import AppLogo from '../../components/AppLogo/AppLogo'

const IconSave = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconDatabase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
  </svg>
)

interface ClientRow {
  client: Client
  count: number
  acceptedCount: number
  doneCount: number
}

function matchesQuery(client: Client, q: string): boolean {
  const low = q.toLowerCase()
  return (
    client.name.toLowerCase().includes(low) ||
    (!!client.phone && client.phone.includes(low)) ||
    (!!client.telegram && client.telegram.toLowerCase().includes(low))
  )
}

export default function ClientList() {
  const [query, setQuery] = useState('')
  const { hasUpdate } = useVersionCheck()
  const t = useT()
  const { locale, setLocale } = useLocale()
  const otherLocale: Locale = locale === 'ru' ? 'en' : 'ru'
  const rows = useLiveQuery<ClientRow[]>(async () => {
    const [allClients, sharpenings] = await Promise.all([
      db.clients.orderBy('name').toArray(),
      db.sharpenings.toArray(),
    ])
    const clients = allClients.filter(c => !c.deletedAt)
    const allSharpenings = sharpenings.filter(s => !s.deletedAt)

    const counts = new Map<number, { count: number; accepted: number; done: number }>()
    for (const sh of allSharpenings) {
      const c = counts.get(sh.clientId) ?? { count: 0, accepted: 0, done: 0 }
      c.count++
      if (sh.status === 'accepted') c.accepted++
      else if (sh.status === 'done') c.done++
      counts.set(sh.clientId, c)
    }

    // «Я» — всегда первый
    const sorted = [
      ...clients.filter(c => c.isSelf),
      ...clients.filter(c => !c.isSelf),
    ]

    return sorted.map(client => {
      const c = counts.get(client.id!) ?? { count: 0, accepted: 0, done: 0 }
      return { client, count: c.count, acceptedCount: c.accepted, doneCount: c.done }
    })
  }, [])

  const trimmed = query.trim()
  const visible = trimmed
    ? (rows ?? []).filter(r => matchesQuery(r.client, trimmed))
    : (rows ?? [])

  const isNewUser = !trimmed && rows !== undefined && rows.length === 1 && rows[0].client.isSelf

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>{t.clients.title}</span>
        <div className={s.headerRight}>
          <button className={s.langToggle} onClick={() => setLocale(otherLocale)}>
            {locale.toUpperCase()}
          </button>
          <Link to="/backup" className={s.backupLink}>
            <span className={s.iconWrap}>
              <IconSave />
              {hasUpdate && <span className={s.updateDot} />}
            </span>
          </Link>
          <Link to="/clients/new">
            <button className={s.addBtn}>{t.clients.addClient}</button>
          </Link>
        </div>
      </div>

      <div className={s.searchWrap}>
        <input
          className={s.search}
          type="search"
          placeholder={t.clients.searchPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className={s.list}>
        {rows !== undefined && visible.length === 0 && (
          <p className={s.empty}>{trimmed ? t.clients.notFound : t.clients.empty}</p>
        )}
        {visible.map(({ client, count, acceptedCount, doneCount }) => (
          <Link key={client.id} to={`/clients/${client.id}`} className={s.card}>
            <Avatar name={client.name} size={40} isSelf={client.isSelf} photo={client.avatar} />
            <div className={s.info}>
              <div className={s.name}>{client.name}</div>
              {client.phone && (
                <div className={s.meta}>{client.phone}</div>
              )}
            </div>
            <div className={s.right}>
              <span className={s.count}>{count}</span>
              {count > 0 && (
                <div className={s.statusCounts}>
                  {acceptedCount > 0 && (
                    <span className={s.statusBadgeAccepted}>{t.clients.acceptedCount(acceptedCount)}</span>
                  )}
                  {doneCount > 0 && (
                    <span className={s.statusBadgeDone}>{t.clients.doneCount(doneCount)}</span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}

        {isNewUser && (
          <div className={s.onboarding}>
            <p className={s.onboardingTitle}>{t.clients.onboarding.title}</p>
            <ul className={s.onboardingList}>
              <li>
                <span className={s.onboardingIcon}><IconUser /></span>
                <span>{t.clients.onboarding.selfPrefix}<strong>{t.clients.onboarding.selfStrong}</strong>{t.clients.onboarding.selfSuffix}</span>
              </li>
              <li>
                <span className={s.onboardingIcon}><IconPlus /></span>
                <span>{t.clients.onboarding.addPrefix}<strong>{t.clients.onboarding.addStrong}</strong>{t.clients.onboarding.addSuffix}</span>
              </li>
              <li>
                <span className={s.onboardingIcon}><IconDatabase /></span>
                <Link to="/backup" className={s.onboardingLink}>{t.clients.onboarding.backupLink}</Link>
                <span>{t.clients.onboarding.backupSuffix}</span>
              </li>
            </ul>
          </div>
        )}
      </div>
      <AppLogo />
    </div>
  )
}
