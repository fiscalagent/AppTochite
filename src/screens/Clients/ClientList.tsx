import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import Avatar from '../../components/Avatar/Avatar'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import type { Client } from '../../db/instance'
import s from './ClientList.module.css'

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
  const rows = useLiveQuery<ClientRow[]>(async () => {
    const clients = await db.clients.orderBy('name').toArray()
    // «Я» — всегда первый
    const sorted = [
      ...clients.filter(c => c.isSelf),
      ...clients.filter(c => !c.isSelf),
    ]

    return Promise.all(
      sorted.map(async (client) => {
        const sharpenings = await db.sharpenings
          .where('clientId').equals(client.id!)
          .toArray()
        const count = sharpenings.length
        const acceptedCount = sharpenings.filter(s => s.status === 'accepted').length
        const doneCount = sharpenings.filter(s => s.status === 'done').length
        return { client, count, acceptedCount, doneCount }
      })
    )
  }, [])

  const trimmed = query.trim()
  const visible = trimmed
    ? (rows ?? []).filter(r => matchesQuery(r.client, trimmed))
    : (rows ?? [])

  const isNewUser = !trimmed && rows !== undefined && rows.length === 1 && rows[0].client.isSelf

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>КЛИЕНТЫ</span>
        <div className={s.headerRight}>
          <Link to="/backup" className={s.backupLink}>
            <span className={s.iconWrap}>
              <IconSave />
              {hasUpdate && <span className={s.updateDot} />}
            </span>
          </Link>
          <Link to="/clients/new">
            <button className={s.addBtn}>+ Клиент</button>
          </Link>
        </div>
      </div>

      <div className={s.searchWrap}>
        <input
          className={s.search}
          type="search"
          placeholder="Поиск по имени, телефону или телеграм"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className={s.list}>
        {rows !== undefined && visible.length === 0 && (
          <p className={s.empty}>{trimmed ? 'Ничего не найдено' : 'Нет клиентов'}</p>
        )}
        {visible.map(({ client, count, acceptedCount, doneCount }) => (
          <Link key={client.id} to={`/clients/${client.id}`} className={s.card}>
            <Avatar name={client.name} size={40} isSelf={client.isSelf} />
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
                    <span className={s.statusBadgeAccepted}>{acceptedCount} принят</span>
                  )}
                  {doneCount > 0 && (
                    <span className={s.statusBadgeDone}>{doneCount} готов</span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}

        {isNewUser && (
          <div className={s.onboarding}>
            <p className={s.onboardingTitle}>С чего начать</p>
            <ul className={s.onboardingList}>
              <li>
                <span className={s.onboardingIcon}><IconUser /></span>
                <span>Раздел <strong>«Я»</strong> — личный журнал: записывайте заточки своих ножей без клиентов</span>
              </li>
              <li>
                <span className={s.onboardingIcon}><IconPlus /></span>
                <span>Нажмите <strong>«+ Клиент»</strong>, чтобы добавить первого клиента и принять нож в работу</span>
              </li>
              <li>
                <span className={s.onboardingIcon}><IconDatabase /></span>
                <Link to="/backup" className={s.onboardingLink}>Настройте бэкап</Link>
                <span>, чтобы не потерять данные</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
