import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AppTochiteDB } from '../db/db'
import {
  performCloudBackup,
  saveYandexToken,
  setCloudAutoBackup,
  getCloudLastAt,
  downloadAndMerge,
  downloadSnapshotJson,
} from './cloudBackup'
import type { BackupFile } from './backup'

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

// Регрессия: storage-href от /resources/download — временная подписанная ссылка
// на отдельный домен. Authorization на неё слать нельзя — он не нужен и ломает
// запрос CORS-preflight'ом («Не удалось загрузить снапшот»). Заголовок шлём только
// на API-домен (за самой ссылкой), как и при загрузке (putBackup).
describe('скачивание из облака — Authorization только на API, не на storage-href', () => {
  const STORAGE_HREF = 'https://downloader.test/get'

  function validBackup(): BackupFile {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        clients: [{ id: 1, name: 'Я', isSelf: true, guid: 'g-self', createdAt: new Date(), updatedAt: new Date() }],
        sharpenings: [],
        stones: [],
        steels: [],
        knives: [],
        meta: [],
      },
    }
  }

  // Мок: GET /resources/download → { href }, затем GET по самому href → тело файла.
  function installDownloadMock(body: string) {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/resources/download')) {
        return new Response(JSON.stringify({ href: STORAGE_HREF }), { status: 200 })
      }
      if (url === STORAGE_HREF) {
        return new Response(body, { status: 200 })
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchSpy)
    return fetchSpy
  }

  function authHeaderOf(call: unknown[] | undefined): string | undefined {
    const init = call?.[1] as RequestInit | undefined
    const headers = (init?.headers ?? {}) as Record<string, string>
    return headers.Authorization
  }

  function callFor(fetchSpy: ReturnType<typeof vi.fn>, pred: (url: string) => boolean) {
    return fetchSpy.mock.calls.find(([input]) => pred(String(input)))
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('downloadAndMerge: на storage-href заголовка нет, на API-домене он есть', async () => {
    const db = makeDB()
    await db.open()
    try {
      const fetchSpy = installDownloadMock(JSON.stringify(validBackup()))

      const result = await downloadAndMerge(db, 'tok', 'backup-abcd1234-2026-06-23.json')
      expect(result).not.toBe('error')
      expect(result).not.toBe('auth-error')

      expect(authHeaderOf(callFor(fetchSpy, u => u === STORAGE_HREF))).toBeUndefined()
      expect(authHeaderOf(callFor(fetchSpy, u => u.includes('/resources/download')))).toBe('OAuth tok')
    } finally {
      db.close()
      await db.delete()
    }
  })

  it('downloadSnapshotJson: на storage-href заголовка нет, файл распарсен', async () => {
    const fetchSpy = installDownloadMock(JSON.stringify(validBackup()))

    const got = await downloadSnapshotJson('backup-abcd1234-2026-06-23.json', 'tok')
    expect(got).not.toBeNull()
    expect(got?.data.clients).toHaveLength(1)

    expect(authHeaderOf(callFor(fetchSpy, u => u === STORAGE_HREF))).toBeUndefined()
    expect(authHeaderOf(callFor(fetchSpy, u => u.includes('/resources/download')))).toBe('OAuth tok')
  })
})
