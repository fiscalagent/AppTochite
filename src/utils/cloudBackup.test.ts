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

describe('performCloudBackup — дневной гейт', () => {
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

  it('после успешной заливки второй вызов в тот же день не дёргает API', async () => {
    const fetchSpy = installFetchMock(() => 'ok')

    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1)
    expect(await getCloudLastAt(db)).toBeInstanceOf(Date)

    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1) // гейт сработал
  })

  it('HTTP-ошибка заливки не съедает день — следующий вызов ретраит', async () => {
    let mode: FetchMode = 'http-error'
    const fetchSpy = installFetchMock(() => mode)

    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1)
    expect(await getCloudLastAt(db)).toBeNull()

    mode = 'ok'
    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(2) // ретрай в тот же день
    expect(await getCloudLastAt(db)).toBeInstanceOf(Date)
  })

  it('сетевое исключение не съедает день — следующий вызов ретраит', async () => {
    let mode: FetchMode = 'network-error'
    const fetchSpy = installFetchMock(() => mode)

    await expect(performCloudBackup(db)).rejects.toThrow()
    expect(countUploadAttempts(fetchSpy)).toBe(1)

    mode = 'ok'
    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(2)
    expect(await getCloudLastAt(db)).toBeInstanceOf(Date)
  })

  it('без изменений данных повторный день не заливает снапшот заново', async () => {
    const fetchSpy = installFetchMock(() => 'ok')

    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1)

    // имитируем «наступил новый день»: сбрасываем дневной гейт, сигнатура остаётся
    await db.settings.delete('yandexLastCheckDay')
    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(1) // данные не менялись — заливки нет

    // данные изменились → заливка происходит
    await db.settings.delete('yandexLastCheckDay')
    await db.sharpenings.add({ clientId: 1, knifeBrand: 'X', receivedAt: new Date(), status: 'accepted', updatedAt: new Date() })
    await performCloudBackup(db)
    expect(countUploadAttempts(fetchSpy)).toBe(2)
  })
})
