import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isValidBackup,
  buildCSV,
  reviveDates,
  exportBackup,
  restoreBackup,
  mergeBackup,
  buildSharpeningCSV,
  performOPFSBackup,
  getOPFSBackupMeta,
  readOPFSBackup,
  getDailyBackupMeta,
  readDailyBackup,
  type BackupFile,
} from './backup'
import { AppTochiteDB } from '../db/db'
import { fromJis } from '../data/gritTable'

// ─── OPFS mock ───────────────────────────────────────────────────────────────

class MockWritable {
  private chunks: string[] = []
  async write(data: string) { this.chunks.push(data) }
  async close() {}
  get content() { return this.chunks.join('') }
}

class MockFileHandle {
  writables: MockWritable[] = []
  private _content = ''
  async createWritable() {
    const w = new MockWritable()
    this.writables.push(w)
    // simulate close committing content
    const origClose = w.close.bind(w)
    w.close = async () => { await origClose(); this._content = w.content }
    return w
  }
  async getFile() {
    return { text: async () => this._content, size: this._content.length, lastModified: Date.now() } as unknown as File
  }
  get lastContent() { return this._content }
}

class MockOPFSRoot {
  files = new Map<string, MockFileHandle>()

  async getFileHandle(name: string, opts?: { create?: boolean }) {
    if (!this.files.has(name)) {
      if (opts?.create) this.files.set(name, new MockFileHandle())
      else throw new DOMException('NotFoundError', 'NotFoundError')
    }
    return this.files.get(name)!
  }

  async removeEntry(name: string) {
    if (!this.files.delete(name)) throw new DOMException('NotFoundError', 'NotFoundError')
  }
}

function mockOPFS() {
  const root = new MockOPFSRoot()
  vi.stubGlobal('navigator', {
    ...navigator,
    storage: { getDirectory: async () => root },
  })
  return root
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeDB(): AppTochiteDB {
  // Каждый тест получает свою изолированную БД с уникальным именем
  return new AppTochiteDB(`test-backup-${Math.random().toString(36).slice(2)}`)
}

function makeValidBackup(overrides: Partial<BackupFile['data']> = {}): BackupFile {
  return {
    version: 1,
    exportedAt: '2026-01-15T12:00:00.000Z',
    data: {
      clients: [],
      sharpenings: [],
      stones: [],
      steels: [],
      knives: [],
      meta: [],
      ...overrides,
    },
  }
}

// ─── isValidBackup ───────────────────────────────────────────────────────────

describe('isValidBackup', () => {
  it('принимает корректный бэкап', () => {
    expect(isValidBackup(makeValidBackup())).toBe(true)
  })

  it('отклоняет null', () => {
    expect(isValidBackup(null)).toBe(false)
  })

  it('отклоняет строку', () => {
    expect(isValidBackup('hello')).toBe(false)
  })

  it('отклоняет пустой объект', () => {
    expect(isValidBackup({})).toBe(false)
  })

  it('отклоняет если version не 1 и не 2', () => {
    expect(isValidBackup({ version: 3, exportedAt: '2026-01-01T00:00:00.000Z', data: { clients: [], sharpenings: [], stones: [], steels: [], knives: [] } })).toBe(false)
  })

  it('принимает version 2 (с tombstones)', () => {
    expect(isValidBackup({ version: 2, exportedAt: '2026-01-01T00:00:00.000Z', data: { clients: [], sharpenings: [], stones: [], steels: [], knives: [] } })).toBe(true)
  })

  it('отклоняет если data отсутствует', () => {
    expect(isValidBackup({ version: 1 })).toBe(false)
  })

  it('отклоняет если одно из полей data не массив', () => {
    const bad = { version: 1, exportedAt: '', data: { clients: 'not-array', sharpenings: [], stones: [], steels: [], knives: [] } }
    expect(isValidBackup(bad)).toBe(false)
  })

  it('отклоняет если exportedAt отсутствует', () => {
    expect(isValidBackup({ version: 1, data: { clients: [], sharpenings: [], stones: [], steels: [], knives: [] } })).toBe(false)
  })

  it('принимает бэкап без поля meta (обратная совместимость)', () => {
    const withoutMeta = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      data: { clients: [], sharpenings: [], stones: [], steels: [], knives: [] },
    }
    expect(isValidBackup(withoutMeta)).toBe(true)
  })
})

