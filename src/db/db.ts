import Dexie, { type Table } from 'dexie'

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
  grit: number
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

  constructor() {
    super('AppTochiteDB')
    this.version(1).stores({
      clients:     '++id, name, isSelf',
      sharpenings: '++id, clientId, status, receivedAt',
      stones:      '++id, brand, type, isCustom',
      steels:      '++id, name, isCustom',
      knives:      '++id, brand, isCustom',
    })
    this.version(2).stores({
      stones: '++id, brand, grit, type, isCustom',
    })
  }
}

export const db = new AppTochiteDB()
