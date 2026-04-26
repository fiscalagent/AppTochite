import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { db } from '../../db/db'
import { useToast } from '../../components/Toast/ToastContext'
import { PHOTO_COMPRESS_KEY } from '../../hooks/useCamera'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import {
  isValidBackup,
  exportBackup,
  restoreBackup,
  buildSharpeningCSV,
  reviveDates,
  downloadBlob,
  updateLastBackupAt,
  type BackupFile,
} from '../../utils/backup'
import s from './BackupScreen.module.css'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}


export default function BackupScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { currentVersion, hasUpdate } = useVersionCheck()

  const [preview, setPreview] = useState<BackupFile | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [compressed, setCompressed] = useState(
    localStorage.getItem(PHOTO_COMPRESS_KEY) === 'on'
  )

  function toggleCompression() {
    const next = !compressed
    if (next) {
      localStorage.setItem(PHOTO_COMPRESS_KEY, 'on')
    } else {
      localStorage.removeItem(PHOTO_COMPRESS_KEY)
    }
    setCompressed(next)
    showToast(next ? 'Сжатие фото включено' : 'Сжатие фото отключено')
  }

  async function handleExport() {
    setExporting(true)
    try {
      const backup = await exportBackup(db)
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      downloadBlob(blob, `apptochite-${todayStr()}.json`)
      await updateLastBackupAt(db)
      showToast('Бэкап сохранён')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportCSV() {
    setExporting(true)
    try {
      const [clients, sharpenings] = await Promise.all([
        db.clients.toArray(),
        db.sharpenings.orderBy('receivedAt').toArray(),
      ])
      const clientMap = new Map(clients.map(c => [c.id!, c.name]))
      const csv = buildSharpeningCSV(sharpenings, clientMap)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      downloadBlob(blob, `apptochite-sharpenings-${todayStr()}.csv`)
      showToast('CSV сохранён')
    } finally {
      setExporting(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      showToast('Файл слишком большой (> 50 МБ)')
      return
    }
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
      await restoreBackup(db, preview)
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
        <p className={s.sectionTitle}>Фото</p>
        <button
          role="switch"
          aria-checked={compressed}
          className={s.toggleRow}
          onClick={toggleCompression}
        >
          <div className={s.toggleInfo}>
            <span className={s.toggleLabel}>Сжатие новых фото</span>
            <span className={s.toggleDesc}>JPEG 65%, 1280 пкс — в 3–5 раз меньше</span>
          </div>
          <div className={`${s.toggle} ${compressed ? s.toggleOn : ''}`}>
            <div className={s.toggleThumb} />
          </div>
        </button>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>Экспорт</p>
        <p className={s.desc}>
          Сохраняет всех клиентов, заточки и справочники в JSON-файл.
          Файл попадёт в папку «Загрузки». Бэкап с фотографиями может занимать несколько МБ.
        </p>
        <button className={s.primaryBtn} onClick={handleExport} disabled={exporting}>
          {exporting ? 'Сохранение…' : 'Сохранить бэкап (JSON)'}
        </button>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>Экспорт в Excel / CSV</p>
        <p className={s.desc}>
          Выгружает все заточки в CSV-файл с именами клиентов. Открывается в Excel, Google Таблицах и Numbers без дополнительных настроек.
        </p>
        <button className={s.secondaryBtn} onClick={handleExportCSV} disabled={exporting}>
          {exporting ? 'Сохранение…' : 'Скачать CSV'}
        </button>
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

      <div className={s.divider} />

      <div className={s.section}>
        <Link to="/about" className={s.aboutRow}>
          <div className={s.aboutLeft}>
            <span className={s.aboutLabel}>О программе</span>
            <span className={s.aboutVersion}>v{currentVersion}</span>
          </div>
          <div className={s.aboutRight}>
            {hasUpdate && <span className={s.updateDot} />}
            <span className={s.aboutChevron}>›</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
