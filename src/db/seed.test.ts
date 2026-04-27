import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppTochiteDB } from './db'
import { seedDatabaseWith } from './seed'

function makeDB(): AppTochiteDB {
  return new AppTochiteDB(`test-seed-${Math.random().toString(36).slice(2)}`)
}

// ─── Первый запуск (чистая установка) ────────────────────────────────────────

describe('Первый запуск (чистая установка)', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('создаёт клиента «Я» (isSelf: true)', async () => {
    await seedDatabaseWith(db)
    const self = await db.clients.filter(c => c.isSelf).first()
    expect(self).toBeDefined()
    expect(self!.name).toBe('Я')
    expect(self!.isSelf).toBe(true)
  })

  it('создаёт ровно одного клиента «Я»', async () => {
    await seedDatabaseWith(db)
    const selfClients = await db.clients.filter(c => c.isSelf).toArray()
    expect(selfClients).toHaveLength(1)
  })

  it('добавляет камни из справочника (≥25)', async () => {
    await seedDatabaseWith(db)
    expect(await db.stones.count()).toBeGreaterThanOrEqual(25)
  })

  it('добавляет стали из справочника (≥50)', async () => {
    await seedDatabaseWith(db)
    expect(await db.steels.count()).toBeGreaterThanOrEqual(50)
  })

  it('добавляет ножи из справочника (≥100)', async () => {
    await seedDatabaseWith(db)
    expect(await db.knives.count()).toBeGreaterThanOrEqual(100)
  })

  it('устанавливает seedVersion = 1 в meta', async () => {
    await seedDatabaseWith(db)
    const meta = await db.meta.get('seedVersion')
    expect(meta?.value).toBe(1)
  })

  it('все seed-камни не кастомные (isCustom: false)', async () => {
    await seedDatabaseWith(db)
    const customCount = await db.stones.filter(s => s.isCustom).count()
    expect(customCount).toBe(0)
  })

  it('все seed-стали не кастомные (isCustom: false)', async () => {
    await seedDatabaseWith(db)
    const customCount = await db.steels.filter(s => s.isCustom).count()
    expect(customCount).toBe(0)
  })

  it('все seed-ножи не кастомные (isCustom: false)', async () => {
    await seedDatabaseWith(db)
    const customCount = await db.knives.filter(k => k.isCustom).count()
    expect(customCount).toBe(0)
  })

  it('seed содержит камни типа ao', async () => {
    await seedDatabaseWith(db)
    const count = await db.stones.where('type').equals('ao').count()
    expect(count).toBeGreaterThan(0)
  })

  it('seed содержит камни типа galvanic', async () => {
    await seedDatabaseWith(db)
    const count = await db.stones.where('type').equals('galvanic').count()
    expect(count).toBeGreaterThan(0)
  })

  it('seed содержит камни типа natural', async () => {
    await seedDatabaseWith(db)
    const count = await db.stones.where('type').equals('natural').count()
    expect(count).toBeGreaterThan(0)
  })

  it('до вызова seedDatabase таблицы пустые', async () => {
    expect(await db.clients.count()).toBe(0)
    expect(await db.stones.count()).toBe(0)
    expect(await db.steels.count()).toBe(0)
    expect(await db.knives.count()).toBe(0)
    expect(await db.meta.count()).toBe(0)
  })
})

// ─── Повторный запуск (идемпотентность) ──────────────────────────────────────

describe('Повторный запуск (идемпотентность)', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
    await seedDatabaseWith(db)
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('повторный вызов не дублирует клиента «Я»', async () => {
    const countBefore = await db.clients.count()
    await seedDatabaseWith(db)
    expect(await db.clients.count()).toBe(countBefore)
  })

  it('повторный вызов не дублирует камни', async () => {
    const countBefore = await db.stones.count()
    await seedDatabaseWith(db)
    expect(await db.stones.count()).toBe(countBefore)
  })

  it('повторный вызов не дублирует стали', async () => {
    const countBefore = await db.steels.count()
    await seedDatabaseWith(db)
    expect(await db.steels.count()).toBe(countBefore)
  })

  it('повторный вызов не дублирует ножи', async () => {
    const countBefore = await db.knives.count()
    await seedDatabaseWith(db)
    expect(await db.knives.count()).toBe(countBefore)
  })

  it('seedVersion остаётся 1 после повторного запуска', async () => {
    await seedDatabaseWith(db)
    const meta = await db.meta.get('seedVersion')
    expect(meta?.value).toBe(1)
  })
})

// ─── Переустановка (полная очистка данных) ────────────────────────────────────

