import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppTochiteDB } from './db'

function makeDB(): AppTochiteDB {
  return new AppTochiteDB(`test-${Math.random().toString(36).slice(2)}`)
}

// ─── Клиенты ─────────────────────────────────────────────────────────────────

describe('Клиенты', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('создаёт клиента и возвращает id', async () => {
    const id = await db.clients.add({ name: 'Иванов', isSelf: false, createdAt: new Date() })
    expect(id).toBeGreaterThan(0)
    const client = await db.clients.get(id)
    expect(client?.name).toBe('Иванов')
  })

  it('создаёт клиента isSelf', async () => {
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    const self = await db.clients.filter(c => c.isSelf).first()
    expect(self).toBeDefined()
    expect(self!.name).toBe('Я')
  })

  it('редактирует клиента', async () => {
    const id = await db.clients.add({ name: 'Старое', isSelf: false, createdAt: new Date() })
    await db.clients.update(id, { name: 'Новое', phone: '+79001234567' })
    const updated = await db.clients.get(id)
    expect(updated?.name).toBe('Новое')
    expect(updated?.phone).toBe('+79001234567')
  })

  it('удаляет клиента', async () => {
    const id = await db.clients.add({ name: 'Удалить', isSelf: false, createdAt: new Date() })
    await db.clients.delete(id)
    const deleted = await db.clients.get(id)
    expect(deleted).toBeUndefined()
  })

  it('удаление клиента каскадно удаляет его заточки', async () => {
    const clientId = await db.clients.add({ name: 'Клиент', isSelf: false, createdAt: new Date() })
    await db.sharpenings.add({ clientId, knifeBrand: 'Нож', receivedAt: new Date(), status: 'accepted' })
    await db.sharpenings.add({ clientId, knifeBrand: 'Нож 2', receivedAt: new Date(), status: 'accepted' })

    await db.transaction('rw', [db.clients, db.sharpenings], async () => {
      await db.sharpenings.where('clientId').equals(clientId).delete()
      await db.clients.delete(clientId)
    })

    const remaining = await db.sharpenings.where('clientId').equals(clientId).toArray()
    expect(remaining).toHaveLength(0)
    expect(await db.clients.get(clientId)).toBeUndefined()
  })

  it('хранит телефон и telegram как необязательные поля', async () => {
    const id = await db.clients.add({
      name: 'Петров', isSelf: false, createdAt: new Date(),
      phone: '+79999999999', telegram: '@petrov',
    })
    const c = await db.clients.get(id)
    expect(c?.phone).toBe('+79999999999')
    expect(c?.telegram).toBe('@petrov')
  })
})

// ─── Заточки ──────────────────────────────────────────────────────────────────

