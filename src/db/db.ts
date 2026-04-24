import Dexie, { type Table } from 'dexie'

export interface Meta {
  key: string
  value: number | string | boolean
}

export interface Client {
  id?: number
  name: string
  phone?: string
  telegram?: string
  isSelf: boolean
  createdAt: Date
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
}

export interface Stone {
  id?: number
  brand: string
  grit?: number
  type: 'galvanic' | 'ao' | 'kk' | 'diamond' | 'elbor' | 'natural' | 'pritir'
  category?: string
  description?: string
  isCustom: boolean
}

export interface Steel {
  id?: number
  name: string
  hrc?: number
  recommendedAngle?: number
  category?: string
  description?: string
  isCustom: boolean
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
}

class AppTochiteDB extends Dexie {
  clients!: Table<Client>
  sharpenings!: Table<Sharpening>
  stones!: Table<Stone>
  steels!: Table<Steel>
  knives!: Table<Knife>
  meta!: Table<Meta>

  constructor() {
    super('AppTochiteDB')
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
  }
}

export const db = new AppTochiteDB()

// If schema upgrade is blocked by another tab running old code, reload to retry.
db.on('blocked', () => { window.location.reload() })
