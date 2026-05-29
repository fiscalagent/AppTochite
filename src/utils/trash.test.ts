import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppTochiteDB } from '../db/db'
import {
  softDeleteClient,
  softDeleteSharpening,
  restoreBatch,
  purgeBatch,
  purgeExpired,
  listTrashGroups,
  TRASH_TTL_MS,
} from './trash'

function makeDB(): AppTochiteDB {
  return new AppTochiteDB(`test-${Math.random().toString(36).slice(2)}`)
}

describe('softDeleteClient', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('помечает клиента и все его активные заточки одним batchId', async () => {
    const clientId = await db.clients.add({ name: 'Иванов', isSelf: false, createdAt: new Date() })
    await db.sharpenings.bulkAdd([
      { clientId, knifeBrand: 'A', receivedAt: new Date(), status: 'accepted' },
      { clientId, knifeBrand: 'B', receivedAt: new Date(), status: 'done', doneAt: new Date() },
      { clientId, knifeBrand: 'C', receivedAt: new Date(), status: 'accepted' },
    ])

    const batchId = await softDeleteClient(db, clientId)

    const client = await db.clients.get(clientId)
    expect(client!.deletedAt).toBeInstanceOf(Date)
    expect(client!.deletedBatchId).toBe(batchId)

    const sharpenings = await db.sharpenings.where('clientId').equals(clientId).toArray()
    expect(sharpenings).toHaveLength(3)
    for (const s of sharpenings) {
      expect(s.deletedAt).toBeInstanceOf(Date)
      expect(s.deletedBatchId).toBe(batchId)
    }
  })

  it('не задевает заточки другого клиента', async () => {
    const a = await db.clients.add({ name: 'A', isSelf: false, createdAt: new Date() })
    const b = await db.clients.add({ name: 'B', isSelf: false, createdAt: new Date() })
    await db.sharpenings.add({ clientId: a, knifeBrand: 'x', receivedAt: new Date(), status: 'accepted' })
    const bShId = await db.sharpenings.add({ clientId: b, knifeBrand: 'y', receivedAt: new Date(), status: 'accepted' })

    await softDeleteClient(db, a)
    const sb = await db.sharpenings.get(bShId)
    expect(sb!.deletedAt).toBeUndefined()
  })

  it('не перемечает уже удалённые заточки (другой batchId)', async () => {
    const clientId = await db.clients.add({ name: 'X', isSelf: false, createdAt: new Date() })
    const shId = await db.sharpenings.add({ clientId, knifeBrand: 'a', receivedAt: new Date(), status: 'accepted' })

    const firstBatch = await softDeleteSharpening(db, shId)
    const clientBatch = await softDeleteClient(db, clientId)

    expect(firstBatch).not.toBe(clientBatch)
    const sh = await db.sharpenings.get(shId)
    expect(sh!.deletedBatchId).toBe(firstBatch)
  })
})

describe('softDeleteSharpening', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('помечает одну заточку и не трогает клиента', async () => {
    const clientId = await db.clients.add({ name: 'X', isSelf: false, createdAt: new Date() })
    const shId = await db.sharpenings.add({ clientId, knifeBrand: 'нож', receivedAt: new Date(), status: 'accepted' })

    await softDeleteSharpening(db, shId)

    const sh = await db.sharpenings.get(shId)
    expect(sh!.deletedAt).toBeInstanceOf(Date)
    const c = await db.clients.get(clientId)
    expect(c!.deletedAt).toBeUndefined()
  })
})

describe('restoreBatch', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('возвращает только записи этой группы', async () => {
    const a = await db.clients.add({ name: 'A', isSelf: false, createdAt: new Date() })
    const b = await db.clients.add({ name: 'B', isSelf: false, createdAt: new Date() })
    const batchA = await softDeleteClient(db, a)
    await softDeleteClient(db, b)

    await restoreBatch(db, batchA)

    const ca = await db.clients.get(a)
    const cb = await db.clients.get(b)
    expect(ca!.deletedAt).toBeUndefined()
    expect(cb!.deletedAt).toBeInstanceOf(Date)
  })

  it('не воскрешает заточки удалённые до клиента отдельно', async () => {
    const clientId = await db.clients.add({ name: 'X', isSelf: false, createdAt: new Date() })
    const shId = await db.sharpenings.add({ clientId, knifeBrand: 'a', receivedAt: new Date(), status: 'accepted' })

    await softDeleteSharpening(db, shId)
    const batch = await softDeleteClient(db, clientId)
    await restoreBatch(db, batch)

    const c = await db.clients.get(clientId)
    expect(c!.deletedAt).toBeUndefined()
    const sh = await db.sharpenings.get(shId)
    expect(sh!.deletedAt).toBeInstanceOf(Date)
  })
})

describe('purgeExpired', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('удаляет физически записи старше 3 дней, не трогая свежие', async () => {
    const old = await db.clients.add({ name: 'old', isSelf: false, createdAt: new Date() })
    const fresh = await db.clients.add({ name: 'fresh', isSelf: false, createdAt: new Date() })

    const oldDate = new Date(Date.now() - TRASH_TTL_MS - 60_000)
    const freshDate = new Date(Date.now() - 60_000)
    await db.clients.update(old, { deletedAt: oldDate, deletedBatchId: 'b1', updatedAt: oldDate })
    await db.clients.update(fresh, { deletedAt: freshDate, deletedBatchId: 'b2', updatedAt: freshDate })

    const purged = await purgeExpired(db)
    expect(purged).toBe(1)
    expect(await db.clients.get(old)).toBeUndefined()
    expect(await db.clients.get(fresh)).toBeDefined()
  })
})

describe('purgeBatch', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('физически удаляет всю группу', async () => {
    const clientId = await db.clients.add({ name: 'X', isSelf: false, createdAt: new Date() })
    const shId = await db.sharpenings.add({ clientId, knifeBrand: 'a', receivedAt: new Date(), status: 'accepted' })
    const batch = await softDeleteClient(db, clientId)

    await purgeBatch(db, batch)

    expect(await db.clients.get(clientId)).toBeUndefined()
    expect(await db.sharpenings.get(shId)).toBeUndefined()
  })
})

describe('listTrashGroups', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('возвращает группы с клиентом и заточками', async () => {
    const clientId = await db.clients.add({ name: 'X', isSelf: false, createdAt: new Date() })
    await db.sharpenings.bulkAdd([
      { clientId, knifeBrand: 'a', receivedAt: new Date(), status: 'accepted' },
      { clientId, knifeBrand: 'b', receivedAt: new Date(), status: 'accepted' },
    ])
    const batch = await softDeleteClient(db, clientId)

    const groups = await listTrashGroups(db)
    expect(groups).toHaveLength(1)
    expect(groups[0].batchId).toBe(batch)
    expect(groups[0].client?.name).toBe('X')
    expect(groups[0].sharpenings).toHaveLength(2)
    expect(groups[0].expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('пустая корзина возвращает пустой массив', async () => {
    expect(await listTrashGroups(db)).toEqual([])
  })
})
