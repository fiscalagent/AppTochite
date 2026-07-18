import { db, stoneDisplayName } from '../db/instance'
import type { Sharpening } from '../db/db'
import { APP_VERSION } from '../version'
import { uuid } from '../utils/uuid'

const ENDPOINT = import.meta.env.VITE_ANALYTICS_URL as string | undefined

// Платформа сборки: 'native' — APK (Capacitor), 'web' — PWA. Подставляется на
// этапе сборки (import.meta.env.MODE), уходит в каждое событие → в Google Sheet
// APK-устройства отделяются от PWA одной колонкой.
export const PLATFORM: 'native' | 'web' = import.meta.env.MODE === 'capacitor' ? 'native' : 'web'

// Один id на загрузку страницы — группирует события в «сессию».
// uuid() из utils/uuid.ts, а не голый crypto.randomUUID() — на старых Android
// WebView его нет, а это модуль верхнего уровня: main.tsx импортирует track()
// статически, поэтому исключение здесь при инициализации роняет весь бандл
// (белый экран) ещё до рендера React, а не только аналитику.
const SESSION_ID = uuid()

export async function getDeviceId(): Promise<string> {
  const existing = await db.settings.get('analyticsDeviceId')
  if (existing?.value) return existing.value as string
  const id = uuid()
  await db.settings.put({ key: 'analyticsDeviceId', value: id })
  return id
}

export async function isAnalyticsEnabled(): Promise<boolean> {
  const setting = await db.settings.get('analyticsOptOut')
  return !setting?.value
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  await db.settings.put({ key: 'analyticsOptOut', value: !enabled })
}

async function sendPayload(payload: object): Promise<void> {
  const url = `${ENDPOINT}?data=${encodeURIComponent(JSON.stringify(payload))}`
  await fetch(url, { mode: 'no-cors' })
}

// POST для больших payload'ов (баг-репорты): текст пользователя не влезает в URL.
// text/plain — единственный «простой» Content-Type, который Apps Script принимает
// без CORS-preflight; тело — тот же JSON, что и в GET-параметре data.
async function sendPayloadPost(payload: object): Promise<void> {
  await fetch(ENDPOINT!, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })
}

export async function enqueue(payload: object): Promise<void> {
  await db.analyticsQueue.add({ payload: JSON.stringify(payload), queuedAt: new Date() })
}

export function hasAnalyticsEndpoint(): boolean {
  return Boolean(ENDPOINT)
}

// Единая точка отправки: баг-репорты уходят POST'ом, остальное — GET'ом.
export async function deliverPayload(payload: object): Promise<void> {
  const isBugReport = (payload as { event?: string }).event === 'bug_report'
  if (isBugReport) await sendPayloadPost(payload)
  else await sendPayload(payload)
}

export async function flushAnalyticsQueue(): Promise<void> {
  if (!ENDPOINT || !navigator.onLine) return
  const items = await db.analyticsQueue.orderBy('queuedAt').toArray()
  for (const item of items) {
    try {
      await deliverPayload(JSON.parse(item.payload))
      await db.analyticsQueue.delete(item.id!)
    } catch {
      break
    }
  }
}

// ─── Обобщённые продуктовые события ─────────────────────────────────────────
// ВАЖНО: в события НИКОГДА не уходит PII — имена клиентов, телефоны, телеграм,
// фото, тексты комментариев. Только enum'ы, счётчики, флаги, случайный deviceId.

function displayMode(): 'standalone' | 'browser' {
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone
  return standalone ? 'standalone' : 'browser'
}

// Базовый контекст — цепляется к app_open и воронке установки (где он важен
// для разбора), не к каждому мелкому событию.
export function baseContext() {
  return {
    displayMode: displayMode(),
    online: navigator.onLine,
    lang: navigator.language,
    appVersion: APP_VERSION,
    ua: navigator.userAgent,
  }
}

// Универсальная отправка события. Та же труба, что и trackSharpening:
// guard на endpoint + opt-out, при сбое сети — в офлайн-очередь.
export async function track(event: string, props: Record<string, unknown> = {}): Promise<void> {
  if (!ENDPOINT) return
  if (!(await isAnalyticsEnabled())) return

  const deviceId = await getDeviceId()
  const payload = {
    event,
    deviceId,
    sessionId: SESSION_ID,
    ts: new Date().toISOString(),
    platform: PLATFORM,
    ...props,
  }

  try {
    await sendPayload(payload)
  } catch {
    enqueue(payload).catch(() => {})
  }
}

// Анти-спам: событие шлётся не более одного раза за загрузку страницы.
// Для частых триггеров (голос распознаёт по слову — иначе десятки строк).
const onceSent = new Set<string>()
export function trackOnce(event: string, props: Record<string, unknown> = {}): void {
  if (onceSent.has(event)) return
  onceSent.add(event)
  track(event, props).catch(() => {})
}

export async function trackSharpening(sharpening: Sharpening): Promise<void> {
  if (!ENDPOINT || sharpening.status !== 'done') return
  if (!(await isAnalyticsEnabled())) return

  const [deviceId, allStones] = await Promise.all([
    getDeviceId(),
    db.stones.toArray(),
  ])

  const stoneMap = new Map(allStones.map(st => [stoneDisplayName(st).toLowerCase(), st]))

  const sharpeningStones = sharpening.stones ?? []
  const maxOrder = sharpeningStones.reduce((m, s) => Math.max(m, s.order), 0)

  const stones = sharpeningStones.map(s => {
    const stone = stoneMap.get(s.name.toLowerCase())
    return {
      name: s.name,
      gritFepa: stone?.gritFepa ?? null,
      gritJis: stone?.gritJis ?? null,
      gritMicrons: stone?.gritMicrons ?? null,
      gritMk: stone?.gritMk ?? null,
      gritSource: stone?.gritSource ?? null,
      type: stone?.type ?? null,
      isFin: s.order === maxOrder,
    }
  })

  const payload = {
    deviceId,
    platform: PLATFORM,
    doneAt: (sharpening.doneAt ?? new Date()).toISOString(),
    knife: {
      brand: sharpening.knifeBrand,
      steel: sharpening.steel ?? null,
      hrc: sharpening.hrc ?? null,
      angle: sharpening.angle ?? null,
    },
    stones,
  }

  try {
    await sendPayload(payload)
  } catch {
    enqueue(payload).catch(() => {})
  }
}
