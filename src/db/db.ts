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

export type GritUnit = 'fepa' | 'jis' | 'mk'

export const MK_VALUES = [
  '315/250','250/200','200/160','160/125','125/100','100/80',
  '80/63','63/50','60/40','50/40','40/28','28/20','20/14',
  '14/10','10/7','7/5','5/3','3/2','2/1','1/0',
]

export interface Stone {
  id?: number
  brand: string
  grit?: number
  gritUnit?: GritUnit
  gritMk?: string
  type: 'galvanic' | 'ao' | 'kk' | 'diamond' | 'elbor' | 'natural' | 'pritir'
  category?: string
  description?: string
  isCustom: boolean
}

export function stoneDisplayName(stone: Stone): string {
  if (stone.gritUnit === 'mk' && stone.gritMk) return `${stone.brand} ${stone.gritMk}мк`
  if (stone.grit != null) {
    if (stone.gritUnit === 'fepa') return `${stone.brand} ${stone.grit}FEPA`
    if (stone.gritUnit === 'jis') return `${stone.brand} ${stone.grit}JIS`
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

export class AppTochiteDB extends Dexie {
  clients!: Table<Client>
  sharpenings!: Table<Sharpening>
  stones!: Table<Stone>
  steels!: Table<Steel>
  knives!: Table<Knife>
  meta!: Table<Meta>

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
  }
}

