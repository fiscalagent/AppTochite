import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ENDPOINT захватывается в analytics.ts на этапе загрузки модуля из import.meta.env,
// поэтому стабим env + сбрасываем модули и импортируем analytics динамически в каждом тесте.

describe('analytics track()', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('VITE_ANALYTICS_URL', 'https://example.test/track')
    // Чистим общий fake-indexeddb между тестами (имя БД константно, данные живут глобально).
    const { db } = await import('../db/instance')
    await db.settings.clear()
    await db.analyticsQueue.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('строит payload с event/deviceId/sessionId/ts и пробрасывает props', async () => {
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)
    const { track } = await import('./analytics')

    await track('client_created', { hasPhone: true })

    expect(fetchMock).toHaveBeenCalledOnce()
    const url = fetchMock.mock.calls[0][0] as string
    const payload = JSON.parse(decodeURIComponent(url.split('data=')[1]))
    expect(payload.event).toBe('client_created')
    expect(payload.hasPhone).toBe(true)
    expect(typeof payload.deviceId).toBe('string')
    expect(typeof payload.sessionId).toBe('string')
    expect(typeof payload.ts).toBe('string')
  })

  it('ничего не шлёт при отключённой аналитике (opt-out)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)
    const { track, setAnalyticsEnabled } = await import('./analytics')

    await setAnalyticsEnabled(false)
    await track('app_open')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('складывает событие в очередь при сбое сети', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const { track } = await import('./analytics')
    const { db } = await import('../db/instance')

    await track('sharpening_created', { repeat: false })

    await vi.waitFor(async () => {
      expect(await db.analyticsQueue.count()).toBe(1)
    })
    const [item] = await db.analyticsQueue.toArray()
    const payload = JSON.parse(item.payload)
    expect(payload.event).toBe('sharpening_created')
  })

  it('trackOnce шлёт событие только один раз за загрузку', async () => {
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)
    const { trackOnce } = await import('./analytics')

    trackOnce('voice_used')
    trackOnce('voice_used')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
