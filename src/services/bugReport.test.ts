import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ENDPOINT захватывается в analytics.ts на этапе загрузки модуля из import.meta.env,
// поэтому стабим env + сбрасываем модули и импортируем динамически в каждом тесте
// (тот же подход, что в analytics.test.ts).

describe('bugReport', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('VITE_ANALYTICS_URL', 'https://example.test/track')
    const { db } = await import('../db/instance')
    await db.settings.clear()
    await db.analyticsQueue.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('шлёт POST text/plain с event=bug_report, текстом, контактом и диагностикой', async () => {
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)
    const { collectDiagnostics, buildBugReportPayload, sendBugReport } = await import('./bugReport')

    const diag = await collectDiagnostics()
    const payload = await buildBugReportPayload('не сохраняется фото', '@user', diag)
    await sendBugReport(payload)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.test/track')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toContain('text/plain')
    const body = JSON.parse(init.body as string)
    expect(body.event).toBe('bug_report')
    expect(body.text).toBe('не сохраняется фото')
    expect(body.contact).toBe('@user')
    expect(typeof body.deviceId).toBe('string')
    expect(typeof body.appVersion).toBe('string')
    expect(body.platform).toBe('web')
    expect(body.clientsCount).toBe(0)
    expect(body.sharpeningsCount).toBe(0)
  })

  it('пустой контакт уходит как null', async () => {
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)
    const { collectDiagnostics, buildBugReportPayload, sendBugReport } = await import('./bugReport')

    const payload = await buildBugReportPayload('текст', '', await collectDiagnostics())
    await sendBugReport(payload)

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.contact).toBeNull()
  })

  it('отправляется даже при выключенной аналитике — это явное действие пользователя', async () => {
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)
    const { setAnalyticsEnabled } = await import('./analytics')
    const { collectDiagnostics, buildBugReportPayload, sendBugReport } = await import('./bugReport')

    await setAnalyticsEnabled(false)
    const payload = await buildBugReportPayload('баг', '', await collectDiagnostics())
    await sendBugReport(payload)

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('при сбое сети кладёт репорт в analyticsQueue', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const { collectDiagnostics, buildBugReportPayload, sendBugReport } = await import('./bugReport')
    const { db } = await import('../db/instance')

    const payload = await buildBugReportPayload('офлайн-баг', '', await collectDiagnostics())
    await sendBugReport(payload)

    expect(await db.analyticsQueue.count()).toBe(1)
    const [item] = await db.analyticsQueue.toArray()
    expect(JSON.parse(item.payload).event).toBe('bug_report')
  })

  it('flushAnalyticsQueue доставляет отложенный репорт POST-ом, а обычные события — GET-ом', async () => {
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)
    const { flushAnalyticsQueue, enqueue } = await import('./analytics')

    await enqueue({ event: 'app_open' })
    await enqueue({ event: 'bug_report', text: 'из очереди' })
    await flushAnalyticsQueue()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [getUrl, getInit] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]
    expect(getUrl).toContain('data=')
    expect(getInit?.method).toBeUndefined()
    const [, postInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(postInit.method).toBe('POST')
    expect(JSON.parse(postInit.body as string).text).toBe('из очереди')

    const { db } = await import('../db/instance')
    expect(await db.analyticsQueue.count()).toBe(0)
  })

  it('без endpoint отправка — no-op без падения', async () => {
    vi.stubEnv('VITE_ANALYTICS_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    const { collectDiagnostics, buildBugReportPayload, sendBugReport, isBugReportAvailable } =
      await import('./bugReport')

    expect(isBugReportAvailable()).toBe(false)
    const payload = await buildBugReportPayload('текст', '', await collectDiagnostics())
    await sendBugReport(payload)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
