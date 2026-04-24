import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../db/db'
import type { Client, Sharpening, Stone, Steel, Knife, Meta } from '../../db/db'
import { useToast } from '../../components/Toast/ToastContext'
import s from './BackupScreen.module.css'

interface BackupFile {
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

// JSON.parse reviver: ISO-date strings → Date objects
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
function reviveDates(_key: string, value: unknown) {
  if (typeof value === 'string' && ISO_DATE.test(value)) return new Date(value)
  return value
}

function isValidBackup(obj: unknown): obj is BackupFile {
  if (!obj || typeof obj !== 'object') return false
  const b = obj as Record<string, unknown>
  if (b.version !== 1 || !b.data || typeof b.data !== 'object') return false
  const d = b.data as Record<string, unknown>
  return ['clients', 'sharpenings', 'stones', 'steels', 'knives'].every(
    k => Array.isArray(d[k])
  )
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildCSV(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`
  // UTF-8 BOM — Excel открывает без кракозябр
  return '﻿' + rows.map(r => r.map(escape).join(';')).join('\r\n')
}

export default function BackupScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<BackupFile | null>(null)
  const [restoring, setRestoring] = useState(false)

  async function handleExport() {
    const [clients, sharpenings, stones, steels, knives, meta] = await Promise.all([
      db.clients.toArray(),
      db.sharpenings.toArray(),
      db.stones.toArray(),
      db.steels.toArray(),
      db.knives.toArray(),
      db.meta.toArray(),
    ])

    const backup: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { clients, sharpenings, stones, steels, knives, meta },
    }

    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    downloadBlob(blob, `apptochite-${todayStr()}.json`)
    showToast('Бэкап сохранён')
  }

  async function handleExportCSV() {
    const [clients, sharpenings] = await Promise.all([
      db.clients.toArray(),
      db.sharpenings.orderBy('receivedAt').toArray(),
    ])

    const clientMap = new Map(clients.map(c => [c.id!, c.name]))

    const toDate = (d: Date | string | undefined) =>
      d ? (d instanceof Date ? d : new Date(d)).toLocaleDateString('ru') : ''

    const headers = [
      'Дата приёмки', 'Дата готовности', 'Клиент', 'Нож', 'Сталь', 'HRC',
      'Тип работы', 'Угол °', 'Порядок камня', 'Камень', 'Комментарий', 'Цена', 'Статус',
    ]

    const rows: (string | number | null | undefined)[][] = []

    for (const sh of sharpenings) {
      const base = [
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

    const csv = buildCSV([headers, ...rows])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `apptochite-sharpenings-${todayStr()}.csv`)
    showToast('CSV сохранён')
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text(), reviveDates)
      if (!isValidBackup(parsed)) { showToast('Неверный формат файла'); return }
      setPreview(parsed)
    } catch {
      showToast('Не удалось прочитать файл')
    }
  }

  async function handleRestore() {
    if (!preview) return
    setRestoring(true)
    try {
      await db.transaction('rw', [db.clients, db.sharpenings, db.stones, db.steels, db.knives, db.meta], async () => {
        await Promise.all([
          db.clients.clear(), db.sharpenings.clear(), db.stones.clear(),
          db.steels.clear(), db.knives.clear(), db.meta.clear(),
        ])
        await Promise.all([
          db.clients.bulkPut(preview.data.clients),
          db.sharpenings.bulkPut(preview.data.sharpenings),
          db.stones.bulkPut(preview.data.stones),
          db.steels.bulkPut(preview.data.steels),
          db.knives.bulkPut(preview.data.knives),
          db.meta.bulkPut(preview.data.meta ?? []),
        ])
      })
      showToast('Данные восстановлены')
      navigate('/')
    } catch (err) {
      console.error(err)
      showToast('Ошибка при восстановлении')
      setRestoring(false)
    }
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}>←</button>
        <span className={s.title}>БЭКАП</span>
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>Экспорт</p>
        <p className={s.desc}>
          Сохраняет всех клиентов, заточки и справочники в JSON-файл.
          Файл попадёт в папку «Загрузки». Бэкап с фотографиями может занимать несколько МБ.
        </p>
        <button className={s.primaryBtn} onClick={handleExport}>Сохранить бэкап (JSON)</button>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>Экспорт в Excel / CSV</p>
        <p className={s.desc}>
          Выгружает все заточки в CSV-файл с именами клиентов. Открывается в Excel, Google Таблицах и Numbers без дополнительных настроек.
        </p>
        <button className={s.secondaryBtn} onClick={handleExportCSV}>Скачать CSV</button>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>Восстановление</p>
        <p className={s.desc}>
          Выберите ранее сохранённый файл бэкапа. Все текущие данные будут заменены данными из файла.
        </p>

        {!preview ? (
          <>
            <button className={s.secondaryBtn} onClick={() => fileInputRef.current?.click()}>
              Выбрать файл…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </>
        ) : (
          <div className={s.preview}>
            <p className={s.previewDate}>
              Дата бэкапа: {new Date(preview.exportedAt).toLocaleDateString('ru')}
            </p>
            <div className={s.previewRows}>
              <div className={s.previewRow}><span>Клиенты</span><span>{preview.data.clients.length}</span></div>
              <div className={s.previewRow}><span>Заточки</span><span>{preview.data.sharpenings.length}</span></div>
              <div className={s.previewRow}><span>Камни</span><span>{preview.data.stones.length}</span></div>
              <div className={s.previewRow}><span>Стали</span><span>{preview.data.steels.length}</span></div>
              <div className={s.previewRow}><span>Ножи</span><span>{preview.data.knives.length}</span></div>
            </div>
            <div className={s.warning}>
              Все текущие данные будут удалены и заменены данными из файла.
            </div>
            <div className={s.previewActions}>
              <button className={s.dangerBtn} onClick={handleRestore} disabled={restoring}>
                {restoring ? 'Восстановление…' : 'Восстановить'}
              </button>
              <button className={s.secondaryBtn} onClick={() => {
                setPreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