// ─── reviveDates ─────────────────────────────────────────────────────────────

describe('reviveDates', () => {
  it('конвертирует ISO-строку в Date', () => {
    const result = reviveDates('receivedAt', '2026-01-15T12:00:00.000Z')
    expect(result).toBeInstanceOf(Date)
    expect((result as Date).getFullYear()).toBe(2026)
  })

  it('не трогает обычные строки', () => {
    expect(reviveDates('name', 'Иванов')).toBe('Иванов')
  })

  it('не трогает числа', () => {
    expect(reviveDates('price', 500)).toBe(500)
  })

  it('не трогает null', () => {
    expect(reviveDates('x', null)).toBe(null)
  })

  it('парсится корректно через JSON.parse', () => {
    const json = JSON.stringify({ date: '2026-03-01T00:00:00.000Z', name: 'test' })
    const parsed = JSON.parse(json, reviveDates)
    expect(parsed.date).toBeInstanceOf(Date)
    expect(parsed.name).toBe('test')
  })
})

// ─── buildCSV ────────────────────────────────────────────────────────────────

describe('buildCSV', () => {
  it('начинается с UTF-8 BOM', () => {
    const result = buildCSV([['a', 'b']])
    expect(result.startsWith('﻿')).toBe(true)
  })

  it('использует точку с запятой как разделитель', () => {
    const result = buildCSV([['a', 'b', 'c']])
    expect(result).toContain('"a";"b";"c"')
  })

  it('использует CRLF между строками', () => {
    const result = buildCSV([['a'], ['b']])
    expect(result).toContain('\r\n')
  })

  it('экранирует двойные кавычки внутри значений', () => {
    const result = buildCSV([['say "hello"']])
    expect(result).toContain('"say ""hello"""')
  })

  it('обрабатывает null и undefined как пустую строку', () => {
    const result = buildCSV([[null, undefined]])
    expect(result.replace('﻿', '')).toBe('"";""')
  })

  it('обрабатывает числа', () => {
    const result = buildCSV([[42, 1500]])
    expect(result).toContain('"42";"1500"')
  })
})

// ─── buildSharpeningCSV ──────────────────────────────────────────────────────

describe('buildSharpeningCSV', () => {
  it('первая строка — заголовки', () => {
    const csv = buildSharpeningCSV([], new Map())
    const firstLine = csv.replace('﻿', '').split('\r\n')[0]
    expect(firstLine).toContain('№ заточки')
    expect(firstLine).toContain('Клиент')
    expect(firstLine).toContain('Нож')
  })

  it('заточка без камней — одна строка данных', () => {
    const sharpenings = [{
      id: 1,
      clientId: 10,
      knifeBrand: 'Victorinox',
      receivedAt: new Date('2026-01-01'),
      status: 'done' as const,
      doneAt: new Date('2026-01-02'),
    }]
    const clientMap = new Map([[10, 'Иванов']])
    const csv = buildSharpeningCSV(sharpenings, clientMap)
    const lines = csv.replace('﻿', '').split('\r\n')
    expect(lines).toHaveLength(2) // заголовок + 1 строка
    expect(lines[1]).toContain('Иванов')
    expect(lines[1]).toContain('Victorinox')
    expect(lines[1]).toContain('готов')
  })

  it('заточка с 2 камнями — 2 строки данных', () => {
    const sharpenings = [{
      id: 2,
      clientId: 10,
      knifeBrand: 'Mora',
      receivedAt: new Date('2026-01-01'),
      status: 'accepted' as const,
      stones: [
        { name: 'Shapton 1000', order: 1 },
        { name: 'Shapton 3000', order: 2 },
      ],
    }]
    const csv = buildSharpeningCSV(sharpenings, new Map([[10, 'Петров']]))
    const lines = csv.replace('﻿', '').split('\r\n')
    expect(lines).toHaveLength(3) // заголовок + 2 строки
    expect(lines[1]).toContain('Shapton 1000')
    expect(lines[2]).toContain('Shapton 3000')
  })

  it('статус accepted → "принят"', () => {
    const sharpenings = [{
      id: 3, clientId: 1, knifeBrand: 'X',
      receivedAt: new Date(), status: 'accepted' as const,
    }]
    const csv = buildSharpeningCSV(sharpenings, new Map([[1, 'Клиент']]))
    expect(csv).toContain('принят')
  })

  it('удалённые заточки (deletedAt) не попадают в отчёт', async () => {
    const sharpenings = [
      { id: 1, clientId: 1, knifeBrand: 'Активная', receivedAt: new Date(), status: 'done' as const },
      { id: 2, clientId: 1, knifeBrand: 'Удалённая', receivedAt: new Date(), status: 'done' as const, deletedAt: new Date() },
    ]
    const csv = buildSharpeningCSV(sharpenings, new Map([[1, 'Клиент']]))
    expect(csv).toContain('Активная')
    expect(csv).not.toContain('Удалённая')
  })
})

