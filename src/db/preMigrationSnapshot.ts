import { CURRENT_SCHEMA_VERSION } from './db'

const DB_NAME = 'AppTochiteDB'
const SNAPSHOT_PREFIX = 'apptochite-pre-migration-'
const TTL_DAYS = 15

// Те же таблицы, что в exportBackup(): данные пользователя + meta.
// settings/analyticsQueue device-specific и в бэкап не идут.
const STORES = ['clients', 'sharpenings', 'stones', 'steels', 'knives', 'meta'] as const

interface SnapshotData {
  clients: unknown[]
  sharpenings: unknown[]
  stones: unknown[]
  steels: unknown[]
  knives: unknown[]
  meta?: unknown[]
}

export interface PreMigrationSnapshot {
  version: 2
  exportedAt: string
  // Версия Dexie, ИЗ которой сделан снапшот (нужно для диагностики).
  schemaVersion: number
  data: SnapshotData
}

interface ExistingDb { db: IDBDatabase; version: number }

// Dexie хранит свою версию в IndexedDB умноженной на 10 (резерв под minor-апгрейды).
// Соответственно Dexie v8 = IDB v80. Нормализуем при чтении.
function dexieVersion(rawIdbVersion: number): number {
  return rawIdbVersion / 10
}

// Открывает БД без явной версии — апгрейд не запускается. Если БД не существует,
// IDB создаст пустую v1; мы её распознаём (upgradeneeded или 0 stores) и удаляем,
// возвращая null. Кросс-браузерно — не используем indexedDB.databases().
function openIfExists(dbName: string): Promise<ExistingDb | null> {
  return new Promise((resolve, reject) => {
    let wasCreated = false
    const req = indexedDB.open(dbName)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('blocked'))
    req.onupgradeneeded = () => { wasCreated = true }
    req.onsuccess = () => {
      const db = req.result
      if (wasCreated || db.objectStoreNames.length === 0) {
        db.close()
        const del = indexedDB.deleteDatabase(dbName)
        del.onsuccess = () => resolve(null)
        del.onerror = () => resolve(null)
        del.onblocked = () => resolve(null)
      } else {
        resolve({ db, version: dexieVersion(db.version) })
      }
    }
  })
}

function readAll(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([])
      return
    }
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result as unknown[])
    req.onerror = () => reject(req.error)
  })
}

async function readSnapshotData(db: IDBDatabase): Promise<SnapshotData> {
  const [clients, sharpenings, stones, steels, knives, meta] = await Promise.all(
    STORES.map(s => readAll(db, s))
  )
  const data: SnapshotData = { clients, sharpenings, stones, steels, knives }
  if (meta.length > 0) data.meta = meta
  return data
}

function snapshotFilename(schemaVersion: number, date: Date): string {
  return `${SNAPSHOT_PREFIX}v${schemaVersion}-${date.toISOString().slice(0, 10)}.json`
}

const SNAPSHOT_FILENAME_RE = /^apptochite-pre-migration-v\d+-(\d{4}-\d{2}-\d{2})\.json$/

function parseSnapshotDate(filename: string): Date | null {
  const m = filename.match(SNAPSHOT_FILENAME_RE)
  if (!m) return null
  const d = new Date(m[1] + 'T00:00:00.000Z')
  return Number.isNaN(d.getTime()) ? null : d
}

async function cleanupExpired(root: FileSystemDirectoryHandle, now: Date): Promise<void> {
  const cutoff = now.getTime() - TTL_DAYS * 86_400_000
  // values() есть в спеке File System Access API; типы в lib.dom могут отсутствовать.
  const entries = (root as unknown as { values: () => AsyncIterable<FileSystemHandle> }).values()
  for await (const entry of entries) {
    if (entry.kind !== 'file') continue
    const date = parseSnapshotDate(entry.name)
    if (date && date.getTime() < cutoff) {
      try { await root.removeEntry(entry.name) } catch { /* уже удалён */ }
    }
  }
}

async function tryCleanup(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return
  try {
    const root = await navigator.storage.getDirectory()
    await cleanupExpired(root, new Date())
  } catch { /* OPFS недоступен — молча выходим */ }
}

/**
 * Если в IndexedDB сохранена версия схемы ниже текущей кодовой — экспортируем
 * данные в OPFS как pre-migration снапшот ДО того, как Dexie запустит апгрейд.
 * Страховка от ошибок в нашей же миграции.
 *
 * Любые сбои (нет OPFS, нет квоты, гонка с другой вкладкой) логируются, но
 * не блокируют старт приложения — это хуже, чем риск без снапшота.
 */
export async function maybeCreatePreMigrationSnapshot(
  dbName = DB_NAME,
  codeVersion = CURRENT_SCHEMA_VERSION,
): Promise<void> {
  let existing: ExistingDb | null = null
  try {
    existing = await openIfExists(dbName)
  } catch (err) {
    console.error('[AppTochite] pre-migration snapshot detect failed:', err)
    return
  }

  if (!existing || existing.version >= codeVersion) {
    // Чистая установка / уже на последней версии: миграции не будет, снапшот не нужен.
    // Но истёкшие старые снапшоты подчистим — это дешёвая операция.
    existing?.db.close()
    await tryCleanup()
    return
  }

  try {
    const data = await readSnapshotData(existing.db)
    const schemaVersion = existing.version
    existing.db.close()
    existing = null

    const snapshot: PreMigrationSnapshot = {
      version: 2,
      exportedAt: new Date().toISOString(),
      schemaVersion,
      data,
    }

    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return
    const root = await navigator.storage.getDirectory()
    const name = snapshotFilename(schemaVersion, new Date())
    const handle = await root.getFileHandle(name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(JSON.stringify(snapshot))
    await writable.close()

    await cleanupExpired(root, new Date())
  } catch (err) {
    console.error('[AppTochite] pre-migration snapshot failed:', err)
  } finally {
    if (existing) {
      try { existing.db.close() } catch { /* ignore */ }
    }
  }
}
