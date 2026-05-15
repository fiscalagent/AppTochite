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
      grit: stone?.grit ?? null,
      gritUnit: stone?.gritUnit ?? null,
      gritMk: stone?.gritMk ?? null,
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

  const url = `${ENDPOINT}?data=${encodeURIComponent(JSON.stringify(payload))}`
  fetch(url, { mode: 'no-cors' }).catch(() => {})
}
