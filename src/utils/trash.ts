import type { AppTochiteDB, Client, Sharpening } from '../db/instance'
import { uuid } from './uuid'

export const TRASH_TTL_MS = 3 * 24 * 60 * 60 * 1000

export async function softDeleteClient(database: AppTochiteDB, clientId: number): Promise<string> {
  const batchId = uuid()
  const now = new Date()
  await database.transaction('rw', [database.clients, database.sharpenings], async () => {
    await database.clients.update(clientId, { deletedAt: now, deletedBatchId: batchId, updatedAt: now })
    const sharpenings = await database.sharpenings.where('clientId').equals(clientId).toArray()
    for (const sh of sharpenings) {
      if (sh.deletedAt || sh.id == null) continue
      await database.sharpenings.update(sh.id, { deletedAt: now, deletedBatchId: batchId, updatedAt: now })
    }
  })
  return batchId
}

export async function softDeleteSharpening(database: AppTochiteDB, sharpeningId: number): Promise<string> {
  const batchId = uuid()
  const now = new Date()
  await database.sharpenings.update(sharpeningId, { deletedAt: now, deletedBatchId: batchId, updatedAt: now })
  return batchId
}

export async function restoreBatch(database: AppTochiteDB, batchId: string): Promise<void> {
  const now = new Date()
  await database.transaction('rw', [database.clients, database.sharpenings], async () => {
    const clients = await database.clients.where('deletedAt').above(new Date(0)).toArray()
    for (const c of clients) {
      if (c.deletedBatchId === batchId && c.id != null) {
        await database.clients.update(c.id, { deletedAt: undefined, deletedBatchId: undefined, updatedAt: now })
      }
    }
    const sharpenings = await database.sharpenings.where('deletedAt').above(new Date(0)).toArray()
    for (const s of sharpenings) {
      if (s.deletedBatchId === batchId && s.id != null) {
        await database.sharpenings.update(s.id, { deletedAt: undefined, deletedBatchId: undefined, updatedAt: now })
      }
    }
  })
}

export async function purgeBatch(database: AppTochiteDB, batchId: string): Promise<void> {
  await database.transaction('rw', [database.clients, database.sharpenings], async () => {
    const clients = await database.clients.where('deletedAt').above(new Date(0)).toArray()
    for (const c of clients) {
      if (c.deletedBatchId === batchId && c.id != null) {
        await database.clients.delete(c.id)
      }
    }
    const sharpenings = await database.sharpenings.where('deletedAt').above(new Date(0)).toArray()
    for (const s of sharpenings) {
      if (s.deletedBatchId === batchId && s.id != null) {
        await database.sharpenings.delete(s.id)
      }
    }
  })
}

export async function purgeExpired(database: AppTochiteDB, now: Date = new Date()): Promise<number> {
  const threshold = new Date(now.getTime() - TRASH_TTL_MS)
  let purged = 0
  await database.transaction('rw', [database.clients, database.sharpenings], async () => {
    const expiredClients = await database.clients.where('deletedAt').between(new Date(0), threshold, true, true).toArray()
    for (const c of expiredClients) {
      if (c.id != null) {
        await database.clients.delete(c.id)
        purged++
      }
    }
    const expiredSharpenings = await database.sharpenings.where('deletedAt').between(new Date(0), threshold, true, true).toArray()
    for (const s of expiredSharpenings) {
      if (s.id != null) {
        await database.sharpenings.delete(s.id)
        purged++
      }
    }
  })
  return purged
}

export interface TrashGroup {
  batchId: string
  deletedAt: Date
  expiresAt: Date
  client?: Client
  sharpenings: Sharpening[]
}

export async function listTrashGroups(database: AppTochiteDB): Promise<TrashGroup[]> {
  const [clients, sharpenings] = await Promise.all([
    database.clients.where('deletedAt').above(new Date(0)).toArray(),
    database.sharpenings.where('deletedAt').above(new Date(0)).toArray(),
  ])
  const map = new Map<string, TrashGroup>()
  for (const c of clients) {
    if (!c.deletedBatchId || !c.deletedAt) continue
    const g = map.get(c.deletedBatchId) ?? {
      batchId: c.deletedBatchId,
      deletedAt: c.deletedAt,
      expiresAt: new Date(c.deletedAt.getTime() + TRASH_TTL_MS),
      sharpenings: [],
    }
    g.client = c
    if (c.deletedAt < g.deletedAt) g.deletedAt = c.deletedAt
    map.set(c.deletedBatchId, g)
  }
  for (const s of sharpenings) {
    if (!s.deletedBatchId || !s.deletedAt) continue
    const g = map.get(s.deletedBatchId) ?? {
      batchId: s.deletedBatchId,
      deletedAt: s.deletedAt,
      expiresAt: new Date(s.deletedAt.getTime() + TRASH_TTL_MS),
      sharpenings: [],
    }
    g.sharpenings.push(s)
    if (s.deletedAt < g.deletedAt) g.deletedAt = s.deletedAt
    map.set(s.deletedBatchId, g)
  }
  for (const g of map.values()) {
    g.expiresAt = new Date(g.deletedAt.getTime() + TRASH_TTL_MS)
  }
  return Array.from(map.values()).sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime())
}
