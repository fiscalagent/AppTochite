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
  const entry = await database.settings.get('lastBackupAt')
  if (!entry) return null
  return new Date(entry.value as string)
}

export async function updateLastBackupAt(database: AppTochiteDB): Promise<void> {
  await database.settings.put({ key: 'lastBackupAt', value: new Date().toISOString() })
}

export async function getDirectoryHandle(database: AppTochiteDB): Promise<FileSystemDirectoryHandle | null> {
  const entry = await database.settings.get('directoryHandle')
  return (entry?.value as FileSystemDirectoryHandle) ?? null
}

export async function saveDirectoryHandle(database: AppTochiteDB, handle: FileSystemDirectoryHandle): Promise<void> {
  await database.settings.put({ key: 'directoryHandle', value: handle })
}

export async function clearDirectoryHandle(database: AppTochiteDB): Promise<void> {
  await database.settings.delete('directoryHandle')
}

export async function performAutoBackup(database: AppTochiteDB, handle: FileSystemDirectoryHandle): Promise<void> {
  const backup = await exportBackup(database)
  const json = JSON.stringify(backup)
  const fileHandle = await handle.getFileHandle('apptochite-auto.json', { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(json)
  await writable.close()
  await updateLastBackupAt(database)
}

export async function performDailyBackupIfNeeded(database: AppTochiteDB, handle: FileSystemDirectoryHandle): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const entry = await database.settings.get('lastDailyBackupAt')
  if (entry && (entry.value as string).slice(0, 10) === today) return

  const backup = await exportBackup(database)
  const json = JSON.stringify(backup)
  const newFileName = `apptochite-daily-${today}.json`

  const fileHandle = await handle.getFileHandle(newFileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(json)
  await writable.close()

  // Delete old daily backup files only after successful write
  for await (const [name] of handle.entries()) {
    if (name.startsWith('apptochite-daily-') && name.endsWith('.json') && name !== newFileName) {
      await handle.removeEntry(name)
    }
  }
  await database.settings.put({ key: 'lastDailyBackupAt', value: new Date().toISOString() })
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

export interface MergeStats {
  added: number
  updated: number
  skipped: number
}

function newerInFile<T extends { id?: number; updatedAt?: Date }>(device: T, file: T): boolean {
  const fileTs = file.updatedAt ? new Date(file.updatedAt).getTime() : 0
  const deviceTs = device.updatedAt ? new Date(device.updatedAt).getTime() : 0
  return fileTs > deviceTs
}

export async function mergeBackup(database: AppTochiteDB, backup: BackupFile): Promise<MergeStats> {
  const stats: MergeStats = { added: 0, updated: 0, skipped: 0 }

  await database.transaction(
    'rw',
    [database.clients, database.sharpenings, database.stones, database.steels, database.knives, database.meta],
    async () => {
      const tables = [
        { table: database.clients,     records: backup.data.clients },
        { table: database.sharpenings, records: backup.data.sharpenings },
        { table: database.stones,      records: backup.data.stones },
        { table: database.steels,      records: backup.data.steels },
        { table: database.knives,      records: backup.data.knives },
      ] as const

      for (const { table, records } of tables) {
        for (const fileRecord of records) {
          if (!fileRecord.id) continue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const deviceRecord = await (table as any).get(fileRecord.id)
          if (!deviceRecord) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (table as any).put(fileRecord)
            stats.added++
          } else if (newerInFile(deviceRecord, fileRecord)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (table as any).put(fileRecord)
            stats.updated++
          } else {
            stats.skipped++
          }
        }
      }

      if (backup.data.meta) {
        for (const entry of backup.data.meta) {
          const existing = await database.meta.get(entry.key)
          if (!existing) await database.meta.put(entry)
        }
      }
    }
  )

  return stats
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
