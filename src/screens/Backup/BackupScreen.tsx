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

const IconCopy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

const CARD_NUMBER = '2200 7006 1338 5722'
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
  getDailyBackupMeta,
  readDailyBackup,
  type BackupFile,
  type MergeStats,
  type OPFSBackupMeta,
  type DailyBackupMeta,
} from '../../utils/backup'
import { useAutoBackup } from '../../contexts/AutoBackupContext'
import { useLocale, localeTag } from '../../i18n'
import s from './BackupScreen.module.css'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}


export default function BackupScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t, locale } = useLocale()
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
  const [dailyMeta, setDailyMeta] = useState<DailyBackupMeta | null | undefined>(undefined)
  const { lastBackupTick } = useAutoBackup()

  const refreshOpfsMeta = useCallback(() => {
    getOPFSBackupMeta().then(setOpfsMeta)
    getDailyBackupMeta(db).then(setDailyMeta)
  }, [])

  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage }) => {
        if (usage != null) setStorageMb(usage / (1024 * 1024))
      })
    }
    refreshOpfsMeta()
  }, [refreshOpfsMeta])

  useEffect(() => {
    if (lastBackupTick > 0) refreshOpfsMeta()
  }, [lastBackupTick, refreshOpfsMeta])

  function toggleCompression() {
    const next = !compressed
    if (next) {
      localStorage.setItem(PHOTO_COMPRESS_KEY, 'on')
    } else {
      localStorage.removeItem(PHOTO_COMPRESS_KEY)
    }
    setCompressed(next)
    showToast(next ? t.backup.compressionOn : t.backup.compressionOff)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const backup = await exportBackup(db)
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      downloadBlob(blob, `apptochite-${todayStr()}.json`)
      await updateLastBackupAt(db)
      showToast(t.backup.backupSaved)
    } finally {
      setExporting(false)
    }
  }

  // Web Share API на Chrome Android требует transient activation — share()
  // должен вызываться сразу после клика, без долгих await между ними. Иначе
  // получаем NotAllowedError. Поэтому файл готовим заранее, при входе на экран,
  // и в клике только вызываем share().
  const [shareFile, setShareFile] = useState<File | null>(null)
  const [preparingShare, setPreparingShare] = useState(true)

  useEffect(() => {
    let cancelled = false
    // намеренно: при смене lastBackupTick заново готовим файл и показываем «готовлю…»
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreparingShare(true)
    exportBackup(db)
      .then(backup => {
        if (cancelled) return
        // application/json не в белом списке Chrome Android — берём text/plain.
        // Chrome Android фильтрует и MIME, и расширение: .json блокируется,
        // .txt — в белом списке. Имя файла даём с .txt, импорт читает по
        // содержимому (JSON.parse), так что расширение не важно.
        const file = new File(
          [JSON.stringify(backup)],
          `apptochite-${todayStr()}.txt`,
          { type: 'text/plain' }
        )
        setShareFile(file)
      })
      .catch(() => { /* кнопка останется недоступной, пользователь увидит «Сохранить бэкап» */ })
      .finally(() => { if (!cancelled) setPreparingShare(false) })
    return () => { cancelled = true }
  }, [lastBackupTick])

  function handleShare() {
    if (!shareFile) return
    if (!navigator.canShare?.({ files: [shareFile] })) {
      showToast(t.backup.shareUnsupported)
      return
    }
    navigator.share({ files: [shareFile], title: t.backup.shareTitle })
      .then(async () => {
        await updateLastBackupAt(db)
        showToast(t.backup.backupShared)
      })
      .catch(e => {
        if (e instanceof Error && e.name !== 'AbortError') {
          showToast(t.backup.shareFailed)
        }
      })
  }

  async function handleExportCSV() {
    setExporting(true)
    try {
      const [allClients, allSharpenings] = await Promise.all([
        db.clients.toArray(),
        db.sharpenings.orderBy('receivedAt').toArray(),
      ])
      const clients = allClients.filter(c => !c.deletedAt)
      const sharpenings = allSharpenings.filter(s => !s.deletedAt)
      const clientMap = new Map(clients.map(c => [c.id!, c.name]))
      const csv = buildSharpeningCSV(sharpenings, clientMap)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      downloadBlob(blob, `apptochite-sharpenings-${todayStr()}.csv`)
      showToast(t.backup.csvSaved)
    } finally {
      setExporting(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024 * 1024) {
      showToast(t.backup.fileTooLarge)
      return
    }
    try {
      const parsed = JSON.parse(await file.text(), reviveDates)
      if (!isValidBackup(parsed)) { showToast(t.backup.invalidFormat); return }
      setPreview(parsed)
    } catch {
      showToast(t.backup.fileReadError)
    }
  }

  async function handleRestore() {
    if (!preview) return
    setRestoring(true)
    try {
      await restoreBackup(db, preview)
      showToast(t.backup.restored)
      navigate('/')
    } catch {
      showToast(t.backup.restoreError)
      setRestoring(false)
    }
  }

  async function handleCopyCard() {
    try {
      await navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, ''))
      showToast(t.backup.cardCopied)
    } catch {
      showToast(t.backup.cardCopyError)
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
      showToast(t.backup.mergeError)
      setMerging(false)
    }
  }

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{t.backup.title}</span>
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.dbSection}</p>
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
            storageMb == null ? t.backup.computing
            : storageMb < WARN_MB ? t.backup.dbNormal
            : storageMb < 160 ? t.backup.dbIncreaseCompress
            : t.backup.dbAlmostFull
          return (
            <div className={s.dbCard}>
              <div className={s.dbHeader}>
                <span className={s.dbLabel}>{t.backup.storageSize}</span>
                {storageMb != null && (
                  <span className={s.dbSize}>
                    {t.backup.dbSizeOf(storageMb < 0.1 ? '< 0.1' : storageMb.toFixed(1))}
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
                <span className={s.dbMarkLabel}>{t.backup.mb100}</span>
              </div>
            </div>
          )
        })()}
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.photoSection}</p>
        <button
          role="switch"
          aria-checked={compressed}
          className={s.toggleRow}
          onClick={toggleCompression}
        >
          <div className={s.toggleInfo}>
            <span className={s.toggleLabel}>{t.backup.compressNewPhotos}</span>
            <span className={s.toggleDesc}>{t.backup.compressDesc}</span>
          </div>
          <div className={`${s.toggle} ${compressed ? s.toggleOn : ''}`}>
            <div className={s.toggleThumb} />
          </div>
        </button>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.autoBackupSection}</p>
        <div className={s.autoBackupRow}>
          <span className={s.autoBackupBadge}>{t.backup.active}</span>
          <span className={s.autoBackupMeta}>
            {opfsMeta === undefined
              ? t.backup.loading
              : opfsMeta === null
                ? t.backup.neverCreated
                : `${new Date(opfsMeta.date).toLocaleString(localeTag(locale), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} · ${t.backup.kb((opfsMeta.size / 1024).toFixed(0))}`}
          </span>
        </div>
        <p className={s.desc}>{t.backup.autoBackupDesc}</p>
        {opfsMeta !== null && (
          <button className={s.secondaryBtn} onClick={async () => {
            const backup = await readOPFSBackup()
            if (!backup) { showToast(t.backup.autoNotFound); return }
            setPreview(backup)
          }}>
            {t.backup.restoreFromAuto}
          </button>
        )}

        {dailyMeta && (
          <>
            <div className={s.autoBackupRow}>
              <span className={s.autoBackupBadge}>{t.backup.perDay}</span>
              <span className={s.autoBackupMeta}>
                {t.backup.snapshotFor(new Date(dailyMeta.snapshotDate).toLocaleDateString(localeTag(locale), { day: 'numeric', month: 'long' }))} · {t.backup.kb((dailyMeta.size / 1024).toFixed(0))}
              </span>
            </div>
            <p className={s.desc}>{t.backup.dailyDesc}</p>
            <button className={s.secondaryBtn} onClick={async () => {
              const backup = await readDailyBackup(db)
              if (!backup) { showToast(t.backup.dailyNotFound); return }
              setPreview(backup)
            }}>
              {t.backup.restoreFromDaily}
            </button>
          </>
        )}
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.exportSection}</p>
        <p className={s.desc}>{t.backup.exportDesc}</p>
        <button className={s.primaryBtn} onClick={handleExport} disabled={exporting}>
          {exporting ? t.backup.saving : t.backup.saveBackupJson}
        </button>
        <button className={s.secondaryBtn} onClick={handleShare} disabled={exporting || preparingShare || !shareFile}>
          {preparingShare ? t.backup.preparing : t.backup.shareBackup}
        </button>
        <p className={s.desc} style={{ fontSize: 12, marginTop: 4 }}>{t.backup.shareDesc}</p>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.csvSection}</p>
        <p className={s.desc}>{t.backup.csvDesc}</p>
        <button className={s.secondaryBtn} onClick={handleExportCSV} disabled={exporting}>
          {exporting ? t.backup.saving : t.backup.downloadCsv}
        </button>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.restoreSection}</p>
        <p className={s.desc}>{t.backup.restoreDesc}</p>

        {mergeStats ? (
          <div className={s.preview}>
            <p className={s.previewDate}>{t.backup.mergeDone}</p>
            <div className={s.previewRows}>
              <div className={s.previewRow}><span>{t.backup.addedNew}</span><span>{mergeStats.added}</span></div>
              <div className={s.previewRow}><span>{t.backup.updatedNewer}</span><span>{mergeStats.updated}</span></div>
              <div className={s.previewRow}><span>{t.backup.keptUnchanged}</span><span>{mergeStats.skipped}</span></div>
            </div>
            <div className={s.previewActions}>
              <button className={s.secondaryBtn} onClick={() => setMergeStats(null)}>{t.backup.close}</button>
            </div>
          </div>
        ) : !preview ? (
          <>
            <button className={s.secondaryBtn} onClick={() => fileInputRef.current?.click()}>
              {t.backup.chooseFile}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </>
        ) : (
          <div className={s.preview}>
            <p className={s.previewDate}>
              {t.backup.backupDate(new Date(preview.exportedAt).toLocaleDateString(localeTag(locale)))}
            </p>
            <div className={s.previewRows}>
              <div className={s.previewRow}><span>{t.backup.rowClients}</span><span>{preview.data.clients.length}</span></div>
              <div className={s.previewRow}><span>{t.backup.rowSharpenings}</span><span>{preview.data.sharpenings.length}</span></div>
              <div className={s.previewRow}><span>{t.backup.rowStones}</span><span>{preview.data.stones.length}</span></div>
              <div className={s.previewRow}><span>{t.backup.rowSteels}</span><span>{preview.data.steels.length}</span></div>
              <div className={s.previewRow}><span>{t.backup.rowKnives}</span><span>{preview.data.knives.length}</span></div>
            </div>
            <div className={s.warning}>
              <strong>{t.backup.mergeStrong}</strong>{t.backup.mergeWarningText}
            </div>
            <div className={s.warningDanger}>
              <strong>{t.backup.replaceStrong}</strong>{t.backup.replaceWarningText}
            </div>
            <div className={s.previewActions}>
              <button className={s.primaryBtn} onClick={handleMerge} disabled={merging || restoring}>
                {merging ? t.backup.merging : t.backup.merge}
              </button>
              <button className={s.dangerBtn} onClick={handleRestore} disabled={restoring || merging}>
                {restoring ? t.backup.restoring : t.backup.replaceAll}
              </button>
              <button className={s.secondaryBtn} onClick={() => {
                setPreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}>
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.donateSection}</p>
        <div className={s.donateCard}>
          <p className={s.donateText}>{t.backup.donateText}</p>
          <button className={s.donateBtn} onClick={handleCopyCard}>
            <span className={s.donateNumber}>{CARD_NUMBER}</span>
            <span className={s.donateCopy}><IconCopy /></span>
          </button>
        </div>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <Link to="/about" className={s.aboutRow}>
          <div className={s.aboutLeft}>
            <span className={s.aboutLabel}>{t.backup.aboutLabel}</span>
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
