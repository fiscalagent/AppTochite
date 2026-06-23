import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AppTochiteDB } from '../db/db'
import {
  performCloudBackup,
  saveYandexToken,
  setCloudAutoBackup,
  getCloudLastAt,
  getSnapshotDownloadUrl,
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

// Прямое чтение файла из облака через fetch невозможно: storage-домен Яндекса не
// отдаёт CORS. Поэтому файл качается навигацией браузера, а getSnapshotDownloadUrl
// лишь добывает свежую подписанную ссылку (API-домен, нужен Authorization).
describe('getSnapshotDownloadUrl — ссылка для навигационного скачивания', () => {
  const STORAGE_HREF = 'https://downloader.test/get'

  function authHeaderOf(call: unknown[] | undefined): string | undefined {
    const init = call?.[1] as RequestInit | undefined
    const headers = (init?.headers ?? {}) as Record<string, string>
    return headers.Authorization
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('возвращает href и шлёт Authorization на API-запрос', async () => {
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL) =>
      new Response(JSON.stringify({ href: STORAGE_HREF }), { status: 200 }))
    vi.stubGlobal('fetch', fetchSpy)

    const url = await getSnapshotDownloadUrl('tok', 'backup-abcd1234-2026-06-23.json')
    expect(url).toBe(STORAGE_HREF)

    const call = fetchSpy.mock.calls.find(([u]) => String(u).includes('/resources/download'))
    expect(call).toBeTruthy()
    expect(authHeaderOf(call)).toBe('OAuth tok')
  })

  it('401 → auth-error, прочий не-ok → error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })))
    expect(await getSnapshotDownloadUrl('tok', 'x.json')).toBe('auth-error')

    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    expect(await getSnapshotDownloadUrl('tok', 'x.json')).toBe('error')
  })

  it('сетевое исключение (CORS/offline) → error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await getSnapshotDownloadUrl('tok', 'x.json')).toBe('error')
  })
})