describe('Заточки', () => {
  let db: AppTochiteDB
  let clientId: number

  beforeEach(async () => {
    db = makeDB()
    await db.open()
    clientId = await db.clients.add({ name: 'Клиент', isSelf: false, createdAt: new Date() })
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('создаёт заточку со статусом accepted', async () => {
    const id = await db.sharpenings.add({
      clientId, knifeBrand: 'Victorinox', receivedAt: new Date(), status: 'accepted',
    })
    const sh = await db.sharpenings.get(id)
    expect(sh?.status).toBe('accepted')
    expect(sh?.doneAt).toBeUndefined()
  })

  it('заточка со статусом done содержит doneAt', async () => {
    const doneAt = new Date('2026-01-15')
    const id = await db.sharpenings.add({
      clientId, knifeBrand: 'Mora', receivedAt: new Date('2026-01-10'),
      status: 'done', doneAt,
    })
    const sh = await db.sharpenings.get(id)
    expect(sh?.status).toBe('done')
    expect(sh?.doneAt?.toISOString()).toBe(doneAt.toISOString())
  })

  it('stones сохраняются как embedded JSON', async () => {
    const stones = [{ name: 'Naniwa 1000', order: 1 }, { name: 'Shapton 3000', order: 2 }]
    const id = await db.sharpenings.add({
      clientId, knifeBrand: 'Нож', receivedAt: new Date(), status: 'accepted', stones,
    })
    const sh = await db.sharpenings.get(id)
    expect(sh?.stones).toEqual(stones)
    expect(sh?.stones).toHaveLength(2)
  })

  it('фото сохраняются в base64', async () => {
    const id = await db.sharpenings.add({
      clientId, knifeBrand: 'Нож', receivedAt: new Date(), status: 'done',
      photosBefore: ['data:image/jpeg;base64,abc'],
      photosAfter: ['data:image/jpeg;base64,def'],
    })
    const sh = await db.sharpenings.get(id)
    expect(sh?.photosBefore).toEqual(['data:image/jpeg;base64,abc'])
    expect(sh?.photosAfter).toEqual(['data:image/jpeg;base64,def'])
  })

  it('удаляет одно фото из массива', async () => {
    const photos = ['data:image/jpeg;base64,a', 'data:image/jpeg;base64,b', 'data:image/jpeg;base64,c']
    const id = await db.sharpenings.add({
      clientId, knifeBrand: 'Нож', receivedAt: new Date(), status: 'done',
      photosBefore: photos,
    })
    const sh = await db.sharpenings.get(id)
    const newPhotos = sh!.photosBefore!.filter((_, i) => i !== 1)
    await db.sharpenings.update(id, { photosBefore: newPhotos })

    const updated = await db.sharpenings.get(id)
    expect(updated?.photosBefore).toHaveLength(2)
    expect(updated?.photosBefore).toEqual([
      'data:image/jpeg;base64,a',
      'data:image/jpeg;base64,c',
    ])
  })

  it('редактирует заточку: меняет статус на done', async () => {
    const id = await db.sharpenings.add({
      clientId, knifeBrand: 'Нож', receivedAt: new Date(), status: 'accepted',
    })
    const doneAt = new Date()
    await db.sharpenings.update(id, { status: 'done', doneAt })
    const sh = await db.sharpenings.get(id)
    expect(sh?.status).toBe('done')
    expect(sh?.doneAt).toBeDefined()
  })

  it('удаляет заточку', async () => {
    const id = await db.sharpenings.add({
      clientId, knifeBrand: 'Нож', receivedAt: new Date(), status: 'accepted',
    })
    await db.sharpenings.delete(id)
    expect(await db.sharpenings.get(id)).toBeUndefined()
  })

  it('фильтрация по clientId', async () => {
    const otherId = await db.clients.add({ name: 'Другой', isSelf: false, createdAt: new Date() })
    await db.sharpenings.add({ clientId, knifeBrand: 'Нож А', receivedAt: new Date(), status: 'accepted' })
    await db.sharpenings.add({ clientId, knifeBrand: 'Нож Б', receivedAt: new Date(), status: 'accepted' })
    await db.sharpenings.add({ clientId: otherId, knifeBrand: 'Чужой', receivedAt: new Date(), status: 'accepted' })

    const mine = await db.sharpenings.where('clientId').equals(clientId).toArray()
    expect(mine).toHaveLength(2)
    expect(mine.every(s => s.clientId === clientId)).toBe(true)
  })

  it('фильтрация по статусу', async () => {
    await db.sharpenings.add({ clientId, knifeBrand: 'А', receivedAt: new Date(), status: 'accepted' })
    await db.sharpenings.add({ clientId, knifeBrand: 'Б', receivedAt: new Date(), status: 'done', doneAt: new Date() })
    await db.sharpenings.add({ clientId, knifeBrand: 'В', receivedAt: new Date(), status: 'accepted' })

    const done = await db.sharpenings.where('status').equals('done').toArray()
    expect(done).toHaveLength(1)
    expect(done[0].knifeBrand).toBe('Б')
  })
})

// ─── Камни ───────────────────────────────────────────────────────────────────

describe('Камни', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('создаёт камень с обязательными полями', async () => {
    const id = await db.stones.add({ brand: 'Shapton', type: 'ao', isCustom: true })
    const stone = await db.stones.get(id)
    expect(stone?.brand).toBe('Shapton')
    expect(stone?.type).toBe('ao')
    expect(stone?.isCustom).toBe(true)
  })

  it('создаёт камень без гритности (необязательное поле)', async () => {
    const id = await db.stones.add({ brand: 'Притир', type: 'pritir', isCustom: true })
    const stone = await db.stones.get(id)
    expect(stone?.grit).toBeUndefined()
  })

  it('создаёт камни всех 7 типов', async () => {
    const types = ['galvanic', 'ao', 'kk', 'diamond', 'elbor', 'natural', 'pritir'] as const
    for (const type of types) {
      const id = await db.stones.add({ brand: `Камень ${type}`, type, isCustom: false })
      const stone = await db.stones.get(id)
      expect(stone?.type).toBe(type)
    }
  })

  it('удаляет кастомный камень', async () => {
    const id = await db.stones.add({ brand: 'Удалить', type: 'ao', isCustom: true })
    await db.stones.delete(id)
    expect(await db.stones.get(id)).toBeUndefined()
  })

  it('фильтрует кастомные камни', async () => {
    await db.stones.bulkAdd([
      { brand: 'Seed камень', type: 'ao', isCustom: false },
      { brand: 'Мой камень', type: 'diamond', isCustom: true },
    ])
    const custom = await db.stones.filter(s => s.isCustom).toArray()
    expect(custom).toHaveLength(1)
    expect(custom[0].brand).toBe('Мой камень')
  })
})

// ─── Стали ────────────────────────────────────────────────────────────────────

describe('Стали', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('создаёт сталь', async () => {
    const id = await db.steels.add({ name: 'VG-10', isCustom: true })
    const steel = await db.steels.get(id)
    expect(steel?.name).toBe('VG-10')
  })

  it('создаёт сталь с HRC и рекомендуемым углом', async () => {
    const id = await db.steels.add({ name: 'S90V', hrc: 64, recommendedAngle: 15, isCustom: true })
    const steel = await db.steels.get(id)
    expect(steel?.hrc).toBe(64)
    expect(steel?.recommendedAngle).toBe(15)
  })

  it('удаляет сталь', async () => {
    const id = await db.steels.add({ name: 'Удалить', isCustom: true })
    await db.steels.delete(id)
    expect(await db.steels.get(id)).toBeUndefined()
  })
})

