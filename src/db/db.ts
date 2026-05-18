import Dexie, { type Table } from 'dexie'

export interface Meta {
  key: string
  value: number | string | boolean
}

export interface Setting {
  key: string
  value: unknown
}

export interface Client {
  id?: number
  name: string
  phone?: string
  telegram?: string
  avatar?: string
  isSelf: boolean
  createdAt: Date
  updatedAt?: Date
}

export interface SharpeningStone {
  name: string
  order: number
}

export type SharpeningStatus = 'accepted' | 'done'

export interface Sharpening {
  id?: number
  clientId: number
  knifeBrand: string
  steel?: string
  hrc?: number
  condition?: string[]
  receivedAt: Date
  angle?: number
  stones?: SharpeningStone[]
  comment?: string
  price?: number
  status: SharpeningStatus
  doneAt?: Date
  photosBefore?: string[]
  photosAfter?: string[]
  updatedAt?: Date
}

export type GritUnit = 'fepa' | 'jis' | 'mk'

export const MK_VALUES = [
  '315/250','250/200','200/160','160/125','125/100','100/80',
  '80/63','63/50','60/40','50/40','40/28','28/20','20/14',
  '14/10','10/7','7/5','5/3','3/2','2/1','1/0',
]

export type StoneCoolant = 'water' | 'oil' | 'both'

export interface Stone {
  id?: number
  brand: string
  grit?: number
  gritUnit?: GritUnit
  gritMk?: string
  type?: 'galvanic' | 'ao' | 'kk' | 'diamond' | 'elbor' | 'natural' | 'pritir' | 'ceramic' | 'other'
  coolant?: StoneCoolant
  category?: string
  description?: string
  isCustom: boolean
  updatedAt?: Date
}

export function stoneDisplayName(stone: Stone): string {
  if (stone.gritUnit === 'mk' && stone.gritMk) return `${stone.brand} ${stone.gritMk}мк`
  if (stone.grit != null) {
    if (stone.gritUnit === 'fepa') return `${stone.brand} ${stone.grit} FEPA`
    if (stone.gritUnit === 'jis') return `${stone.brand} ${stone.grit} JIS`
    return `${stone.brand} ${stone.grit}`
  }
  return stone.brand
}

export function compareStonesForSort(a: Stone, b: Stone): number {
  const isMkA = a.gritUnit === 'mk'
  const isMkB = b.gritUnit === 'mk'
  if (!isMkA && !isMkB) return (a.grit ?? Infinity) - (b.grit ?? Infinity)
  if (isMkA && isMkB) {
    return MK_VALUES.indexOf(a.gritMk ?? '') - MK_VALUES.indexOf(b.gritMk ?? '')
  }
  return isMkA ? 1 : -1
}

export interface Steel {
  id?: number
  name: string
  hrc?: number
  recommendedAngle?: number
  category?: string
  description?: string
  isCustom: boolean
  updatedAt?: Date
}

export interface Knife {
  id?: number
  brand: string
  country?: string
  steel?: string
  recommendedAngle?: number
  type?: string
  category?: string
  description?: string
  isCustom: boolean
  updatedAt?: Date
}

export interface AnalyticsQueueItem {
  id?: number
  payload: string
  queuedAt: Date
}

export class AppTochiteDB extends Dexie {
  clients!: Table<Client>
  sharpenings!: Table<Sharpening>
  stones!: Table<Stone>
  steels!: Table<Steel>
  knives!: Table<Knife>
  meta!: Table<Meta>
  settings!: Table<Setting>
  analyticsQueue!: Table<AnalyticsQueueItem>

  constructor(name = 'AppTochiteDB') {
    super(name)
    // v1: initial schema
    this.version(1).stores({
      clients:     '++id, name, isSelf',
      sharpenings: '++id, clientId, status, receivedAt',
      stones:      '++id, brand, type, isCustom',
      steels:      '++id, name, isCustom',
      knives:      '++id, brand, isCustom',
    })
    // v2: grit index on stones
    this.version(2).stores({
      stones: '++id, brand, grit, type, isCustom',
    })
    // v3: meta table for seed versioning
    // Upgrade marks existing users as already at seed v1 so they don't re-receive initial seed.
    this.version(3).stores({
      meta: 'key',
    }).upgrade(async tx => {
      const stoneCount = await tx.table('stones').count()
      if (stoneCount > 0) {
        await tx.table('meta').put({ key: 'seedVersion', value: 1 })
      }
    })
    // v4: settings table for device-specific state (not included in backups/restore).
    // Migrates firstLaunchAt and lastBackupAt out of meta so restore never resets them.
    this.version(4).stores({
      settings: 'key',
    }).upgrade(async tx => {
      for (const key of ['firstLaunchAt', 'lastBackupAt']) {
        const entry = await tx.table('meta').get(key)
        if (entry) {
          await tx.table('settings').put(entry)
          await tx.table('meta').delete(key)
        }
      }
    })
    // v5: updatedAt for merge-based restore (last-write-wins per record).
    // Existing records get a best-effort timestamp from existing date fields.
    this.version(5).stores({}).upgrade(async tx => {
      await tx.table('clients').toCollection().modify((c: Client) => {
        if (!c.updatedAt) c.updatedAt = c.createdAt ?? new Date(0)
      })
      await tx.table('sharpenings').toCollection().modify((s: Sharpening) => {
        if (!s.updatedAt) s.updatedAt = s.doneAt ?? s.receivedAt ?? new Date(0)
      })
      for (const table of ['stones', 'steels', 'knives']) {
        await tx.table(table).toCollection().modify((item: Stone | Steel | Knife) => {
          if (!item.updatedAt) item.updatedAt = new Date(0)
        })
      }
    })
    // v6: analyticsQueue for offline event buffering (not included in backups).
    this.version(6).stores({
      analyticsQueue: '++id, queuedAt',
    })
  }
}

