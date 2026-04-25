import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isValidBackup,
  buildCSV,
  reviveDates,
  exportBackup,
  restoreBackup,
  buildSharpeningCSV,
  type BackupFile,
} from './backup'
import { AppTochiteDB } from '../db/db'

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
