import type { AppTochiteDB, Client, Sharpening, Stone, Steel, Knife, Meta } from '../db/instance'

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function getLastBackupAt(database: AppTochiteDB): Promise<Date | null> {
  const meta = await database.meta.get('lastBackupAt')
  if (!meta) return null
  return new Date(meta.value as string)
}

export async function updateLastBackupAt(database: AppTochiteDB): Promise<void> {
  await database.meta.put({ key: 'lastBackupAt', value: new Date().toISOString() })
}

export interface BackupFile {
  version: 1
  exportedAt: string
  data: {
    clients: Client[]
    sharpenings: Sharpening[]
    stones: Stone[]
    steels: Steel[]
    knives: Knife[]
    meta: Meta[]
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

export function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value)
  return value
}

export function isValidBackup(obj: unknown): obj is BackupFile {
  if (!obj || typeof obj !== 'object') return false
  const b = obj as Record<string, unknown>
  if (b.version !== 1 || !b.exportedAt || !b.data || typeof b.data !== 'object') return false
  const d = b.data as Record<string, unknown>
  return ['clients', 'sharpenings', 'stones', 'steels', 'knives'].every(
    k => Array.isArray(d[k])
  )
}

export function buildCSV(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`
  return '﻿' + rows.map(r => r.map(escape).join(';')).join('\r\n')
}

export async function exportBackup(database: AppTochiteDB): Promise<BackupFile> {
  const [clients, sharpenings, stones, steels, knives, meta] = await Promise.all([
    database.clients.toArray(),
    database.sharpenings.toArray(),
    database.stones.toArray(),
    database.steels.toArray(),
    database.knives.toArray(),
    database.meta.toArray(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { clients, sharpenings, stones, steels, knives, meta },
  }
}

export async function restoreBackup(database: AppTochiteDB, backup: BackupFile): Promise<void> {
  await database.transaction(
    'rw',
    [database.clients, database.sharpenings, database.stones, database.steels, database.knives, database.meta],
    async () => {
      await Promise.all([
        database.clients.clear(),
        database.sharpenings.clear(),
        database.stones.clear(),
        database.steels.clear(),
        database.knives.clear(),
        database.meta.clear(),
      ])
      await Promise.all([
        database.clients.bulkPut(backup.data.clients),
        database.sharpenings.bulkPut(backup.data.sharpenings),
        database.stones.bulkPut(backup.data.stones),
        database.steels.bulkPut(backup.data.steels),
        database.knives.bulkPut(backup.data.knives),
        database.meta.bulkPut(backup.data.meta ?? []),
      ])
    }
  )
}

export function buildSharpeningCSV(
  sharpenings: Sharpening[],
  clientMap: Map<number, string>
): string {
  const toDate = (d: Date | string | undefined) =>
    d ? (d instanceof Date ? d : new Date(d)).toLocaleDateString('ru') : ''

  const headers = [
    '№ заточки', 'Дата приёмки', 'Дата готовности', 'Клиент', 'Нож', 'Сталь', 'HRC',
    'Тип работы', 'Угол °', 'Порядок камня', 'Камень', 'Комментарий', 'Цена', 'Статус',
  ]

  const rows: (string | number | null | undefined)[][] = []

  for (const sh of sharpenings) {
    const base = [
      sh.id,
      toDate(sh.receivedAt),
      toDate(sh.doneAt),
      clientMap.get(sh.clientId) ?? '',
      sh.knifeBrand,
      sh.steel ?? '',
      sh.hrc ?? '',
      sh.condition?.join(', ') ?? '',
      sh.angle ?? '',
    ]
    const suffix = [sh.comment ?? '', sh.price ?? '', sh.status === 'done' ? 'Готово' : 'Принят']

    if (sh.stones && sh.stones.length > 0) {
      for (const st of sh.stones) {
        rows.push([...base, st.order, st.name, ...suffix])
      }
    } else {
      rows.push([...base, '', '', ...suffix])
    }
  }

  return buildCSV([headers, ...rows])
}
