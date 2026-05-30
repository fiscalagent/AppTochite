import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { liveQuery } from 'dexie'
import { AppTochiteDB } from '../../db/db'
import { loadBackupState, type BackupState } from './loadBackupState'

function makeDB(): AppTochiteDB {
  return new AppTochiteDB(`test-${Math.random().toString(36).slice(2)}`)
}

/** Структурный тип Observable из liveQuery — без привязки к экспортам dexie. */
interface Subscribable<T> {
  subscribe(o: { next: (v: T) => void; error: (e: unknown) => void }): { unsubscribe: () => void }
}

/** Резолвит первое значение liveQuery (или реджектит первую ошибку). */
function firstEmission<T>(obs: Subscribable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const sub = obs.subscribe({
      next: v => { sub.unsubscribe(); resolve(v) },
      error: e => { sub.unsubscribe(); reject(e) },
    })
  })
}

const DAY = 86_400_000

describe('loadBackupState внутри liveQuery', () => {
  let db: AppTochiteDB
  beforeEach(async () => { db = makeDB(); await db.open() })
  afterEach(async () => { db.close(); await db.delete() })

  it('на чистой базе (первый запуск) не кидает ReadOnlyError и ничего не пишет', async () => {
    // Регресс: раньше квери-функция делала db.settings.put('firstLaunchAt')
    // прямо в read-only контексте liveQuery → ReadOnlyError → чёрный экран
    // на первом запуске. Запись вынесена в useEffect; здесь — только чтение.
    const state = await firstEmission<BackupState>(liveQuery(() => loadBackupState(db)))

    expect(state).toEqual({ level: null, daysSince: null, newRecords: 0 })
    // и firstLaunchAt не должен появиться как побочный эффект квери-функции
    expect(await db.settings.get('firstLaunchAt')).toBeUndefined()
  })

  it('в grace-период (установка свежее 3 дней) не напоминает', async () => {
    await db.settings.put({ key: 'firstLaunchAt', value: new Date(Date.now() - DAY).toISOString() })

    const state = await firstEmission<BackupState>(liveQuery(() => loadBackupState(db)))

    expect(state).toEqual({ level: null, daysSince: null, newRecords: 0 })
  })

  it('после grace-периода считает новые записи через liveQuery', async () => {
    await db.settings.put({ key: 'firstLaunchAt', value: new Date(Date.now() - 40 * DAY).toISOString() })
    await db.clients.bulkAdd([
      { name: 'Иванов', isSelf: false, createdAt: new Date() },
      { name: 'Петров', isSelf: false, createdAt: new Date() },
    ])
    await db.sharpenings.bulkAdd([
      { clientId: 1, knifeBrand: 'A', receivedAt: new Date(), status: 'accepted' },
      { clientId: 1, knifeBrand: 'B', receivedAt: new Date(), status: 'done', doneAt: new Date() },
    ])

    const state = await firstEmission<BackupState>(liveQuery(() => loadBackupState(db)))

    // бэкапа не было → newRecords = все живые клиенты + заточки (2 + 2)
    expect(state.newRecords).toBe(4)
    expect(state.level).not.toBeNull()
  })
})
