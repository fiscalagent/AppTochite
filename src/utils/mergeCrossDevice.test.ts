import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie from 'dexie'
import { AppTochiteDB, type Client, type Sharpening } from '../db/db'
import { mergeBackup, restoreBackup, exportBackup, type BackupFile } from './backup'
import { uuid } from './uuid'

function makeDB(name?: string): AppTochiteDB {
  return new AppTochiteDB(name ?? `test-${Math.random().toString(36).slice(2)}`)
}

function makeBackup(data: Partial<BackupFile['data']>): BackupFile {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      clients: [], sharpenings: [], stones: [], steels: [], knives: [],
      ...data,
    },
  }
}

const D = (iso: string) => new Date(iso)

describe('mergeBackup — кросс-устройственный merge по guid', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('коллизия id: «Иванов» с телефона НЕ перезаписывает «Петрова» на планшете', async () => {
    // Планшет: свой клиент №5 «Петров» со своей заточкой
    const petrovGuid = uuid()
    await db.clients.put({ id: 5, guid: petrovGuid, name: 'Петров', isSelf: false, createdAt: D('2026-01-01'), updatedAt: D('2026-01-01') })
    const petrovShId = await db.sharpenings.add({ guid: uuid(), clientId: 5, knifeBrand: 'Mora', receivedAt: D('2026-01-02'), status: 'accepted', updatedAt: D('2026-01-02') })

    // Снапшот телефона: его клиент №5 «Иванов» (другой guid, новее) + заточка Иванова
    const ivanovGuid = uuid()
    const backup = makeBackup({
      clients: [{ id: 5, guid: ivanovGuid, name: 'Иванов', isSelf: false, createdAt: D('2026-02-01'), updatedAt: D('2026-06-01') }],
      sharpenings: [{ id: petrovShId as number, guid: uuid(), clientId: 5, knifeBrand: 'Opinel', receivedAt: D('2026-02-02'), status: 'done', doneAt: D('2026-02-03'), updatedAt: D('2026-06-01') }],
    })

    const stats = await mergeBackup(db, backup)

    // Петров жив и нетронут
    const petrov = await db.clients.get(5)
    expect(petrov!.name).toBe('Петров')
    expect(petrov!.guid).toBe(petrovGuid)

    // Иванов добавлен под НОВЫМ id
    const ivanov = await db.clients.where('guid').equals(ivanovGuid).first()
    expect(ivanov).toBeDefined()
    expect(ivanov!.name).toBe('Иванов')
    expect(ivanov!.id).not.toBe(5)

    // Заточка Иванова переехала на его новый id, заточка Петрова не тронута
    const ivanovSharpenings = await db.sharpenings.where('clientId').equals(ivanov!.id!).toArray()
    expect(ivanovSharpenings).toHaveLength(1)
    expect(ivanovSharpenings[0].knifeBrand).toBe('Opinel')

    const petrovSharpenings = (await db.sharpenings.where('clientId').equals(5).toArray())
    expect(petrovSharpenings).toHaveLength(1)
    expect(petrovSharpenings[0].knifeBrand).toBe('Mora')

    expect(stats.added).toBe(2) // Иванов + его заточка
  })

  it('повторный merge того же снапшота идемпотентен (без дублей)', async () => {
    const ivanovGuid = uuid()
    const backup = makeBackup({
      clients: [{ id: 5, guid: ivanovGuid, name: 'Иванов', isSelf: false, createdAt: D('2026-02-01'), updatedAt: D('2026-06-01') }],
      sharpenings: [{ id: 9, guid: uuid(), clientId: 5, knifeBrand: 'Opinel', receivedAt: D('2026-02-02'), status: 'accepted', updatedAt: D('2026-06-01') }],
    })
    await db.clients.put({ id: 5, guid: uuid(), name: 'Петров', isSelf: false, createdAt: D('2026-01-01'), updatedAt: D('2026-01-01') })

    const first = await mergeBackup(db, backup)
    expect(first.added).toBe(2)

    const second = await mergeBackup(db, backup)
    expect(second.added).toBe(0)
    expect(second.skipped).toBeGreaterThanOrEqual(2) // updatedAt не новее → пропуск

    expect(await db.clients.count()).toBe(2)       // Петров + Иванов
    expect(await db.sharpenings.count()).toBe(1)   // одна заточка Иванова
  })

  it('правка на телефоне доезжает до планшета через guid (LWW)', async () => {
    const g = uuid()
    await db.clients.put({ id: 3, guid: g, name: 'Иванов', phone: '111', isSelf: false, createdAt: D('2026-01-01'), updatedAt: D('2026-01-01') })

    // На телефоне этот же клиент (тот же guid, другой локальный id) переименован позже
    const backup = makeBackup({
      clients: [{ id: 42, guid: g, name: 'Иванов И.И.', phone: '222', isSelf: false, createdAt: D('2026-01-01'), updatedAt: D('2026-06-01') }],
    })
    const stats = await mergeBackup(db, backup)

    expect(stats.updated).toBe(1)
    const updated = await db.clients.get(3) // локальный id сохранился
    expect(updated!.name).toBe('Иванов И.И.')
    expect(updated!.phone).toBe('222')
    expect(updated!.guid).toBe(g)
    expect(await db.clients.count()).toBe(1) // дубля нет
  })

  it('«Я» другого устройства мапится на локального «Я», а не дублируется', async () => {
    await db.clients.put({ id: 1, guid: uuid(), name: 'Я', isSelf: true, createdAt: D('2026-01-01'), updatedAt: D('2026-01-01') })

    const backup = makeBackup({
      clients: [{ id: 1, guid: uuid(), name: 'Я', isSelf: true, avatar: 'data:img', createdAt: D('2026-01-01'), updatedAt: D('2026-06-01') }],
      sharpenings: [{ id: 7, guid: uuid(), clientId: 1, knifeBrand: 'Cerax', receivedAt: D('2026-02-02'), status: 'accepted', updatedAt: D('2026-06-01') }],
    })
    await mergeBackup(db, backup)

    const selfs = await db.clients.filter(c => c.isSelf).toArray()
    expect(selfs).toHaveLength(1)                 // «Я» один
    expect(selfs[0].avatar).toBe('data:img')      // новее → поля доехали
    const sh = await db.sharpenings.get(7)
    expect(sh!.clientId).toBe(selfs[0].id)        // заточка указывает на локального «Я»
  })

  it('легаси-файл без guid: merge по id работает как раньше', async () => {
    await db.clients.put({ id: 2, guid: uuid(), name: 'Старый', isSelf: false, createdAt: D('2026-01-01'), updatedAt: D('2026-01-01') })

    const backup = makeBackup({
      clients: [{ id: 2, name: 'Старый (обновлён)', isSelf: false, createdAt: D('2026-01-01'), updatedAt: D('2026-06-01') } as Client],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.updated).toBe(1)
    expect((await db.clients.get(2))!.name).toBe('Старый (обновлён)')
  })

  it('tombstone-sticky сохраняется при guid-сопоставлении', async () => {
    const g = uuid()
    await db.clients.put({
      id: 4, guid: g, name: 'Удалённый', isSelf: false, createdAt: D('2026-01-01'),
      updatedAt: D('2026-05-01'), deletedAt: D('2026-05-01'), deletedBatchId: 'b1',
    })
    // Файл несёт «живую» более свежую версию — не воскрешаем
    const backup = makeBackup({
      clients: [{ id: 77, guid: g, name: 'Удалённый', isSelf: false, createdAt: D('2026-01-01'), updatedAt: D('2026-06-01') }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.skipped).toBe(1)
    expect((await db.clients.get(4))!.deletedAt).toBeInstanceOf(Date)
  })

  it('справочники: одинаковая сталь двух устройств не дублируется (natural key)', async () => {
    await db.steels.put({ id: 10, name: '95Х18', isCustom: true, updatedAt: D('2026-01-01') })
    await db.knives.put({ id: 10, brand: 'Mora Companion', steel: '12C27', isCustom: true, updatedAt: D('2026-01-01') })

    const backup = makeBackup({
      // та же марка латиницей, под другим id; и нож с занятым id, но другим брендом
      steels: [{ id: 33, name: '95x18', isCustom: true, updatedAt: D('2026-01-02') }],
      knives: [{ id: 10, brand: 'Opinel No.8', steel: '12C27', isCustom: true, updatedAt: D('2026-01-02') }],
    })
    const stats = await mergeBackup(db, backup)

    expect(await db.steels.count()).toBe(1)                 // 95Х18 ≡ 95x18 → LWW, без дубля
    expect(await db.knives.count()).toBe(2)                 // Opinel добавлен под новым id
    const opinel = await db.knives.filter(k => k.brand === 'Opinel No.8').first()
    expect(opinel!.id).not.toBe(10)
    expect((await db.knives.get(10))!.brand).toBe('Mora Companion') // не перетёрт
    expect(stats.added).toBe(1)
  })
})

describe('restoreBackup — guid для легаси-записей', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('после restore у всех клиентов и заточек есть guid', async () => {
    const backup = makeBackup({
      clients: [{ id: 1, name: 'Я', isSelf: true, createdAt: D('2026-01-01') } as Client],
      sharpenings: [{ id: 1, clientId: 1, knifeBrand: 'X', receivedAt: D('2026-01-02'), status: 'accepted' } as Sharpening],
    })
    await restoreBackup(db, backup)
    expect((await db.clients.get(1))!.guid).toBeTruthy()
    expect((await db.sharpenings.get(1))!.guid).toBeTruthy()
  })
})

describe('миграция v8 → v9', () => {
  it('существующие записи получают guid при апгрейде', async () => {
    const name = `test-migr-${Math.random().toString(36).slice(2)}`

    // Создаём базу со схемой v8 (как у живого пользователя до обновления)
    const old = new Dexie(name)
    old.version(8).stores({
      clients:     '++id, name, isSelf, deletedAt',
      sharpenings: '++id, clientId, status, receivedAt, deletedAt',
      stones:      '++id, brand, gritFepa, gritJis, gritMicrons, type, isCustom',
      steels:      '++id, name, isCustom',
      knives:      '++id, brand, isCustom',
      meta:        'key',
      settings:    'key',
      analyticsQueue: '++id, queuedAt',
    })
    await old.open()
    await old.table('clients').add({ name: 'Я', isSelf: true, createdAt: new Date() })
    await old.table('sharpenings').add({ clientId: 1, knifeBrand: 'X', receivedAt: new Date(), status: 'accepted' })
    old.close()

    // Открываем актуальной схемой — прогоняется v9-апгрейд
    const upgraded = new AppTochiteDB(name)
    await upgraded.open()
    const client = await upgraded.clients.get(1)
    const sh = await upgraded.sharpenings.get(1)
    expect(client!.guid).toBeTruthy()
    expect(sh!.guid).toBeTruthy()

    // guid попадает и в экспорт
    const backup = await exportBackup(upgraded)
    expect(backup.data.clients[0].guid).toBe(client!.guid)

    upgraded.close()
    await upgraded.delete()
  })
})