describe('Переустановка (удаление всех данных — «Очистить данные сайта»)', () => {
  let db: AppTochiteDB
  let stonesAfterFirstInstall: number
  let steelsAfterFirstInstall: number
  let knivesAfterFirstInstall: number

  beforeEach(async () => {
    db = makeDB()
    await db.open()
    await seedDatabaseWith(db)

    stonesAfterFirstInstall = await db.stones.count()
    steelsAfterFirstInstall = await db.steels.count()
    knivesAfterFirstInstall = await db.knives.count()

    // Имитируем полную очистку хранилища браузера (все данные удалены)
    await db.clients.clear()
    await db.sharpenings.clear()
    await db.stones.clear()
    await db.steels.clear()
    await db.knives.clear()
    await db.meta.clear()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('после очистки все основные таблицы пустые', async () => {
    expect(await db.clients.count()).toBe(0)
    expect(await db.stones.count()).toBe(0)
    expect(await db.steels.count()).toBe(0)
    expect(await db.knives.count()).toBe(0)
    expect(await db.meta.count()).toBe(0)
  })

  it('переустановка создаёт клиента «Я»', async () => {
    await seedDatabaseWith(db)
    const self = await db.clients.filter(c => c.isSelf).first()
    expect(self).toBeDefined()
    expect(self!.name).toBe('Я')
  })

  it('переустановка создаёт ровно одного клиента «Я»', async () => {
    await seedDatabaseWith(db)
    const selfClients = await db.clients.filter(c => c.isSelf).toArray()
    expect(selfClients).toHaveLength(1)
  })

  it('переустановка восстанавливает то же количество камней', async () => {
    await seedDatabaseWith(db)
    expect(await db.stones.count()).toBe(stonesAfterFirstInstall)
  })

  it('переустановка восстанавливает то же количество сталей', async () => {
    await seedDatabaseWith(db)
    expect(await db.steels.count()).toBe(steelsAfterFirstInstall)
  })

  it('переустановка восстанавливает то же количество ножей', async () => {
    await seedDatabaseWith(db)
    expect(await db.knives.count()).toBe(knivesAfterFirstInstall)
  })

  it('после переустановки seedVersion = 1', async () => {
    await seedDatabaseWith(db)
    const meta = await db.meta.get('seedVersion')
    expect(meta?.value).toBe(1)
  })

  it('пользовательские заточки не восстанавливаются после переустановки', async () => {
    // Данные пользователя из первой установки были уничтожены вместе с очисткой
    await seedDatabaseWith(db)
    expect(await db.sharpenings.count()).toBe(0)
  })
})

// ─── Потеря только таблицы meta ───────────────────────────────────────────────

describe('Неполное удаление: очищена только meta (данные БД остались)', () => {
  let db: AppTochiteDB
  let stonesBefore: number

  beforeEach(async () => {
    db = makeDB()
    await db.open()
    await seedDatabaseWith(db)
    stonesBefore = await db.stones.count()
    // Имитируем ситуацию, когда пользователь удалил только cookies/localStorage,
    // но IndexedDB уцелела (нетипичный сценарий, но возможный в некоторых браузерах)
    await db.meta.clear()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('без meta seedVersion читается как undefined', async () => {
    const stored = await db.meta.get('seedVersion')
    expect(stored).toBeUndefined()
  })

  it('при потере meta seedDatabase считает currentVersion = 0 и повторно запускает миграции', async () => {
    // Известное поведение: если meta потеряна, а данные в таблицах остались —
    // seed запустится заново и создаст дубликаты. Это документирует текущую логику.
    await seedDatabaseWith(db)
    const stonesAfter = await db.stones.count()
    expect(stonesAfter).toBeGreaterThan(stonesBefore)
  })

  it('после повторного запуска seedVersion восстанавливается в 1', async () => {
    await seedDatabaseWith(db)
    const meta = await db.meta.get('seedVersion')
    expect(meta?.value).toBe(1)
  })
})

// ─── Пользовательские данные при переустановке ───────────────────────────────

describe('Пользовательские данные при переустановке', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
    await seedDatabaseWith(db)
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('пользовательские заточки удаляются при полной очистке и не возвращаются', async () => {
    const self = await db.clients.filter(c => c.isSelf).first()
    await db.sharpenings.add({
      clientId: self!.id!,
      knifeBrand: 'Victorinox Fibrox',
      receivedAt: new Date('2026-01-10'),
      status: 'done',
      doneAt: new Date('2026-01-11'),
    })
    expect(await db.sharpenings.count()).toBe(1)

    // Полная очистка (унистолляция)
    await db.clients.clear()
    await db.sharpenings.clear()
    await db.stones.clear()
    await db.steels.clear()
    await db.knives.clear()
    await db.meta.clear()

    await seedDatabaseWith(db)

    // Заточки пользователя не восстанавливаются
    expect(await db.sharpenings.count()).toBe(0)
  })

  it('кастомные камни пользователя удаляются при переустановке', async () => {
    await db.stones.add({ brand: 'Мой Naniwa Pro 400', grit: 400, type: 'ao', isCustom: true })
    const countWithCustom = await db.stones.count()

    await db.clients.clear()
    await db.stones.clear()
    await db.steels.clear()
    await db.knives.clear()
    await db.meta.clear()

    await seedDatabaseWith(db)

    const countAfter = await db.stones.count()
    // Кастомный камень исчез, только seed-данные
    expect(countAfter).toBeLessThan(countWithCustom)
    const custom = await db.stones.filter(s => s.isCustom).count()
    expect(custom).toBe(0)
  })

  it('кастомные клиенты удаляются при переустановке', async () => {
    await db.clients.add({ name: 'Сидоров А.В.', isSelf: false, createdAt: new Date() })
    expect(await db.clients.count()).toBe(2) // «Я» + Сидоров

    await db.clients.clear()
    await db.sharpenings.clear()
    await db.stones.clear()
    await db.steels.clear()
    await db.knives.clear()
    await db.meta.clear()

    await seedDatabaseWith(db)

    // После переустановки только «Я»
    expect(await db.clients.count()).toBe(1)
    const self = await db.clients.filter(c => c.isSelf).first()
    expect(self?.name).toBe('Я')
  })
})
