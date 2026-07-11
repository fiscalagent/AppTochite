import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AppTochiteDB, CURRENT_SCHEMA_VERSION } from './db'
import { maybeCreatePreMigrationSnapshot, type PreMigrationSnapshot } from './preMigrationSnapshot'

// ─── OPFS mock ───────────────────────────────────────────────────────────────

class MockWritable {
  private chunks: string[] = []
  async write(data: string) { this.chunks.push(data) }
  async close() {}
  get content() { return this.chunks.join('') }
}

class MockFileHandle {
  kind = 'file' as const
  name = ''
  private _content = ''
  constructor(name: string) { this.name = name }
  async createWritable() {
    const w = new MockWritable()
    const origClose = w.close.bind(w)
    w.close = async () => { await origClose(); this._content = w.content }
    return w
  }
  async getFile() {
    // Байтовый (UTF-8) размер, а не длина JS-строки — как у реального File System
    // Access/OPFS API.
    return { text: async () => this._content, size: new TextEncoder().encode(this._content).length, lastModified: Date.now() } as unknown as File
  }
  get content() { return this._content }
}

class MockOPFSRoot {
  files = new Map<string, MockFileHandle>()

  async getFileHandle(name: string, opts?: { create?: boolean }) {
    if (!this.files.has(name)) {
      if (opts?.create) this.files.set(name, new MockFileHandle(name))
      else throw new DOMException('NotFoundError', 'NotFoundError')
    }
    return this.files.get(name)!
  }

  async removeEntry(name: string) {
    if (!this.files.delete(name)) throw new DOMException('NotFoundError', 'NotFoundError')
  }

  async *values() {
    for (const handle of this.files.values()) yield handle
  }
}

function mockOPFS(): MockOPFSRoot {
  const root = new MockOPFSRoot()
  vi.stubGlobal('navigator', {
    ...navigator,
    storage: { getDirectory: async () => root },
  })
  return root
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomDbName(): string {
  return `test-premigr-${Math.random().toString(36).slice(2)}`
}

async function deleteRawDb(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('maybeCreatePreMigrationSnapshot', () => {
  let dbName: string

  beforeEach(() => {
    dbName = randomDbName()
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await deleteRawDb(dbName)
  })

  it('не создаёт снапшот, если БД ещё не существует (чистая установка)', async () => {
    const root = mockOPFS()
    await maybeCreatePreMigrationSnapshot(dbName, CURRENT_SCHEMA_VERSION)
    expect(root.files.size).toBe(0)
  })

  it('не создаёт снапшот, если БД уже на текущей версии', async () => {
    // Подготовка: открываем БД на текущей версии.
    const db = new AppTochiteDB(dbName)
    await db.open()
    db.close()

    const root = mockOPFS()
    await maybeCreatePreMigrationSnapshot(dbName, CURRENT_SCHEMA_VERSION)
    expect(root.files.size).toBe(0)
  })

  it('создаёт снапшот, если кодовая версия выше БД, и сохраняет данные', async () => {
    // Подготовка: БД на CURRENT_SCHEMA_VERSION с данными.
    const db = new AppTochiteDB(dbName)
    await db.open()
    await db.clients.add({ name: 'Тест-клиент', isSelf: false, createdAt: new Date() })
    await db.sharpenings.add({
      clientId: 1,
      knifeBrand: 'Тест-нож',
      receivedAt: new Date(),
      status: 'accepted',
    })
    db.close()

    const root = mockOPFS()
    // Симулируем «новую кодовую версию» — на 1 выше реальной.
    await maybeCreatePreMigrationSnapshot(dbName, CURRENT_SCHEMA_VERSION + 1)

    const snapshotFiles = [...root.files.keys()].filter(n => n.startsWith('apptochite-pre-migration-'))
    expect(snapshotFiles.length).toBe(1)
    const filename = snapshotFiles[0]
    expect(filename).toMatch(/^apptochite-pre-migration-v\d+-\d{4}-\d{2}-\d{2}\.json$/)

    const handle = root.files.get(filename)!
    const parsed: PreMigrationSnapshot = JSON.parse(handle.content)
    expect(parsed.version).toBe(2)
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(parsed.data.clients).toHaveLength(1)
    expect((parsed.data.clients[0] as { name: string }).name).toBe('Тест-клиент')
    expect(parsed.data.sharpenings).toHaveLength(1)
  })

  it('включает meta, если она непустая', async () => {
    const db = new AppTochiteDB(dbName)
    await db.open()
    await db.meta.put({ key: 'seedVersion', value: 1 })
    db.close()

    const root = mockOPFS()
    await maybeCreatePreMigrationSnapshot(dbName, CURRENT_SCHEMA_VERSION + 1)

    const snapshotFile = [...root.files.values()][0]
    const parsed: PreMigrationSnapshot = JSON.parse(snapshotFile.content)
    expect(parsed.data.meta).toBeDefined()
    expect(parsed.data.meta).toHaveLength(1)
  })

  it('удаляет снапшоты старше 15 дней', async () => {
    const root = mockOPFS()

    // Старый снапшот (20 дней назад) — должен исчезнуть.
    const old = new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 10)
    const oldName = `apptochite-pre-migration-v5-${old}.json`
    const oldHandle = await root.getFileHandle(oldName, { create: true })
    const oldWritable = await oldHandle.createWritable()
    await oldWritable.write('{}')
    await oldWritable.close()

    // Свежий снапшот (5 дней назад) — должен остаться.
    const fresh = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10)
    const freshName = `apptochite-pre-migration-v6-${fresh}.json`
    const freshHandle = await root.getFileHandle(freshName, { create: true })
    const freshWritable = await freshHandle.createWritable()
    await freshWritable.write('{}')
    await freshWritable.close()

    // На текущей версии БД нет — попадёт в ветку «cleanup only».
    await maybeCreatePreMigrationSnapshot(dbName, CURRENT_SCHEMA_VERSION)

    expect(root.files.has(oldName)).toBe(false)
    expect(root.files.has(freshName)).toBe(true)
  })

  it('не трогает посторонние файлы в OPFS', async () => {
    const root = mockOPFS()
    const otherHandle = await root.getFileHandle('apptochite-auto.json', { create: true })
    const w = await otherHandle.createWritable()
    await w.write('{}')
    await w.close()

    await maybeCreatePreMigrationSnapshot(dbName, CURRENT_SCHEMA_VERSION)

    expect(root.files.has('apptochite-auto.json')).toBe(true)
  })
})
