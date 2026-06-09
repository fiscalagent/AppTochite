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
  checkOPFSIntegrity,
  getDailyBackupMeta,
  readDailyBackup,
  getFolderBackupMeta,
  getFolderPrevMeta,
  readFolderPrevBackup,
  pickAndConnectFolder,
  saveFolderBackupNow,
  disconnectFolder,
  createPreRestoreSnapshot,
  getPreRestoreSnapshotMeta,
  readPreRestoreSnapshot,
  getPeriodicSyncStatus,
  enablePeriodicSync,
  disablePeriodicSync,
  type BackupFile,
  type MergeStats,
  type OPFSBackupMeta,
  type DailyBackupMeta,
  type FolderBackupMeta,
  type FolderPrevMeta,
  type PreRestoreSnapshotMeta,
} from '../../utils/backup'
import { supportsFileSystemAccess } from '../../utils/fileSystemAccess'
import { useAutoBackup } from '../../contexts/AutoBackupContext'
import { useLocale, fmtDate, fmtDateDayMonth, fmtDateTimeLong } from '../../i18n'
import s from './BackupScreen.module.css'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

type ProtectionLevel = 'protected' | 'partial' | 'at-risk'

function computeProtection(
  opfsMeta: OPFSBackupMeta | null | undefined,
  opfsValid: boolean | undefined,
  folderMeta: FolderBackupMeta | null | undefined,
): ProtectionLevel {
  if (opfsMeta === undefined) return 'partial'
  const ms7d = 7 * 24 * 3600_000
  const ms3d = 3 * 24 * 3600_000
  const folderAge = folderMeta?.lastAt ? Date.now() - folderMeta.lastAt.getTime() : Infinity
  const opfsAge  = opfsMeta ? Date.now() - opfsMeta.date.getTime() : Infinity
  if (folderMeta?.lastAt && folderAge < ms7d) return 'protected'
  if (opfsValid === false && !folderMeta) return 'at-risk'
  if (!opfsMeta && !folderMeta) return 'at-risk'
  if (Math.min(folderAge, opfsAge) > ms7d) return 'at-risk'
  if (!folderMeta) return 'partial'
  if (folderAge < ms3d) return 'protected'
  return 'partial'
}