// ─── exportBackup / restoreBackup (полный цикл) ──────────────────────────────

describe('exportBackup + restoreBackup', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('экспортирует пустую БД с правильной структурой', async () => {
    const backup = await exportBackup(db)
    expect(backup.version).toBe(2)
    expect(backup.exportedAt).toBeTruthy()
    expect(Array.isArray(backup.data.clients)).toBe(true)
    expect(Array.isArray(backup.data.sharpenings)).toBe(true)
    expect(Array.isArray(backup.data.stones)).toBe(true)
    expect(Array.isArray(backup.data.steels)).toBe(true)
    expect(Array.isArray(backup.data.knives)).toBe(true)
    expect(Array.isArray(backup.data.meta)).toBe(true)
  })

  it('экспортирует созданные данные', async () => {
    await db.clients.add({ name: 'Тестовый клиент', isSelf: false, createdAt: new Date() })
    await db.stones.add({ brand: 'Shapton 1000', ...fromJis(1000), type: 'ao', isCustom: true })

    const backup = await exportBackup(db)
    expect(backup.data.clients).toHaveLength(1)
    expect(backup.data.clients[0].name).toBe('Тестовый клиент')
    expect(backup.data.stones).toHaveLength(1)
    expect(backup.data.stones[0].brand).toBe('Shapton 1000')
  })

  it('восстанавливает данные из бэкапа (полный цикл)', async () => {
    // Наполняем БД
    const clientId = await db.clients.add({ name: 'Иванов', isSelf: false, createdAt: new Date() })
    await db.sharpenings.add({
      clientId,
      knifeBrand: 'Victorinox',
      receivedAt: new Date('2026-01-01'),
      status: 'done',
      doneAt: new Date('2026-01-02'),
      stones: [{ name: 'Naniwa 2000', order: 1 }],
      price: 500,
    })
    await db.stones.add({ brand: 'Naniwa Chosera', ...fromJis(2000), type: 'ao', isCustom: false })

    // Экспортируем
    const backup = await exportBackup(db)

    // Очищаем БД и добавляем мусор, чтобы убедиться что restore всё затирает
    await db.clients.clear()
    await db.clients.add({ name: 'Мусор', isSelf: false, createdAt: new Date() })

    // Восстанавливаем
    await restoreBackup(db, backup)

    // Проверяем результат
    const clients = await db.clients.toArray()
    expect(clients).toHaveLength(1)
    expect(clients[0].name).toBe('Иванов')

    const sharpenings = await db.sharpenings.toArray()
    expect(sharpenings).toHaveLength(1)
    expect(sharpenings[0].knifeBrand).toBe('Victorinox')
    expect(sharpenings[0].price).toBe(500)
    expect(sharpenings[0].stones).toEqual([{ name: 'Naniwa 2000', order: 1 }])

    const stones = await db.stones.toArray()
    expect(stones).toHaveLength(1)
    expect(stones[0].gritJis).toBe(2000)
    expect(stones[0].gritSource).toBe('jis')
  })

  it('после восстановления isSelf сохраняется', async () => {
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    const backup = await exportBackup(db)

    await db.clients.clear()
    await restoreBackup(db, backup)

    const self = await db.clients.filter(c => c.isSelf).first()
    expect(self).toBeDefined()
    expect(self!.name).toBe('Я')
  })

  it('восстановление в транзакции: при ошибке данные не затираются', async () => {
    await db.clients.add({ name: 'Оригинал', isSelf: false, createdAt: new Date() })

    // Бэкап с заведомо некорректной заточкой (нарушение схемы через приведение типа)
    const badBackup: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        clients: [{ name: 'Новый', isSelf: false, createdAt: new Date() }],
        sharpenings: [null as never], // вызовет ошибку при bulkPut
        stones: [],
        steels: [],
        knives: [],
        meta: [],
      },
    }

    await expect(restoreBackup(db, badBackup)).rejects.toThrow()

    // Данные должны остаться нетронутыми (транзакция откатилась)
    const clients = await db.clients.toArray()
    expect(clients.some(c => c.name === 'Оригинал')).toBe(true)
  })

  it('старый бэкап без meta не сбрасывает meta устройства (seedVersion сохраняется)', async () => {
    // Имитируем устройство, у которого seedVersion=1 уже стоит.
    await db.meta.put({ key: 'seedVersion', value: 1 })
    // Бэкап старого формата v1 — поле meta вообще отсутствует.
    const oldBackup: BackupFile = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      data: { clients: [], sharpenings: [], stones: [], steels: [], knives: [] },
    }
    await restoreBackup(db, oldBackup)
    const seed = await db.meta.get('seedVersion')
    expect(seed?.value).toBe(1)
  })

  it('восстанавливает фото в base64', async () => {
    const clientId = await db.clients.add({ name: 'Клиент', isSelf: false, createdAt: new Date() })
    await db.sharpenings.add({
      clientId,
      knifeBrand: 'Нож',
      receivedAt: new Date(),
      status: 'done',
      photosBefore: ['data:image/jpeg;base64,/9j/fake'],
      photosAfter: ['data:image/jpeg;base64,/9j/fake2'],
    })

    const backup = await exportBackup(db)
    await db.sharpenings.clear()
    await restoreBackup(db, backup)

    const sharpenings = await db.sharpenings.toArray()
    expect(sharpenings[0].photosBefore).toEqual(['data:image/jpeg;base64,/9j/fake'])
    expect(sharpenings[0].photosAfter).toEqual(['data:image/jpeg;base64,/9j/fake2'])
  })
})

