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
  type BackupFile,
} from './backup'
import { AppTochiteDB } from '../db/db'

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

  it('отклоняет если version не 1', () => {
    expect(isValidBackup({ version: 2, exportedAt: '', data: { clients: [], sharpenings: [], stones: [], steels: [], knives: [] } })).toBe(false)
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
    expect(lines[1]).toContain('Готово')
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

  it('статус accepted → "Принят"', () => {
    const sharpenings = [{
      id: 3, clientId: 1, knifeBrand: 'X',
      receivedAt: new Date(), status: 'accepted' as const,
    }]
    const csv = buildSharpeningCSV(sharpenings, new Map([[1, 'Клиент']]))
    expect(csv).toContain('Принят')
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
    expect(backup.version).toBe(1)
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
    await db.stones.add({ brand: 'Shapton 1000', grit: 1000, type: 'ao', isCustom: true })

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
    await db.stones.add({ brand: 'Naniwa Chosera', grit: 2000, type: 'ao', isCustom: false })

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
    expect(stones[0].grit).toBe(2000)
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

  it('мерж нескольких таблиц одновременно', async () => {
    const backup = makeValidBackup({
      clients: [{ id: 1, name: 'Клиент', isSelf: false, createdAt: new Date() }],
      stones: [{ id: 1, brand: 'Shapton 1000', grit: 1000, type: 'ao' as const, isCustom: false }],
    })
    const stats = await mergeBackup(db, backup)
    expect(stats.added).toBe(2)
    expect(await db.clients.count()).toBe(1)
    expect(await db.stones.count()).toBe(1)
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
