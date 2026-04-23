import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import Avatar from '../../components/Avatar/Avatar'
import StatusPill from '../../components/StatusPill/StatusPill'
import type { Client, SharpeningStatus } from '../../db/db'
import s from './ClientList.module.css'

interface ClientRow {
  client: Client
  count: number
  lastStatus?: SharpeningStatus
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
          .sortBy('receivedAt')
        const count = sharpenings.length
        const lastStatus = count > 0
          ? sharpenings[sharpenings.length - 1].status
          : undefined
        return { client, count, lastStatus }
      })
    )
  }, [])

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <span className={s.title}>КЛИЕНТЫ</span>
        <Link to="/clients/new">
          <button className={s.addBtn}>+ Клиент</button>
        </Link>
      </div>

      <div className={s.list}>
        {rows?.length === 0 && (
          <p className={s.empty}>Нет клиентов</p>
        )}
        {rows?.map(({ client, count, lastStatus }) => (
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
              {lastStatus && <StatusPill status={lastStatus} />}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
