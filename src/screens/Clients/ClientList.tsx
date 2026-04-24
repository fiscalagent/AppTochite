import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import Avatar from '../../components/Avatar/Avatar'
import type { Client } from '../../db/db'
import s from './ClientList.module.css'

const IconSave = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

interface ClientRow {
  client: Client
  count: number
  acceptedCount: number
  doneCount: number
}

export default function ClientList() {
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

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>КЛИЕНТЫ</span>
        <div className={s.headerRight}>
          <Link to="/backup" className={s.backupLink}><IconSave /></Link>
          <Link to="/clients/new">
            <button className={s.addBtn}>+ Клиент</button>
          </Link>
        </div>
      </div>

      <div className={s.list}>
        {rows?.length === 0 && (
          <p className={s.empty}>Нет клиентов</p>
        )}
        {rows?.map(({ client, count, acceptedCount, doneCount }) => (
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
      </div>
    </div>
  )
}