function ageDot(date: Date | null | undefined): string {
  if (!date) return 'var(--danger)'
  const hours = (Date.now() - date.getTime()) / 3_600_000
  if (hours < 72) return 'var(--status-done)'
  if (hours < 168) return '#F5A623'
  return 'var(--danger)'
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
  const [folderMeta, setFolderMeta] = useState<FolderBackupMeta | null | undefined>(undefined)
  const [folderWorking, setFolderWorking] = useState(false)
  const [folderPrevMeta, setFolderPrevMeta] = useState<FolderPrevMeta | null | undefined>(undefined)
  const [preRestoreMeta, setPreRestoreMeta] = useState<PreRestoreSnapshotMeta | null | undefined>(undefined)
  const [periodicStatus, setPeriodicStatus] = useState<'on' | 'off' | 'unsupported' | undefined>(undefined)
  const [opfsValid, setOpfsValid] = useState<boolean | undefined>(undefined)
  const { lastBackupTick } = useAutoBackup()

  // collapsible state
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)

  const refreshOpfsMeta = useCallback(() => {
    getOPFSBackupMeta().then(meta => {
      setOpfsMeta(meta)
      if (meta) checkOPFSIntegrity().then(setOpfsValid)
      else setOpfsValid(undefined)
    })
    getDailyBackupMeta(db).then(setDailyMeta)
    getFolderBackupMeta(db).then(setFolderMeta)
    getFolderPrevMeta(db).then(setFolderPrevMeta)
    getPreRestoreSnapshotMeta().then(setPreRestoreMeta)
    getPeriodicSyncStatus().then(setPeriodicStatus)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreparingShare(true)
    exportBackup(db)
      .then(backup => {
        if (cancelled) return
        // application/json не в белом списке Chrome Android — берём text/plain.
        const file = new File(
          [JSON.stringify(backup)],
          `apptochite-${todayStr()}.txt`,
          { type: 'text/plain' }
        )
        setShareFile(file)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPreparingShare(false) })
    return () => { cancelled = true }
  }, [lastBackupTick])

  // CSV готовим заранее — share() требует вызова сразу в обработчике клика
  // (transient user activation истекает после первого await)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [preparingCsv, setPreparingCsv] = useState(true)

  useEffect(() => {
    let cancelled = false
    setPreparingCsv(true)
    Promise.all([db.clients.toArray(), db.sharpenings.orderBy('receivedAt').toArray()])
      .then(([allClients, allSharpenings]) => {
        if (cancelled) return
        const clients = allClients.filter(c => !c.deletedAt)
        const sharpenings = allSharpenings.filter(s => !s.deletedAt)
        const clientMap = new Map(clients.map(c => [c.id!, c.name]))
        const csv = buildSharpeningCSV(sharpenings, clientMap)
        const filename = `apptochite-sharpenings-${todayStr()}.csv`
        // iOS Mail дропает text/csv вложения — text/plain прикрепляется корректно.
        // Numbers открывает файл по расширению .csv независимо от MIME-типа.
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase())
        const mimeType = isIOS ? 'text/plain' : 'text/csv;charset=utf-8'
        setCsvFile(new File([csv], filename, { type: mimeType }))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPreparingCsv(false) })
    return () => { cancelled = true }
  }, [])

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

  function handleExportCSV() {
    if (!csvFile) return
    // iOS Safari не поддерживает <a download> — используем share.
    // На Android text/csv не в белом списке Web Share API, поэтому там downloadBlob.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase())
    if (isIOS && navigator.canShare?.({ files: [csvFile] })) {
      navigator.share({ files: [csvFile], title: csvFile.name })
        .then(() => showToast(t.backup.csvSaved))
        .catch(e => {
          if (e instanceof Error && e.name !== 'AbortError') showToast(t.backup.shareFailed)
        })
    } else {
      downloadBlob(csvFile, csvFile.name)
      showToast(t.backup.csvSaved)
    }
  }

  async function handlePickFolder() {
    if (folderWorking) return
    setFolderWorking(true)
    try {
      const meta = await pickAndConnectFolder(db)
      setFolderMeta(meta)
      showToast(t.backup.folderSaved)
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') showToast(t.backup.folderError)
    } finally {
      setFolderWorking(false)
    }
  }

  async function handleFolderSaveNow() {
    if (folderWorking) return
    setFolderWorking(true)
    try {
      const result = await saveFolderBackupNow(db)
      if (result === 'ok') {
        const meta = await getFolderBackupMeta(db)
        setFolderMeta(meta)
        showToast(t.backup.folderSaved)
      } else if (result === 'no-permission') {
        showToast(t.backup.folderNoPermission)
      } else if (result === 'error') {
        showToast(t.backup.folderError)
      }
    } finally {
      setFolderWorking(false)
    }
  }

  async function handleDisconnectFolder() {
    await disconnectFolder(db)
    setFolderMeta(null)
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
      await createPreRestoreSnapshot(db)
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
      await createPreRestoreSnapshot(db)
      const stats = await mergeBackup(db, preview)
      setMergeStats(stats)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      showToast(t.backup.mergeError)
      setMerging(false)
    }
  }

  const hasRecoveryPoints = !!opfsMeta || !!dailyMeta || !!preRestoreMeta || !!folderPrevMeta

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{t.backup.title}</span>
      </div>

      {/* Карточка статуса защиты */}
      {(() => {
        const level = computeProtection(opfsMeta, opfsValid, folderMeta)
        const cfg = {
          protected: { color: 'var(--status-done)', label: t.backup.statusProtected, desc: t.backup.statusProtectedDesc },
          partial:   { color: '#F5A623',            label: t.backup.statusPartial,   desc: folderMeta ? t.backup.statusPartialStale : t.backup.statusPartialNoFolder },
          'at-risk': { color: 'var(--danger)',       label: t.backup.statusAtRisk,    desc: !opfsMeta && !folderMeta ? t.backup.statusAtRiskNoBackup : opfsValid === false && !folderMeta ? t.backup.statusAtRiskCorrupt : t.backup.statusAtRiskStale },
        }[level]
        return (
          <div className={s.statusCard} style={{ borderColor: cfg.color }}>
            <span className={s.statusDot} style={{ background: cfg.color }} />
            <div className={s.statusBody}>
              <span className={s.statusLabel} style={{ color: cfg.color }}>{cfg.label}</span>
              <span className={s.statusDesc}>{cfg.desc}</span>
            </div>
          </div>
        )
      })()}

      <div className={s.divider} />

      {/* Автобэкап: OPFS + папка + periodic sync + точки восстановления */}
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.autoBackupSection}</p>

        {/* OPFS статус */}
        <div className={s.autoBackupRow}>
          <span className={s.autoBackupBadge}>{t.backup.active}</span>
          <span className={s.autoBackupMeta}>
            {opfsMeta === undefined
              ? t.backup.loading
              : opfsMeta === null
                ? t.backup.neverCreated
                : (<>
                    <span style={{ color: ageDot(opfsMeta.date), marginRight: 4 }}>●</span>
                    {`${fmtDateTimeLong(locale, opfsMeta.date)} · ${t.backup.kb((opfsMeta.size / 1024).toFixed(0))}`}
                  </>)}
          </span>
        </div>
        {opfsValid === false && (
          <p className={s.autoBackupWarn}>{t.backup.opfsCorruptWarn}</p>
        )}
        <p className={s.desc}>{t.backup.autoBackupDesc}</p>

        {/* Папка на устройстве */}
        {!supportsFileSystemAccess() ? (
          <p className={s.desc} style={{ color: 'var(--text-300)' }}>{t.backup.folderUnsupported}</p>
        ) : folderMeta ? (
          <>
            <div className={s.autoBackupRow}>
              <span className={s.autoBackupBadge}>{t.backup.active}</span>
              <span className={s.autoBackupFolder}>{folderMeta.folderName}</span>
            </div>
            <p className={s.desc}>
              {folderMeta.lastAt
                ? (<><span style={{ color: ageDot(folderMeta.lastAt), marginRight: 4 }}>●</span>{t.backup.folderLastAt(fmtDateTimeLong(locale, folderMeta.lastAt))}</>)
                : t.backup.folderNeverSaved}
            </p>
            <div className={s.autoBackupActions}>
              <button className={s.primaryBtn} onClick={handleFolderSaveNow} disabled={folderWorking}>
                {folderWorking ? t.backup.saving : t.backup.folderSaveNow}
              </button>
              <button className={s.secondaryBtn} onClick={handlePickFolder} disabled={folderWorking}>
                {t.backup.folderPick}
              </button>
              <button className={s.secondaryBtn} onClick={handleDisconnectFolder} disabled={folderWorking}>
                {t.backup.folderDisconnect}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={s.desc}>{t.backup.folderDesc}</p>
            <button className={s.primaryBtn} onClick={handlePickFolder} disabled={folderWorking}>
              {folderWorking ? t.backup.saving : t.backup.folderPick}
            </button>
          </>
        )}

        {/* Periodic sync — только если поддерживается */}
        {periodicStatus !== undefined && periodicStatus !== 'unsupported' && (
          <div className={s.autoBackupRow}>
            <span className={s.autoBackupBadge} style={{ color: periodicStatus === 'on' ? 'var(--status-done)' : 'var(--text-300)' }}>
              {periodicStatus === 'on' ? t.backup.periodicSyncOn : t.backup.periodicSyncOff}
            </span>
            <span className={s.autoBackupMeta} style={{ flex: 1, marginLeft: 4 }}>{t.backup.periodicSyncSection}</span>
            {periodicStatus === 'on' ? (
              <button className={s.secondaryBtn} style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={async () => {
                await disablePeriodicSync()
                setPeriodicStatus(await getPeriodicSyncStatus())
              }}>{t.backup.periodicSyncDisable}</button>
            ) : (
              <button className={s.primaryBtn} style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={async () => {
                const result = await enablePeriodicSync()
                if (result === 'denied') showToast(t.backup.periodicSyncDenied)
                setPeriodicStatus(await getPeriodicSyncStatus())
              }}>{t.backup.periodicSyncEnable}</button>
            )}
          </div>
        )}

        {/* Точки восстановления — collapsible */}
        {hasRecoveryPoints && (
          <>
            <button className={s.collapseBtn} onClick={() => setRecoveryOpen(v => !v)}>
              <span className={`${s.collapseChevron} ${recoveryOpen ? s.collapseChevronOpen : ''}`}>
                <IconChevronRight />
              </span>
              {t.backup.recoveryPoints}
            </button>
            {recoveryOpen && (
              <div className={s.collapseContent}>
                {opfsMeta && (
                  <>
                    <div className={s.recoveryRow}>
                      <span className={s.recoveryLabel}>{t.backup.autoBackupSection}</span>
                      <span className={s.recoveryMeta}>
                        <span style={{ color: ageDot(opfsMeta.date), marginRight: 4 }}>●</span>
                        {fmtDateTimeLong(locale, opfsMeta.date)}
                      </span>
                    </div>
                    <button className={s.secondaryBtn} onClick={async () => {
                      const backup = await readOPFSBackup()
                      if (!backup) { showToast(t.backup.autoNotFound); return }
                      setPreview(backup)
                    }}>
                      {t.backup.restoreFromAuto}
                    </button>
                  </>
                )}
                {dailyMeta && (
                  <>
                    <div className={s.recoveryRow}>
                      <span className={s.recoveryLabel}>{t.backup.perDay}</span>
                      <span className={s.recoveryMeta}>
                        <span style={{ color: ageDot(dailyMeta.date), marginRight: 4 }}>●</span>
                        {t.backup.snapshotFor(fmtDateDayMonth(locale, dailyMeta.snapshotDate))}
                      </span>
                    </div>
                    <button className={s.secondaryBtn} onClick={async () => {
                      const backup = await readDailyBackup(db)
                      if (!backup) { showToast(t.backup.dailyNotFound); return }
                      setPreview(backup)
                    }}>
                      {t.backup.restoreFromDaily}
                    </button>
                  </>
                )}
                {preRestoreMeta && (
                  <>
                    <div className={s.recoveryRow}>
                      <span className={s.recoveryLabel}>{t.backup.preRestoreSection}</span>
                      <span className={s.recoveryMeta}>
                        {fmtDateTimeLong(locale, preRestoreMeta.date)}
                      </span>
                    </div>
                    <p className={s.desc}>{t.backup.preRestoreDesc}</p>
                    <button className={s.secondaryBtn} onClick={async () => {
                      const backup = await readPreRestoreSnapshot()
                      if (!backup) { showToast(t.backup.autoNotFound); return }
                      setPreview(backup)
                    }}>
                      {t.backup.restoreFromPreRestore}
                    </button>
                  </>
                )}
                {folderPrevMeta && (
                  <>
                    <div className={s.recoveryRow}>
                      <span className={s.recoveryLabel}>{t.backup.folderPrevSection}</span>
                      <span className={s.recoveryMeta}>
                        {`${fmtDateTimeLong(locale, folderPrevMeta.date)} · ${t.backup.kb((folderPrevMeta.size / 1024).toFixed(0))}`}
                      </span>
                    </div>
                    <p className={s.desc}>{t.backup.folderPrevDesc}</p>
                    <button className={s.secondaryBtn} onClick={async () => {
                      const backup = await readFolderPrevBackup(db)
                      if (!backup) { showToast(t.backup.folderPrevNotFound); return }
                      setPreview(backup)
                    }}>
                      {t.backup.restoreFromFolderPrev}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className={s.divider} />

      {/* Экспорт */}
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

        {/* CSV — collapsible */}
        <button className={s.collapseBtn} onClick={() => setCsvOpen(v => !v)}>
          <span className={`${s.collapseChevron} ${csvOpen ? s.collapseChevronOpen : ''}`}>
            <IconChevronRight />
          </span>
          {t.backup.csvSection}
        </button>
        {csvOpen && (
          <div className={s.collapseContent}>
            <p className={s.desc}>{t.backup.csvDesc}</p>
            <button className={s.secondaryBtn} onClick={handleExportCSV} disabled={preparingCsv || !csvFile}>
              {preparingCsv ? t.backup.preparing : t.backup.downloadCsv}
            </button>
          </div>
        )}
      </div>

      <div className={s.divider} />

      {/* Восстановление из файла */}
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
              {t.backup.backupDate(fmtDate(locale, preview.exportedAt))}
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

      {/* База данных + Фото — объединены */}
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

      {/* Донат */}
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
