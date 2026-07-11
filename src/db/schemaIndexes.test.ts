import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie from 'dexie'
import { AppTochiteDB, type SharpeningStatus } from './db'

// Проверяет составные индексы v10 ([clientId+status], [clientId+knifeBrand]),
// добавленные для дешёвых key-only подсчётов в ClientList и SharpeningForm —
// без них пришлось бы гонять sharpenings.toArray() целиком (с фото) только
// чтобы посчитать циферки/частоту брендов. Здесь воспроизводится та же логика
// подсчёта, что инлайн в компонентах, на реальной (fake-indexeddb) БД.

function makeDB(): AppTochiteDB {
  return new AppTochiteDB(`test-schema-idx-${Math.random().toString(36).slice(2)}`)
}

describe('[clientId+status] — счётчики клиента', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('считает total/accepted/done по .keys(), вычитая мягко удалённые', async () => {
    const clientA = await db.clients.add({ name: 'A', isSelf: false, createdAt: new Date() })
    const clientB = await db.clients.add({ name: 'B', isSelf: false, createdAt: new Date() })

    await db.sharpenings.bulkAdd([
      { clientId: clientA, knifeBrand: 'K1', receivedAt: new Date(), status: 'accepted' },
      { clientId: clientA, knifeBrand: 'K2', receivedAt: new Date(), status: 'accepted' },
      { clientId: clientA, knifeBrand: 'K3', receivedAt: new Date(), status: 'done', doneAt: new Date() },
      // Мягко удалённая — не должна попасть в итоговый счёт клиента A.
      { clientId: clientA, knifeBrand: 'K4', receivedAt: new Date(), status: 'accepted', deletedAt: new Date() },
      { clientId: clientB, knifeBrand: 'K5', receivedAt: new Date(), status: 'done', doneAt: new Date() },
    ])

    const statusKeys = await db.sharpenings.orderBy('[clientId+status]').keys() as unknown as [number, SharpeningStatus][]
    const deleted = await db.sharpenings.where('deletedAt').above(new Date(0)).toArray()

    const counts = new Map<number, { count: number; accepted: number; done: number }>()
    const bump = (clientId: number, status: SharpeningStatus, delta: number) => {
      const c = counts.get(clientId) ?? { count: 0, accepted: 0, done: 0 }
      c.count += delta
      if (status === 'accepted') c.accepted += delta
      else if (status === 'done') c.done += delta
      counts.set(clientId, c)
    }
    for (const [clientId, status] of statusKeys) bump(clientId, status, 1)
    for (const sh of deleted) bump(sh.clientId, sh.status, -1)

    expect(counts.get(clientA)).toEqual({ count: 3, accepted: 2, done: 1 })
    expect(counts.get(clientB)).toEqual({ count: 1, accepted: 0, done: 1 })
  })
})

describe('[clientId+knifeBrand] — частота брендов для подсказок', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('исключает мягко удалённые заточки из частоты', async () => {
    const clientId = await db.clients.add({ name: 'A', isSelf: false, createdAt: new Date() })
    const otherId = await db.clients.add({ name: 'B', isSelf: false, createdAt: new Date() })

    await db.sharpenings.bulkAdd([
      { clientId, knifeBrand: 'Opinel', receivedAt: new Date(), status: 'accepted' },
      { clientId, knifeBrand: 'Opinel', receivedAt: new Date(), status: 'done', doneAt: new Date() },
      { clientId, knifeBrand: 'Opinel', receivedAt: new Date(), status: 'accepted', deletedAt: new Date() },
      { clientId, knifeBrand: 'Victorinox', receivedAt: new Date(), status: 'accepted' },
      { clientId: otherId, knifeBrand: 'ShouldNotCount', receivedAt: new Date(), status: 'accepted' },
    ])

    const pairs = await db.sharpenings
      .where('[clientId+knifeBrand]')
      .between([clientId, Dexie.minKey], [clientId, Dexie.maxKey])
      .keys() as unknown as [number, string][]
    const freq = new Map<string, number>()
    for (const [, brand] of pairs) freq.set(brand, (freq.get(brand) ?? 0) + 1)
    const deleted = await db.sharpenings.where('deletedAt').above(new Date(0))
      .and(sh => sh.clientId === clientId).toArray()
    for (const sh of deleted) freq.set(sh.knifeBrand, (freq.get(sh.knifeBrand) ?? 0) - 1)

    expect(freq.get('Opinel')).toBe(2)
    expect(freq.get('Victorinox')).toBe(1)
    expect(freq.has('ShouldNotCount')).toBe(false)
  })
})
