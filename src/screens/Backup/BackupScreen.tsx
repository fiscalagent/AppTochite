import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
import { db } from '../../db/instance'
import { useToast } from '../../components/Toast/ToastContext'
import { PHOTO_COMPRESS_KEY } from '../../hooks/useCamera'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import {
  isValidBackup,
  exportBackup,
  restoreBackup,
  mergeBackup,
  buildSharpeningCSV,
  reviveDates,
  downloadBlob,
  updateLastBackupAt,
  getOPFSBackupMeta,
  readOPFSBackup,
  type BackupFile,
  type MergeStats,
  type OPFSBackupMeta,
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
  const [merging, setMerging] = useState(false)
  const [mergeStats, setMergeStats] = useState<MergeStats | null>(null)
  const [exporting, setExporting] = useState(false)
  const [compressed, setCompressed] = useState(
    localStorage.getItem(PHOTO_COMPRESS_KEY) === 'on'
  )
  const [storageMb, setStorageMb] = useState<number | null>(null)
  const [opfsMeta, setOpfsMeta] = useState<OPFSBackupMeta | null | undefined>(undefined)

  const refreshOpfsMeta = useCallback(() => {
    getOPFSBackupMeta().then(setOpfsMeta)
  }, [])

  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage }) => {
        if (usage != null) setStorageMb(usage / (1024 * 1024))
      })
    }
    refreshOpfsMeta()
  }, [refreshOpfsMeta])

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
    if (file.size > 200 * 1024 * 1024) {
      showToast('Файл слишком большой (> 200 МБ)')
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
    } catch {
      showToast('Ошибка при восстановлении')
      setRestoring(false)
    }
  }

  async function handleMerge() {
    if (!preview) return
    setMerging(true)
    try {
      const stats = await mergeBackup(db, preview)
      setMergeStats(stats)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      showToast('Ошибка при объединении')
      setMerging(false)
    }
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>НАСТРОЙКИ</span>
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>База данных</p>
        {(() => {
          const MAX_MB = 200
          const WARN_MB = 100
          const fillPct = storageMb != null ? Math.min((storageMb / MAX_MB) * 100, 100) : 0
          const fillColor =
            storageMb == null ? 'var(--bg-400)'
            : storageMb < WARN_MB ? 'var(--status-done)'
            : storageMb < 160 ? '#F5A623'
            : 'var(--danger)'
          const hint =
            storageMb == null ? 'Вычисляется…'
            : storageMb < WARN_MB ? 'Размер базы в норме'
            : storageMb < 160 ? 'База данных увеличена — включите сжатие фото'
            : 'База почти заполнена — удалите заточки с фото'
          return (
            <div className={s.dbCard}>
              <div className={s.dbHeader}>
                <span className={s.dbLabel}>Размер хранилища</span>
                {storageMb != null && (
                  <span className={s.dbSize}>
                    {storageMb < 0.1 ? '< 0.1' : storageMb.toFixed(1)} / 200 МБ
                  </span>
                )}
              </div>
              <div className={s.progressTrack}>
                <div className={s.progressFill} style={{ width: `${fillPct}%`, background: fillColor }} />
                <div className={s.progressMark} />
              </div>
              <div className={s.dbFooter}>
                <span className={s.dbHint} style={{ color: fillColor === 'var(--bg-400)' ? 'var(--text-300)' : fillColor }}>
                  {hint}
                </span>
                <span className={s.dbMarkLabel}>100 МБ</span>
              </div>
            </div>
          )
        })()}
      </div>

      <div className={s.divider} />

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
        <p className={s.sectionTitle}>Автобэкап</p>
        <div className={s.autoBackupRow}>
          <span className={s.autoBackupBadge}>Активен</span>
          <span className={s.autoBackupMeta}>
            {opfsMeta === undefined
              ? 'Загрузка…'
              : opfsMeta === null
                ? 'Ещё не создавался'
                : `${new Date(opfsMeta.date).toLocaleString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} · ${(opfsMeta.size / 1024).toFixed(0)} КБ`}
          </span>
        </div>
        <p className={s.desc}>Сохраняется автоматически при каждом открытии приложения. Без диалогов и разрешений.</p>
        {opfsMeta !== null && (
          <button className={s.secondaryBtn} onClick={async () => {
            const backup = await readOPFSBackup()
            if (!backup) { showToast('Авто-бэкап не найден или повреждён'); return }
            setPreview(backup)
          }}>
            Восстановить из авто-бэкапа
          </button>
        )}
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
          Выберите ранее сохранённый файл бэкапа.
        </p>

        {mergeStats ? (
          <div className={s.preview}>
            <p className={s.previewDate}>Объединение завершено</p>
            <div className={s.previewRows}>
              <div className={s.previewRow}><span>Добавлено новых</span><span>{mergeStats.added}</span></div>
              <div className={s.previewRow}><span>Обновлено (файл новее)</span><span>{mergeStats.updated}</span></div>
              <div className={s.previewRow}><span>Оставлено без изменений</span><span>{mergeStats.skipped}</span></div>
            </div>
            <div className={s.previewActions}>
              <button className={s.secondaryBtn} onClick={() => setMergeStats(null)}>Закрыть</button>
            </div>
          </div>
        ) : !preview ? (
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
              <strong>Объединить</strong> — добавит новые записи из файла и обновит те, что новее в файле. Данные на устройстве не исчезнут.
            </div>
            <div className={s.warningDanger}>
              <strong>Заменить всё</strong> — удалит все текущие данные и заменит данными из файла.
            </div>
            <div className={s.previewActions}>
              <button className={s.primaryBtn} onClick={handleMerge} disabled={merging || restoring}>
                {merging ? 'Объединение…' : 'Объединить'}
              </button>
              <button className={s.dangerBtn} onClick={handleRestore} disabled={restoring || merging}>
                {restoring ? 'Восстановление…' : 'Заменить всё'}
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
            <span className={s.aboutChevron}><IconChevronRight /></span>
          </div>
        </Link>
      </div>
    </div>
  )
}
