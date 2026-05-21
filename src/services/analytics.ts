import { db, stoneDisplayName } from '../db/instance'
import type { Sharpening } from '../db/db'

const ENDPOINT = import.meta.env.VITE_ANALYTICS_URL as string | undefined

async function getDeviceId(): Promise<string> {
  const existing = await db.settings.get('analyticsDeviceId')
  if (existing?.value) return existing.value as string
  const id = crypto.randomUUID()
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

async function enqueue(payload: object): Promise<void> {
  await db.analyticsQueue.add({ payload: JSON.stringify(payload), queuedAt: new Date() })
}

export async function flushAnalyticsQueue(): Promise<void> {
  if (!ENDPOINT || !navigator.onLine) return
  const items = await db.analyticsQueue.orderBy('queuedAt').toArray()
  for (const item of items) {
    try {
      await sendPayload(JSON.parse(item.payload))
      await db.analyticsQueue.delete(item.id!)
    } catch {
      break
    }
  }
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