// ─── mergeBackup ─────────────────────────────────────────────────────────────

describe('mergeBackup', () => {
  let db: AppTochiteDB

  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('добавляет новые записи из файла', async () => {
    const backup = makeValidBackup({
      clients: [{ id: 1, name: 'Иванов', isSelf: false, createdAt: new Date() }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.added).toBe(1)
    expect(stats.updated).toBe(0)
    expect(stats.skipped).toBe(0)
    expect(await db.clients.count()).toBe(1)
  })

  it('оставляет запись только на устройстве нетронутой', async () => {
    await db.clients.add({ id: 1, name: 'Оригинал', isSelf: false, createdAt: new Date() })
    const stats = await mergeBackup(db, makeValidBackup())
    expect(stats.added).toBe(0)
    expect(stats.updated).toBe(0)
    const clients = await db.clients.toArray()
    expect(clients[0].name).toBe('Оригинал')
  })

  it('конфликт: updatedAt файла новее → победила версия из файла', async () => {
    await db.clients.add({ id: 1, name: 'Старый', isSelf: false, createdAt: new Date(), updatedAt: new Date('2026-01-01') })
    const backup = makeValidBackup({
      clients: [{ id: 1, name: 'Новый', isSelf: false, createdAt: new Date(), updatedAt: new Date('2026-06-01') }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.updated).toBe(1)
    expect((await db.clients.get(1))!.name).toBe('Новый')
  })

  it('конфликт: updatedAt устройства новее → остаётся версия устройства', async () => {
    await db.clients.add({ id: 1, name: 'Новый', isSelf: false, createdAt: new Date(), updatedAt: new Date('2026-06-01') })
    const backup = makeValidBackup({
      clients: [{ id: 1, name: 'Старый', isSelf: false, createdAt: new Date(), updatedAt: new Date('2026-01-01') }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.skipped).toBe(1)
    expect((await db.clients.get(1))!.name).toBe('Новый')
  })

  it('бэкап без updatedAt трактуется как epoch — устройство побеждает', async () => {
    await db.clients.add({ id: 1, name: 'Устройство', isSelf: false, createdAt: new Date(), updatedAt: new Date('2026-01-01') })
    const backup = makeValidBackup({
      clients: [{ id: 1, name: 'Файл', isSelf: false, createdAt: new Date() }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.skipped).toBe(1)
    expect((await db.clients.get(1))!.name).toBe('Устройство')
  })

  it('tombstone из файла (deletedAt) побеждает активную запись на устройстве', async () => {
    await db.clients.add({ id: 1, name: 'Активный', isSelf: false, createdAt: new Date(), updatedAt: new Date('2026-01-01') })
    const backup = makeValidBackup({
      clients: [{
        id: 1, name: 'Активный', isSelf: false, createdAt: new Date(),
        updatedAt: new Date('2026-06-01'),
        deletedAt: new Date('2026-06-01'),
        deletedBatchId: 'b-1',
      }],
    })
    await mergeBackup(db, backup)
    const c = await db.clients.get(1)
    expect(c!.deletedAt).toBeDefined()
    expect(c!.deletedBatchId).toBe('b-1')
  })

  it('клиент в корзине: свежий файл без deletedAt НЕ воскрешает запись', async () => {
    // Сценарий: на устройстве A клиент удалён, на другом устройстве B (с устаревшим
    // знанием) клиента переименовали уже после момента удаления. Merge файла B
    // не должен возвращать удалённого клиента до истечения 3-дневного окна.
    await db.clients.add({
      id: 1, name: 'Удалён на A', isSelf: false, createdAt: new Date(),
      updatedAt: new Date('2026-05-10'),
      deletedAt: new Date('2026-05-10'),
      deletedBatchId: 'b-A',
    })
    const backup = makeValidBackup({
      clients: [{
        id: 1, name: 'Переименован на B', isSelf: false, createdAt: new Date(),
        updatedAt: new Date('2026-05-20'),
      }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.updated).toBe(0)
    expect(stats.skipped).toBe(1)
    const c = await db.clients.get(1)
    expect(c!.name).toBe('Удалён на A')
    expect(c!.deletedAt).toBeDefined()
    expect(c!.deletedBatchId).toBe('b-A')
  })

  it('заточка в корзине: свежий файл без deletedAt НЕ воскрешает запись', async () => {
    await db.sharpenings.add({
      id: 1, clientId: 10, knifeBrand: 'Victorinox',
      receivedAt: new Date('2026-05-01'), status: 'done',
      updatedAt: new Date('2026-05-10'),
      deletedAt: new Date('2026-05-10'),
      deletedBatchId: 'b-A',
    })
    const backup = makeValidBackup({
      sharpenings: [{
        id: 1, clientId: 10, knifeBrand: 'Victorinox PRO',
        receivedAt: new Date('2026-05-01'), status: 'done',
        updatedAt: new Date('2026-05-20'),
      }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.updated).toBe(0)
    expect(stats.skipped).toBe(1)
    const sh = await db.sharpenings.get(1)
    expect(sh!.knifeBrand).toBe('Victorinox')
    expect(sh!.deletedAt).toBeDefined()
  })

  it('оба с deletedAt: LWW по updatedAt продолжает работать (файл новее → файл побеждает)', async () => {
    // Если на обоих устройствах запись в корзине, последнее удаление выигрывает —
    // например, может смениться deletedBatchId на более позднем удалении.
    await db.clients.add({
      id: 1, name: 'X', isSelf: false, createdAt: new Date(),
      updatedAt: new Date('2026-05-10'),
      deletedAt: new Date('2026-05-10'),
      deletedBatchId: 'b-old',
    })
    const backup = makeValidBackup({
      clients: [{
        id: 1, name: 'X', isSelf: false, createdAt: new Date(),
        updatedAt: new Date('2026-05-15'),
        deletedAt: new Date('2026-05-15'),
        deletedBatchId: 'b-new',
      }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.updated).toBe(1)
    const c = await db.clients.get(1)
    expect(c!.deletedBatchId).toBe('b-new')
  })

  it('мерж нескольких таблиц одновременно', async () => {
    const backup = makeValidBackup({
      clients: [{ id: 1, name: 'Клиент', isSelf: false, createdAt: new Date() }],
      stones: [{ id: 1, brand: 'Shapton 1000', ...fromJis(1000), type: 'ao' as const, isCustom: false }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.added).toBe(2)
    expect(await db.clients.count()).toBe(1)
    expect(await db.stones.count()).toBe(1)
  })

  it('restoreBackup нормализует камни из старого бэкапа (grit + gritUnit)', async () => {
    const oldSchemaBackup = makeValidBackup({
      stones: [
        { id: 1, brand: 'Shapton Glass', grit: 2000, gritUnit: 'jis', type: 'ao' as const, isCustom: false } as never,
        { id: 2, brand: 'DMT Fine', grit: 600, gritUnit: 'fepa', type: 'galvanic' as const, isCustom: false } as never,
        { id: 3, brand: 'Эльбор', gritUnit: 'mk', gritMk: '7/5', type: 'elbor' as const, isCustom: false } as never,
      ],
    })
    await restoreBackup(db, oldSchemaBackup)
    const stones = await db.stones.toArray()
    const shapton = stones.find(s => s.brand === 'Shapton Glass')!
    expect(shapton.gritJis).toBe(2000)
    expect(shapton.gritSource).toBe('jis')
    expect(shapton.gritMicrons).toBeDefined()
    const dmt = stones.find(s => s.brand === 'DMT Fine')!
    expect(dmt.gritFepa).toBe(600)
    expect(dmt.gritSource).toBe('fepa')
    const elbor = stones.find(s => s.brand === 'Эльбор')!
    expect(elbor.gritMk).toBe('7/5')
    expect(elbor.gritSource).toBe('mk')
    expect(elbor.gritMicrons).toBeDefined()
  })

  it('mergeBackup нормализует камни из старого бэкапа', async () => {
    const oldSchemaBackup = makeValidBackup({
      stones: [
        { id: 10, brand: 'King KW-65', grit: 1000, gritUnit: 'jis', type: 'ao' as const, isCustom: false } as never,
      ],
    })
    await mergeBackup(db, oldSchemaBackup)
    const stone = await db.stones.get(10)
    expect(stone).toBeDefined()
    expect(stone!.gritJis).toBe(1000)
    expect(stone!.gritSource).toBe('jis')
  })
})

// ─── getOPFSBackupMeta ────────────────────────────────────────────────────────

describe('getOPFSBackupMeta', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('возвращает null если файл не существует', async () => {
    mockOPFS()
    const meta = await getOPFSBackupMeta()
    expect(meta).toBeNull()
  })

  it('возвращает { date, size } после записи бэкапа', async () => {
    const root = mockOPFS()
    const db = makeDB(); await db.open()
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    await performOPFSBackup(db)
    db.close(); await db.delete()

    const handle = root.files.get('apptochite-auto.json')!
    expect(handle).toBeDefined()

    const meta = await getOPFSBackupMeta()
    expect(meta).not.toBeNull()
    expect(meta!.size).toBeGreaterThan(0)
    expect(meta!.date).toBeInstanceOf(Date)
  })

  it('возвращает null если файл пустой (size === 0)', async () => {
    const root = mockOPFS()
    // Создаём файл вручную с пустым содержимым
    const handle = new MockFileHandle()
    // Переопределяем getFile чтобы вернуть size=0
    handle.getFile = async () => ({ text: async () => '', size: 0, lastModified: Date.now() } as unknown as File)
    root.files.set('apptochite-auto.json', handle)

    const meta = await getOPFSBackupMeta()
    expect(meta).toBeNull()
  })
})

// ─── readOPFSBackup ───────────────────────────────────────────────────────────

describe('readOPFSBackup', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('возвращает null если файл не существует', async () => {
    mockOPFS()
    expect(await readOPFSBackup()).toBeNull()
  })

  it('возвращает BackupFile после записи performOPFSBackup', async () => {
    mockOPFS()
    const db = makeDB(); await db.open()
    await db.clients.add({ name: 'Тест', isSelf: false, createdAt: new Date() })
    await performOPFSBackup(db)
    db.close(); await db.delete()

    const result = await readOPFSBackup()
    expect(result).not.toBeNull()
    expect(isValidBackup(result)).toBe(true)
    expect(result!.data.clients[0].name).toBe('Тест')
  })

  it('возвращает null при невалидном JSON-содержимом', async () => {
    const root = mockOPFS()
    const handle = new MockFileHandle()
    handle.getFile = async () => ({ text: async () => 'not json at all', size: 14, lastModified: Date.now() } as unknown as File)
    root.files.set('apptochite-auto.json', handle)

    expect(await readOPFSBackup()).toBeNull()
  })

  it('возвращает null при файле с невалидной структурой', async () => {
    const root = mockOPFS()
    const handle = new MockFileHandle()
    const bad = JSON.stringify({ version: 2, data: {} })
    handle.getFile = async () => ({ text: async () => bad, size: bad.length, lastModified: Date.now() } as unknown as File)
    root.files.set('apptochite-auto.json', handle)

    expect(await readOPFSBackup()).toBeNull()
  })
})

// ─── performOPFSBackup ───────────────────────────────────────────────────────

describe('performOPFSBackup', () => {
  let db: AppTochiteDB

  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { vi.unstubAllGlobals(); db.close(); await db.delete() })

  it('записывает apptochite-auto.json с валидным содержимым', async () => {
    const root = mockOPFS()
    await db.clients.add({ name: 'Тест', isSelf: false, createdAt: new Date() })
    await performOPFSBackup(db)
    const handle = root.files.get('apptochite-auto.json')
    expect(handle).toBeDefined()
    const parsed = JSON.parse(handle!.lastContent)
    expect(isValidBackup(parsed)).toBe(true)
    expect(parsed.data.clients).toHaveLength(1)
    expect(parsed.data.clients[0].name).toBe('Тест')
  })

  it('обновляет lastBackupAt в settings', async () => {
    mockOPFS()
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    const before = Date.now()
    await performOPFSBackup(db)
    const entry = await db.settings.get('lastBackupAt')
    expect(entry).toBeDefined()
    expect(new Date(entry!.value as string).getTime()).toBeGreaterThanOrEqual(before)
  })

  it('бэкап восстанавливается корректно', async () => {
    const root = mockOPFS()
    await db.clients.add({ name: 'Иванов', isSelf: false, createdAt: new Date() })
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    await performOPFSBackup(db)

    const handle = root.files.get('apptochite-auto.json')!
    const backup = JSON.parse(handle.lastContent, reviveDates) as BackupFile
    expect(isValidBackup(backup)).toBe(true)

    const db2 = makeDB()
    await db2.open()
    await restoreBackup(db2, backup)
    const names = (await db2.clients.toArray()).map(c => c.name).sort()
    db2.close(); await db2.delete()

    expect(names).toContain('Иванов')
    expect(names).toContain('Я')
  })
})

// ─── Daily backup rotation ───────────────────────────────────────────────────

describe('daily backup rotation', () => {
  let db: AppTochiteDB

  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { vi.unstubAllGlobals(); vi.useRealTimers(); db.close(); await db.delete() })

  function ymd(d: Date) { return d.toISOString().slice(0, 10) }

  it('первый прогон не создаёт daily (нет ещё auto)', async () => {
    const root = mockOPFS()
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    await performOPFSBackup(db)
    const dailyFiles = [...root.files.keys()].filter(n => n.startsWith('apptochite-daily-'))
    expect(dailyFiles).toHaveLength(0)
    expect(await getDailyBackupMeta(db)).toBeNull()
  })

  it('второй прогон в тот же день не создаёт daily', async () => {
    const root = mockOPFS()
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    await performOPFSBackup(db)
    await performOPFSBackup(db)
    const dailyFiles = [...root.files.keys()].filter(n => n.startsWith('apptochite-daily-'))
    expect(dailyFiles).toHaveLength(0)
  })

  it('повышает auto в daily при первом прогоне нового дня (имя — вчерашняя дата)', async () => {
    const root = mockOPFS()
    const day1 = new Date('2026-05-30T10:00:00Z')
    const day2 = new Date('2026-05-31T10:00:00Z')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(day1)

    // День 1: запустили auto.
    await db.clients.add({ name: 'День1', isSelf: false, createdAt: new Date() })
    await performOPFSBackup(db)
    const day1AutoContent = root.files.get('apptochite-auto.json')!.lastContent

    // День 2: добавили клиента, запустили auto. Должен появиться daily с датой «День 1».
    vi.setSystemTime(day2)
    await db.clients.add({ name: 'День2', isSelf: false, createdAt: new Date() })
    await performOPFSBackup(db)

    const expectedDaily = `apptochite-daily-${ymd(day1)}.json`
    expect(root.files.has(expectedDaily)).toBe(true)
    expect(root.files.get(expectedDaily)!.lastContent).toBe(day1AutoContent)

    const meta = await getDailyBackupMeta(db)
    expect(meta?.snapshotDate).toBe(ymd(day1))

    // А auto содержит уже свежее состояние с обоими клиентами.
    const freshAuto = JSON.parse(root.files.get('apptochite-auto.json')!.lastContent) as BackupFile
    expect(freshAuto.data.clients).toHaveLength(2)

    // Восстановление из daily возвращает только клиента «День1».
    const restored = await readDailyBackup(db)
    expect(restored?.data.clients.map(c => c.name)).toEqual(['День1'])
  })

  it('в новый день старый daily заменяется свежим, дубликаты не копятся', async () => {
    const root = mockOPFS()
    const day1 = new Date('2026-05-30T10:00:00Z')
    const day2 = new Date('2026-05-31T10:00:00Z')
    const day3 = new Date('2026-06-01T10:00:00Z')
    vi.useFakeTimers({ toFake: ['Date'] })

    vi.setSystemTime(day1)
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    await performOPFSBackup(db)

    vi.setSystemTime(day2)
    await performOPFSBackup(db)
    const day2Daily = [...root.files.keys()].filter(n => n.startsWith('apptochite-daily-'))
    expect(day2Daily).toEqual([`apptochite-daily-${ymd(day1)}.json`])

    vi.setSystemTime(day3)
    await performOPFSBackup(db)
    const day3Daily = [...root.files.keys()].filter(n => n.startsWith('apptochite-daily-'))
    expect(day3Daily).toEqual([`apptochite-daily-${ymd(day2)}.json`])
  })

  it('integrity-check проваливается — auto удаляется, lastBackupAt не обновляется', async () => {
    const root = mockOPFS()
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date() })
    // Подменяем createWritable так, чтобы запись auto.json молча провалилась.
    await performOPFSBackup(db)  // первый успешный
    const beforeMs = (await db.settings.get('lastBackupAt'))!.value as string

    const autoHandle = root.files.get('apptochite-auto.json')!
    const origCreateWritable = autoHandle.createWritable.bind(autoHandle)
    autoHandle.createWritable = async () => {
      const w = await origCreateWritable()
      // ломаем содержимое: пишем заведомо невалидный JSON
      const origWrite = w.write.bind(w)
      w.write = async () => { await origWrite('}{not json') }
      return w
    }

    // Данные должны реально измениться — иначе сигнатура совпадёт с прошлой
    // записью и performOPFSBackup пропустит запись файла целиком (см. гейт выше).
    await db.clients.add({ name: 'Второй', isSelf: false, createdAt: new Date() })
    await expect(performOPFSBackup(db)).rejects.toThrow(/integrity/)
    expect(root.files.has('apptochite-auto.json')).toBe(false)
    const after = (await db.settings.get('lastBackupAt'))!.value as string
    expect(after).toBe(beforeMs)
  })
})
