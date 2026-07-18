import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AppTochiteDB } from '../db/db'
import {
  performCloudBackup,
  saveYandexToken,
  setCloudAutoBackup,
  getCloudLastAt,
} from './cloudBackup'

function makeDB(): AppTochiteDB {
  return new AppTochiteDB(`test-${Math.random().toString(36).slice(2)}`)
}

// fetch-мок Яндекс.Диска: запрос upload-ссылки + PUT файла + (после успеха)
// листинг для ротации. mode управляет исходом заливки.
type FetchMode = 'ok' | 'http-error' | 'network-error'

function installFetchMock(mode: () => FetchMode) {
  const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/resources/upload')) {
      if (mode() === 'http-error') return new Response('', { status: 500 })
      return new Response(JSON.stringify({ href: 'https://uploader.test/put' }), { status: 200 })
    }
    if (url === 'https://uploader.test/put' && init?.method === 'PUT') {
      if (mode() === 'network-error') throw new TypeError('network down')
      return new Response('', { status: 201 })
    }
    if (url.includes('/resources?path=')) {
      // листинг для ротации после успешной заливки
      return new Response(JSON.stringify({ _embedded: { items: [] } }), { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

function countUploadAttempts(fetchSpy: ReturnType<typeof vi.fn>): number {
  return fetchSpy.mock.calls.filter(([input]) => String(input).includes('/resources/upload')).length
}

// Гейт на заливку — сигнатура данных, а не календарный день (день-гейт терял
// правки того же дня, см. комментарий над performCloudBackup в cloudBackup.ts).
// Поэтому все сценарии ниже — про изменение/неизменность данных, а не про дни.
describe('performCloudBackup — гейт по сигнатуре данных', () => {
  let db: AppTochiteDB

  beforeEach(async () => {
    db = makeDB()
    await db.open()
    await saveYandexToken(db, 'test-token')
    await setCloudAutoBackup(db, true)
    await db.clients.add({ name: 'Я', isSelf: true, createdAt: new Date(), updatedAt: new Date() })
  })

  afterEach(async () => {
    db.close()
    await db.delete()
    vi.unstubAllGlobals()
  })

  it('после успешной заливки повторный вызов без изменений данных не дёргает API', async () => {
    const fetchSpy = installFetchMock(() => 'ok')

    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1)
    expect(await getCloudLastAt(db)).toBeInstanceOf(Date)

    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1) // сигнатура не изменилась
  })

  it('изменение данных того же дня всё равно заливается — без дневного гейта', async () => {
    const fetchSpy = installFetchMock(() => 'ok')

    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1)

    // данные изменились в тот же день — раньше дневной гейт это пропускал
    await db.sharpenings.add({ clientId: 1, knifeBrand: 'X', receivedAt: new Date(), status: 'accepted', updatedAt: new Date() })
    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(2)
  })

  it('HTTP-ошибка заливки не блокирует следующий вызов — он ретраит', async () => {
    let mode: FetchMode = 'http-error'
    const fetchSpy = installFetchMock(() => mode)

    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1)
    expect(await getCloudLastAt(db)).toBeNull()

    mode = 'ok'
    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(2) // сигнатура не была записана — ретраит
    expect(await getCloudLastAt(db)).toBeInstanceOf(Date)
  })

  it('сетевое исключение не блокирует следующий вызов — он ретраит', async () => {
    let mode: FetchMode = 'network-error'
    const fetchSpy = installFetchMock(() => mode)

    await expect(performCloudBackup(db)).rejects.toThrow()
    expect(countUploadAttempts(fetchSpy)).toBe(1)

    mode = 'ok'
    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(2)
    expect(await getCloudLastAt(db)).toBeInstanceOf(Date)
  })
})