// ─── Ножи ─────────────────────────────────────────────────────────────────────

describe('Ножи', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('создаёт нож', async () => {
    const id = await db.knives.add({ brand: 'Victorinox', isCustom: true })
    const knife = await db.knives.get(id)
    expect(knife?.brand).toBe('Victorinox')
  })

  it('создаёт нож с полными данными', async () => {
    const id = await db.knives.add({
      brand: 'Spyderco', country: 'USA', steel: 'S30V',
      recommendedAngle: 17, type: 'folder', isCustom: true,
    })
    const knife = await db.knives.get(id)
    expect(knife?.country).toBe('USA')
    expect(knife?.steel).toBe('S30V')
    expect(knife?.recommendedAngle).toBe(17)
  })

  it('удаляет нож', async () => {
    const id = await db.knives.add({ brand: 'Удалить', isCustom: true })
    await db.knives.delete(id)
    expect(await db.knives.get(id)).toBeUndefined()
  })

  it('массовое удаление нескольких ножей', async () => {
    const ids = await db.knives.bulkAdd([
      { brand: 'Нож 1', isCustom: true },
      { brand: 'Нож 2', isCustom: true },
      { brand: 'Нож 3', isCustom: false },
    ], { allKeys: true })
    await db.knives.bulkDelete(ids.slice(0, 2) as number[])
    const remaining = await db.knives.toArray()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].brand).toBe('Нож 3')
  })
})

// ─── Meta ─────────────────────────────────────────────────────────────────────

describe('Meta', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('хранит seedVersion', async () => {
    await db.meta.put({ key: 'seedVersion', value: 1 })
    const record = await db.meta.get('seedVersion')
    expect(record?.value).toBe(1)
  })

  it('обновляет значение по ключу', async () => {
    await db.meta.put({ key: 'seedVersion', value: 1 })
    await db.meta.put({ key: 'seedVersion', value: 2 })
    const record = await db.meta.get('seedVersion')
    expect(record?.value).toBe(2)
  })
})
