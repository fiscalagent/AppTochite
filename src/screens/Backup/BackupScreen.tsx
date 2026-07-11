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
import { track } from '../../services/analytics'
import { useToast } from '../../components/Toast/ToastContext'
import { PHOTO_COMPRESS_KEY } from '../../hooks/useCamera'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import { VERSION_LABEL } from '../../version'
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
  readFolderBackup,
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
import { shareFilesNative } from '../../utils/nativeShare'
// Только тип — статически. Сами функции грузим динамически из веток
// `if (IS_CAPACITOR)` (см. ниже), иначе нативный SAF-плагин утечёт в PWA-бандл.
import type { NativeFolderMeta, SkipReason } from '../../utils/nativeFolderBackup'
import { useAutoBackup } from '../../contexts/AutoBackupContext'
import { useLocale, fmtDate, fmtDateTimeLong, type Dict } from '../../i18n'
import { FEATURES } from '../../config/features'

// В APK <a download> и navigator.share(files) не работают — выгрузку бэкапа гоним
// через системное «Поделиться» (см. nativeShare.ts). Это пол миграции PWA→APK.
// Литерал → Rollup вырезает нативные ветки из PWA-сборки.
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'
import {
  getYandexToken,
  saveYandexToken,
  removeYandexToken,
  getCloudAutoBackup,
  setCloudAutoBackup,
  getCloudLastAt,
  uploadToYandex,
  listYandexSnapshots,
  buildOAuthUrl,
  peekCloudDeviceId,
  type CloudSnapshot,
} from '../../utils/cloudBackup'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import s from './BackupScreen.module.css'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Полоски надёжности хранилища: 1 — в браузере, 2 — папка, 3 — облако.
function ReliabilityBars({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className={s.relBars} aria-hidden>
      {[1, 2, 3].map(i => (
        <span key={i} className={`${s.relBar} ${i <= n ? s.relBarOn : ''}`} />
      ))}
    </span>
  )
}

type ProtectionLevel = 'protected' | 'partial' | 'at-risk'

function computeProtection(
  opfsMeta: OPFSBackupMeta | null | undefined,
  opfsValid: boolean | undefined,
  // FSA-папка (PWA) или нативная SAF-папка (APK) — для защиты они равнозначны
  folderMeta: { lastAt: Date | null } | null | undefined,
  cloudLastAt?: Date | null,
): ProtectionLevel {
  if (opfsMeta === undefined) return 'partial'
  const ms7d = 7 * 24 * 3600_000
  const ms3d = 3 * 24 * 3600_000
  const folderAge = folderMeta?.lastAt ? Date.now() - folderMeta.lastAt.getTime() : Infinity
  const cloudAge  = cloudLastAt ? Date.now() - cloudLastAt.getTime() : Infinity
  const opfsAge   = opfsMeta ? Date.now() - opfsMeta.date.getTime() : Infinity
  if ((folderMeta?.lastAt && folderAge < ms7d) || cloudAge < ms7d) return 'protected'
  if (opfsValid === false && !folderMeta && cloudAge === Infinity) return 'at-risk'
  if (!opfsMeta && !folderMeta && cloudAge === Infinity) return 'at-risk'
  if (Math.min(folderAge, opfsAge, cloudAge) > ms7d) return 'at-risk'
  if (!folderMeta && cloudAge === Infinity) return 'partial'
  if (folderAge < ms3d || cloudAge < ms3d) return 'protected'
  return 'partial'
}

function ageDot(date: Date | null | undefined): string {
  if (!date) return 'var(--danger)'
  const hours = (Date.now() - date.getTime()) / 3_600_000
  if (hours < 72) return 'var(--status-done)'
  if (hours < 168) return '#F5A623'
  return 'var(--danger)'
}

// unchanged рендерится отдельно (спокойная формулировка, не «ошибка») —
// сюда попадают только реальные причины, по которым файл не записался.
function skipReasonLabel(t: Dict, reason: Exclude<SkipReason, 'unchanged'>): string {
  switch (reason) {
    case 'no_access': return t.backup.nfbSkipNoAccess
    case 'no_uri':     return t.backup.nfbSkipNoUri
    case 'disabled':   return t.backup.nfbSkipDisabled
    case 'empty':       return t.backup.nfbSkipEmpty
  }
}


export default function BackupScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t, locale } = useLocale()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { hasUpdate } = useVersionCheck()

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
  // Нативный папочный бэкап (APK): undefined=загрузка, null=выключен, объект=включён
  const [nativeFolderMeta, setNativeFolderMeta] = useState<NativeFolderMeta | null | undefined>(undefined)
  const [nativeFolderWorking, setNativeFolderWorking] = useState(false)
  // Причина последнего пропуска авто-бэкапа — диагностика на случай, если у
  // пользователя выключена аналитика и телеметрия nfb_auto_skip не долетает.
  const [nativeSkip, setNativeSkip] = useState<{ reason: SkipReason; day: string } | null>(null)
  const [preRestoreMeta, setPreRestoreMeta] = useState<PreRestoreSnapshotMeta | null | undefined>(undefined)
  const [periodicStatus, setPeriodicStatus] = useState<'on' | 'off' | 'unsupported' | undefined>(undefined)
  const [opfsValid, setOpfsValid] = useState<boolean | undefined>(undefined)

  // cloud backup state
  const [cloudToken, setCloudToken] = useState<string | null | undefined>(undefined)
  const [cloudLastAt, setCloudLastAt] = useState<Date | null | undefined>(undefined)
  const [cloudAuto, setCloudAuto] = useState(false)
  const [cloudSnapshots, setCloudSnapshots] = useState<CloudSnapshot[] | null>(null)
  const [cloudSnapshotsLoading, setCloudSnapshotsLoading] = useState(false)
  const [cloudSnapshotsError, setCloudSnapshotsError] = useState(false)
  const [cloudWorking, setCloudWorking] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)

  const { lastBackupTick } = useAutoBackup()

  // collapsible state
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [olderCopiesOpen, setOlderCopiesOpen] = useState(false)

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
    if (IS_CAPACITOR) {
      import('../../utils/nativeFolderBackup').then(m => {
        m.getNativeFolderMeta(db).then(setNativeFolderMeta)
        m.getLastAutoSkip(db).then(setNativeSkip)
      })
    }
  }, [])

  const refreshCloud = useCallback(async () => {
    if (!FEATURES.cloudBackup) return
    const [token, lastAt, auto, deviceId] = await Promise.all([
      getYandexToken(db),
      getCloudLastAt(db),
      getCloudAutoBackup(db),
      peekCloudDeviceId(db),
    ])
    setCloudToken(token)
    setCloudLastAt(lastAt)
    setCloudAuto(auto)
    if (token) {
      setCloudSnapshotsLoading(true)
      setCloudSnapshotsError(false)
      listYandexSnapshots(token, deviceId)
        .then(snaps => { setCloudSnapshots(snaps); setCloudSnapshotsLoading(false) })
        .catch(() => { setCloudSnapshotsError(true); setCloudSnapshotsLoading(false) })
    }
  }, [])

  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage }) => {
        if (usage != null) setStorageMb(usage / (1024 * 1024))
      })
    }
    refreshOpfsMeta()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount: setState только после await
    refreshCloud()
  }, [refreshOpfsMeta, refreshCloud])

  useEffect(() => {
    if (lastBackupTick > 0) refreshOpfsMeta()
  }, [lastBackupTick, refreshOpfsMeta])

  // Первая загрузка в облако: токен есть, а бэкап ни разу не заливался — сразу
  // после подключения (иначе статус жёлтый до первого авто-бэкапа, хотя облако
  // уже подключено). Одна попытка за маунт: при ошибке не зацикливаемся,
  // пользователь может нажать «Сохранить в облако» вручную.
  const firstCloudUploadTried = useRef(false)
  useEffect(() => {
    if (!FEATURES.cloudBackup || !cloudToken || cloudLastAt !== null || firstCloudUploadTried.current) return
    firstCloudUploadTried.current = true
    setCloudWorking(true)
    uploadToYandex(db, cloudToken)
      .then(result => {
        if (result === 'ok') {
          track('cloud_upload', { trigger: 'connect' }).catch(() => {})
          showToast(t.backup.cloudSaved)
          return refreshCloud()
        }
      })
      .finally(() => setCloudWorking(false))
  }, [cloudToken, cloudLastAt, refreshCloud, showToast, t.backup.cloudSaved])

  // Довыполнение выбора папки, прерванного выгрузкой приложения во время
  // системного пикера (Samsung/MIUI/EMUI). Если папка подхватилась — обновляем
  // карточку и сообщаем, что бэкап записан.
  useEffect(() => {
    if (!IS_CAPACITOR) return
    import('../../utils/nativeFolderBackup').then(async m => {
      const rec = await m.reconcilePickedFolder(db).catch(() => 'none' as const)
      if (rec === 'restored') {
        setNativeFolderMeta(await m.getNativeFolderMeta(db))
        showToast(t.backup.folderSaved)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- одноразовый догон на маунте
  }, [])

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
      const json = JSON.stringify(backup)
      const filename = `apptochite-${todayStr()}.json`
      if (IS_CAPACITOR) {
        // Системное «Поделиться» (Drive/почта/телега) — бросает при отмене.
        const file = new File([json], filename, { type: 'application/json' })
        await shareFilesNative([file], { title: t.backup.shareTitle })
      } else {
        downloadBlob(new Blob([json], { type: 'application/json' }), filename)
      }
      await updateLastBackupAt(db)
      track('backup_manual').catch(() => {})
      showToast(t.backup.backupSaved)
    } catch {
      // отмена share — без тоста об успехе
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- эффект пересобирает CSV при изменении данных (lastBackupTick)
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
  }, [lastBackupTick])

  function handleShare() {
    if (!shareFile) return
    if (IS_CAPACITOR) {
      shareFilesNative([shareFile], { title: t.backup.shareTitle })
        .then(async () => {
          await updateLastBackupAt(db)
          showToast(t.backup.backupShared)
        })
        .catch(() => { /* отмена */ })
      return
    }
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
    if (IS_CAPACITOR) {
      shareFilesNative([csvFile], { title: csvFile.name })
        .then(() => showToast(t.backup.csvSaved))
        .catch(() => { /* отмена */ })
      return
    }
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
      track('folder_backup_connected').catch(() => {})
      // lastAt есть — запись прошла сразу; иначе подсказываем «Сохранить сейчас».
      showToast(meta.lastAt ? t.backup.folderSaved : t.backup.folderConnected)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      const detail = e instanceof Error ? (e.name === 'Error' ? e.message : e.name) : String(e)
      showToast(t.backup.folderErrorDetail(detail))
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

  // ── Native folder handlers (APK) ──────────────────────────────────────────

  async function handleNativeFolderEnable() {
    if (!IS_CAPACITOR || nativeFolderWorking) return
    setNativeFolderWorking(true)
    try {
      const m = await import('../../utils/nativeFolderBackup')
      const result = await m.enableNativeFolderBackup(db)
      if (result.status === 'ok') {
        setNativeFolderMeta(await m.getNativeFolderMeta(db))
        showToast(t.backup.folderSaved)
      } else if (result.status === 'error') {
        // Текст реальной ошибки — чтобы отказ не был немым (скриншот = диагноз)
        showToast(t.backup.folderErrorDetail(result.detail))
      }
      // 'cancelled' — пользователь закрыл пикер, молчим
    } finally {
      setNativeFolderWorking(false)
    }
  }

  async function handleNativeFolderSaveNow() {
    if (!IS_CAPACITOR || nativeFolderWorking) return
    setNativeFolderWorking(true)
    try {
      const m = await import('../../utils/nativeFolderBackup')
      const result = await m.saveNativeFolderBackupNow(db)
      if (result.status === 'ok') {
        setNativeFolderMeta(await m.getNativeFolderMeta(db))
        showToast(t.backup.folderSaved)
      } else if (result.status === 'error') {
        showToast(t.backup.folderErrorDetail(result.detail))
      }
      // 'cancelled' — пользователь закрыл пикер, молчим
    } finally {
      setNativeFolderWorking(false)
    }
  }

  async function handleNativeFolderDisable() {
    if (!IS_CAPACITOR) return
    const m = await import('../../utils/nativeFolderBackup')
    await m.disableNativeFolderBackup(db)
    setNativeFolderMeta(null)
  }

  // ── Cloud handlers ────────────────────────────────────────────────────────

  async function handleCloudConnect() {
    const clientId = import.meta.env.VITE_YANDEX_CLIENT_ID as string | undefined
    if (!clientId) { showToast('VITE_YANDEX_CLIENT_ID не задан'); return }

    // APK: полностраничный редирект увёл бы WebView с приложения. Открываем
    // авторизацию во встроенном браузере и перехватываем redirect (токен в #).
    if (IS_CAPACITOR) {
      if (cloudWorking) return
      setCloudWorking(true)
      try {
        const { nativeYandexOAuth } = await import('../../utils/cloudAuthNative')
        const token = await nativeYandexOAuth(clientId)
        if (!token) return // отмена или ошибка — кнопка «подключить» остаётся
        await saveYandexToken(db, token)
        track('cloud_connected').catch(() => {})
        await refreshCloud()
      } finally {
        setCloudWorking(false)
      }
      return
    }

    // PWA: как было — полностраничный редирект, токен ловит OAuthCallback.
    const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}oauth/yandex/callback`
    window.location.href = buildOAuthUrl(clientId, redirectUri)
  }

  async function handleCloudDisconnect() {
    await removeYandexToken(db)
    setCloudToken(null)
    setCloudLastAt(null)
    setCloudSnapshots(null)
    setCloudAuto(false)
  }

  async function handleCloudSaveNow() {
    if (cloudWorking || !cloudToken) return
    setCloudWorking(true)
    try {
      const result = await uploadToYandex(db, cloudToken)
      if (result === 'ok') {
        track('cloud_upload', { trigger: 'manual' }).catch(() => {})
        showToast(t.backup.cloudSaved)
        await refreshCloud()
      } else if (result === 'auth-error') {
        showToast(t.backup.cloudAuthError)
      } else {
        showToast(t.backup.cloudSaveError)
      }
    } finally {
      setCloudWorking(false)
    }
  }

  async function handleCloudAutoToggle() {
    const next = !cloudAuto
    await setCloudAutoBackup(db, next)
    setCloudAuto(next)
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
    setConfirmReplace(false)
    setRestoring(true)
    try {
      await createPreRestoreSnapshot(db)
      await restoreBackup(db, preview)
      track('backup_restore', { mode: 'replace' }).catch(() => {})
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
      track('backup_restore', { mode: 'merge' }).catch(() => {})
      setMergeStats(stats)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      showToast(t.backup.mergeError)
      setMerging(false)
    }
  }

  // Размер копии: КБ до мегабайта, дальше МБ.
  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? t.backup.kb((bytes / 1024).toFixed(0))
      : t.backup.cloudMb((bytes / 1_048_576).toFixed(1))

  // Единый список доступных копий для восстановления — от свежих к старым.
  // storage: 1 — в браузере, 2 — папка, 3 — облако. action 'download' — облако
  // (прямое восстановление невозможно из-за CORS), ведёт на Яндекс.Диск.
  type RestoreCopy = {
    id: string
    storage: 1 | 2 | 3
    label: string
    date: Date
    size?: number
    action: 'restore' | 'download'
    run: () => void | Promise<void>
  }
  const applyPreview = (b: BackupFile | null, errMsg: string) => {
    if (b) setPreview(b)
    else showToast(errMsg)
  }
  const restoreCopies: RestoreCopy[] = []
  if (opfsMeta) restoreCopies.push({
    id: 'opfs', storage: 1, label: t.backup.copyBrowser, date: opfsMeta.date, size: opfsMeta.size, action: 'restore',
    run: async () => applyPreview(await readOPFSBackup(), t.backup.autoNotFound),
  })
  if (dailyMeta) restoreCopies.push({
    id: 'daily', storage: 1, label: t.backup.copyBrowserDaily, date: dailyMeta.date, size: dailyMeta.size, action: 'restore',
    run: async () => applyPreview(await readDailyBackup(db), t.backup.dailyNotFound),
  })
  if (preRestoreMeta) restoreCopies.push({
    id: 'prerestore', storage: 1, label: t.backup.copyBrowserPreRestore, date: preRestoreMeta.date, size: preRestoreMeta.size, action: 'restore',
    run: async () => applyPreview(await readPreRestoreSnapshot(), t.backup.autoNotFound),
  })
  if (folderMeta?.lastAt) restoreCopies.push({
    id: 'folder', storage: 2, label: t.backup.copyFolder, date: folderMeta.lastAt, size: folderMeta.size, action: 'restore',
    run: async () => applyPreview(await readFolderBackup(db), t.backup.restoreFolderNotFound),
  })
  if (folderPrevMeta) restoreCopies.push({
    id: 'folderprev', storage: 2, label: t.backup.copyFolderPrev, date: folderPrevMeta.date, size: folderPrevMeta.size, action: 'restore',
    run: async () => applyPreview(await readFolderPrevBackup(db), t.backup.folderPrevNotFound),
  })
  if (IS_CAPACITOR && nativeFolderMeta?.lastAt) restoreCopies.push({
    id: 'nativefolder', storage: 2, label: t.backup.copyFolder, date: nativeFolderMeta.lastAt, size: nativeFolderMeta.size, action: 'restore',
    run: async () => {
      const m = await import('../../utils/nativeFolderBackup')
      applyPreview(await m.readNativeFolderBackup(), t.backup.nfbRestoreNotFound)
    },
  })
  if (cloudSnapshots) for (const snap of cloudSnapshots) restoreCopies.push({
    id: `cloud-${snap.name}`, storage: 3,
    label: `${t.backup.copyCloud}${snap.deviceId ? ` · ${snap.fromThisDevice ? t.backup.cloudThisDevice : t.backup.cloudOtherDevice}` : ''}`,
    date: snap.createdAt, size: snap.size, action: 'download',
    run: () => { window.open('https://disk.yandex.ru/client/disk/Приложения/AppTochite', '_blank', 'noopener') },
  })
  restoreCopies.sort((a, b) => b.date.getTime() - a.date.getTime())

  const renderCopyRow = (c: RestoreCopy) => (
    <div key={c.id} className={s.copyRow}>
      <div className={s.copyMain}>
        <div className={s.copyHead}>
          <span className={s.copyStorage}>{c.label}</span>
          <ReliabilityBars n={c.storage} />
        </div>
        <span className={s.copyMeta}>
          <span style={{ color: ageDot(c.date), marginRight: 4 }}>●</span>
          {fmtDateTimeLong(locale, c.date)}{c.size ? ` · ${fmtSize(c.size)}` : ''}
        </span>
      </div>
      <button className={s.copyBtn} onClick={() => c.run()}>
        {c.action === 'download' ? t.backup.copyDownloadBtn : t.backup.copyRestoreBtn}
      </button>
    </div>
  )

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{t.backup.title}</span>
      </div>

      {/* Карточка статуса защиты */}
      {(() => {
        // В APK папка подключается через нативный SAF-механизм (nativeFolderMeta),
        // FSA-шный folderMeta там всегда null — без учёта нативной папки статус
        // никогда не зеленел от одной папки
        const effFolder = folderMeta ?? nativeFolderMeta
        const level = computeProtection(opfsMeta, opfsValid, effFolder, cloudLastAt)
        const cfg = {
          protected: { color: 'var(--status-done)', label: t.backup.statusProtected, desc: t.backup.statusProtectedDesc },
          partial:   { color: '#F5A623',            label: t.backup.statusPartial,   desc: effFolder ? t.backup.statusPartialStale : t.backup.statusPartialNoFolder },
          'at-risk': { color: 'var(--danger)',       label: t.backup.statusAtRisk,    desc: !opfsMeta && !effFolder ? t.backup.statusAtRiskNoBackup : opfsValid === false && !effFolder ? t.backup.statusAtRiskCorrupt : t.backup.statusAtRiskStale },
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

      {/* ─── РЕЗЕРВНАЯ КОПИЯ ─── */}
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.backupSection}</p>
        <p className={s.desc}>{t.backup.backupIntro}</p>

        {/* Уровень 1 — в браузере (всегда вкл, самая слабая защита) */}
        <div className={s.destCard}>
          <div className={s.destHeader}>
            <span className={s.destTitle}>{t.backup.storageBrowserTitle}</span>
            <ReliabilityBars n={1} />
          </div>
          <span className={s.destMeta}>
            {opfsMeta === undefined
              ? t.backup.loading
              : opfsMeta === null
                ? t.backup.storageBrowserAuto
                : (<>
                    <span style={{ color: ageDot(opfsMeta.date), marginRight: 4 }}>●</span>
                    {`${fmtDateTimeLong(locale, opfsMeta.date)} · ${fmtSize(opfsMeta.size)}`}
                  </>)}
          </span>
          {opfsValid === false && <p className={s.autoBackupWarn}>{t.backup.opfsCorruptWarn}</p>}
          <p className={s.destSub}>{t.backup.storageBrowserDesc}</p>
        </div>

        {/* Уровень 2 — папка на устройстве (где поддерживается File System Access) */}
        {!IS_CAPACITOR && supportsFileSystemAccess() && (
          folderMeta ? (
            <div className={s.destCard}>
              <div className={s.destHeader}>
                <span className={s.destTitle}>{folderMeta.folderName}</span>
                <ReliabilityBars n={2} />
              </div>
              <span className={s.destMeta}>
                {folderMeta.lastAt
                  ? (<><span style={{ color: ageDot(folderMeta.lastAt), marginRight: 4 }}>●</span>{t.backup.folderLastAt(fmtDateTimeLong(locale, folderMeta.lastAt))}{folderMeta.size ? ` · ${fmtSize(folderMeta.size)}` : ''}</>)
                  : t.backup.folderNeverSaved}
              </span>
              <p className={s.destSub}>{t.backup.storageFolderReliability}</p>
              <div className={s.autoBackupActions}>
                <button className={s.primaryBtn} onClick={handleFolderSaveNow} disabled={folderWorking}>
                  {folderWorking ? t.backup.saving : t.backup.folderSaveNow}
                </button>
                <button className={s.secondaryBtn} onClick={handlePickFolder} disabled={folderWorking}>
                  {t.backup.folderChange}
                </button>
                <button className={s.secondaryBtn} onClick={handleDisconnectFolder} disabled={folderWorking}>
                  {t.backup.folderDisconnect}
                </button>
              </div>
            </div>
          ) : (
            <div className={s.destCard}>
              <div className={s.destHeader}>
                <span className={s.destTitle}>{t.backup.destFolderTitle}</span>
                <ReliabilityBars n={2} />
              </div>
              <p className={s.destSub}>{t.backup.storageFolderReliability}</p>
              <p className={s.destMeta}>{t.backup.folderDesc}</p>
              <button className={s.primaryBtn} onClick={handlePickFolder} disabled={folderWorking}>
                {folderWorking ? t.backup.saving : t.backup.folderPick}
              </button>
            </div>
          )
        )}

        {/* Папка на устройстве — нативный вариант для APK */}
        {IS_CAPACITOR && (
          nativeFolderMeta ? (
            <div className={s.destCard}>
              <div className={s.destHeader}>
                <span className={s.destTitle}>{nativeFolderMeta.folderName || t.backup.nfbTitle}</span>
                <ReliabilityBars n={2} />
              </div>
              <span className={s.destMeta}>
                {nativeFolderMeta.lastAt
                  ? (<><span style={{ color: ageDot(nativeFolderMeta.lastAt), marginRight: 4 }}>●</span>{t.backup.folderLastAt(fmtDateTimeLong(locale, nativeFolderMeta.lastAt))}{nativeFolderMeta.size ? ` · ${fmtSize(nativeFolderMeta.size)}` : ''}</>)
                  : t.backup.folderNeverSaved}
              </span>
              <p className={s.destSub}>{t.backup.storageFolderReliability}</p>
              {/* Диагностика: почему последняя ФОНОВАЯ попытка не записала файл.
                  unchanged — штатно (нечего сохранять), отдельная спокойная
                  строка, а не «пропущена» — это не ошибка. Остальное — тревожно.
                  Видно на экране даже если у пользователя выключена аналитика. */}
              {nativeSkip && (
                nativeSkip.reason === 'unchanged' ? (
                  <p className={s.destMeta}>{t.backup.nfbSkipUpToDate(fmtDate(locale, nativeSkip.day))}</p>
                ) : (
                  <p className={s.autoBackupWarn}>
                    {t.backup.nfbSkipLine(fmtDate(locale, nativeSkip.day), skipReasonLabel(t, nativeSkip.reason))}
                  </p>
                )
              )}
              <div className={s.autoBackupActions}>
                <button className={s.primaryBtn} onClick={handleNativeFolderSaveNow} disabled={nativeFolderWorking}>
                  {nativeFolderWorking ? t.backup.saving : t.backup.folderSaveNow}
                </button>
                <button className={s.secondaryBtn} onClick={handleNativeFolderEnable} disabled={nativeFolderWorking}>
                  {t.backup.nfbChangeFolder}
                </button>
                <button className={s.secondaryBtn} onClick={handleNativeFolderDisable} disabled={nativeFolderWorking}>
                  {t.backup.nfbDisable}
                </button>
              </div>
            </div>
          ) : nativeFolderMeta === null ? (
            <div className={s.destCard}>
              <div className={s.destHeader}>
                <span className={s.destTitle}>{t.backup.nfbTitle}</span>
                <ReliabilityBars n={2} />
              </div>
              <p className={s.destSub}>{t.backup.storageFolderReliability}</p>
              <p className={s.destMeta}>{t.backup.nfbDesc}</p>
              <button className={s.primaryBtn} onClick={handleNativeFolderEnable} disabled={nativeFolderWorking}>
                {nativeFolderWorking ? t.backup.saving : t.backup.nfbEnable}
              </button>
            </div>
          ) : null
        )}

        {/* Уровень 3 — облако (самая надёжная) */}
        {FEATURES.cloudBackup && (
          cloudToken === undefined ? (
            <div className={s.destCard}>
              <div className={s.destHeader}>
                <span className={s.destTitle}>{t.backup.destCloudTitle}</span>
                <ReliabilityBars n={3} />
              </div>
              <p className={s.destMeta}>{t.backup.loading}</p>
            </div>
          ) : !cloudToken ? (
            <div className={s.destCard}>
              <div className={s.destHeader}>
                <span className={s.destTitle}>{t.backup.destCloudTitle}</span>
                <ReliabilityBars n={3} />
              </div>
              <p className={s.destSub}>{t.backup.storageCloudReliability}</p>
              <p className={s.destMeta}>{t.backup.cloudDesc}</p>
              <button className={s.primaryBtn} onClick={handleCloudConnect}>{t.backup.cloudConnect}</button>
            </div>
          ) : (
            <div className={s.destCard}>
              <div className={s.destHeader}>
                <span className={s.destTitle}>{t.backup.destCloudTitle}</span>
                <ReliabilityBars n={3} />
              </div>
              <span className={s.destMeta}>
                {cloudLastAt
                  ? (<><span style={{ color: ageDot(cloudLastAt), marginRight: 4 }}>●</span>{t.backup.cloudLastAt(fmtDateTimeLong(locale, cloudLastAt))}</>)
                  : t.backup.cloudNeverSaved}
              </span>
              <p className={s.destSub}>{t.backup.storageCloudReliability}</p>

              <button
                role="switch"
                aria-checked={cloudAuto}
                className={s.toggleFlat}
                onClick={handleCloudAutoToggle}
              >
                <div className={s.toggleInfo}>
                  <span className={s.toggleLabel}>{t.backup.cloudAutoBackup}</span>
                  <span className={s.toggleDesc}>{t.backup.cloudAutoBackupDesc}</span>
                </div>
                <div className={`${s.toggle} ${cloudAuto ? s.toggleOn : ''}`}>
                  <div className={s.toggleThumb} />
                </div>
              </button>

              <div className={s.autoBackupActions}>
                <button className={s.primaryBtn} onClick={handleCloudSaveNow} disabled={cloudWorking}>
                  {cloudWorking ? t.backup.cloudSaving : t.backup.cloudSaveNow}
                </button>
                <button className={s.secondaryBtn} onClick={handleCloudDisconnect} disabled={cloudWorking}>
                  {t.backup.cloudDisconnect}
                </button>
              </div>
            </div>
          )
        )}

      </div>

      <div className={s.divider} />

      {/* ─── ВОССТАНОВЛЕНИЕ ─── */}
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.backup.restoreSection}</p>

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
            <p className={s.desc}>{t.backup.copiesIntro}</p>

            {/* Единый список доступных копий — от свежих к старым; 3 последних,
                остальные под катом «Более ранние копии» */}
            {restoreCopies.slice(0, 3).map(renderCopyRow)}
            {restoreCopies.length > 3 && (
              <>
                <button className={s.collapseBtn} onClick={() => setOlderCopiesOpen(v => !v)}>
                  <span className={`${s.collapseChevron} ${olderCopiesOpen ? s.collapseChevronOpen : ''}`}>
                    <IconChevronRight />
                  </span>
                  {t.backup.copiesOlder(restoreCopies.length - 3)}
                </button>
                {olderCopiesOpen && restoreCopies.slice(3).map(renderCopyRow)}
              </>
            )}

            {/* Состояние облачного списка */}
            {FEATURES.cloudBackup && cloudToken && cloudSnapshotsLoading && (
              <p className={s.desc}>{t.backup.cloudSnapshotsLoading}</p>
            )}
            {FEATURES.cloudBackup && cloudToken && cloudSnapshotsError && (
              <p className={s.desc} style={{ color: 'var(--danger)' }}>{t.backup.cloudSnapshotsError}</p>
            )}

            {restoreCopies.length === 0 && !cloudSnapshotsLoading && (
              <p className={s.desc}>{t.backup.copiesEmpty}</p>
            )}

            {/* Облако восстанавливается через скачивание (CORS) */}
            {FEATURES.cloudBackup && cloudToken && (cloudSnapshots?.length ?? 0) > 0 && (
              <p className={s.desc} style={{ fontSize: 12 }}>{t.backup.restoreCloudSteps}</p>
            )}

            {/* Из файла — отдельный путь */}
            <button className={s.primaryBtn} onClick={() => fileInputRef.current?.click()}>
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
              <button className={s.dangerBtn} onClick={() => setConfirmReplace(true)} disabled={restoring || merging}>
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

      {/* ─── ДОПОЛНИТЕЛЬНО ─── */}
      <div className={s.section}>
        <button className={s.collapseBtn} onClick={() => setAdvancedOpen(v => !v)}>
          <span className={`${s.collapseChevron} ${advancedOpen ? s.collapseChevronOpen : ''}`}>
            <IconChevronRight />
          </span>
          {t.backup.advancedSection}
        </button>
        {advancedOpen && (
          <div className={s.collapseContent}>
            {/* Размер базы данных */}
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

            {/* Фоновый бэкап (экспериментально) — только если поддерживается */}
            {periodicStatus !== undefined && periodicStatus !== 'unsupported' && (
              <>
                <p className={s.sectionTitle} style={{ marginTop: 8 }}>{t.backup.periodicSyncSection}</p>
                <p className={s.desc}>{t.backup.periodicSyncDesc}</p>
                {periodicStatus === 'on' ? (
                  <button className={s.secondaryBtn} onClick={async () => {
                    await disablePeriodicSync()
                    setPeriodicStatus(await getPeriodicSyncStatus())
                  }}>{t.backup.periodicSyncDisable}</button>
                ) : (
                  <button className={s.secondaryBtn} onClick={async () => {
                    const result = await enablePeriodicSync()
                    if (result === 'denied') showToast(t.backup.periodicSyncDenied)
                    setPeriodicStatus(await getPeriodicSyncStatus())
                  }}>{t.backup.periodicSyncEnable}</button>
                )}
              </>
            )}

            {/* Выгрузка файлов: поделиться + JSON-бэкап + Excel/CSV */}
            <p className={s.sectionTitle} style={{ marginTop: 8 }}>{t.backup.exportSection}</p>
            <p className={s.desc}>{t.backup.exportDesc}</p>
            <button className={s.secondaryBtn} onClick={handleShare} disabled={preparingShare || !shareFile}>
              {preparingShare ? t.backup.preparing : t.backup.shareBackup}
            </button>
            <p className={s.desc} style={{ fontSize: 12 }}>{t.backup.shareDesc}</p>
            <button className={s.secondaryBtn} onClick={handleExport} disabled={exporting}>
              {exporting ? t.backup.saving : t.backup.saveBackupJson}
            </button>
            <p className={s.desc} style={{ marginTop: 8 }}>{t.backup.csvDesc}</p>
            <button className={s.secondaryBtn} onClick={handleExportCSV} disabled={preparingCsv || !csvFile}>
              {preparingCsv ? t.backup.preparing : t.backup.downloadCsv}
            </button>
          </div>
        )}
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
            <span className={s.aboutVersion}>v{VERSION_LABEL}</span>
          </div>
          <div className={s.aboutRight}>
            {hasUpdate && <span className={s.updateDot} />}
            <span className={s.aboutChevron}><IconChevronRight /></span>
          </div>
        </Link>
      </div>

      <ConfirmModal
        isOpen={confirmReplace}
        title={t.backup.replaceConfirmTitle}
        message={t.backup.replaceConfirmText}
        confirmLabel={t.backup.replaceAll}
        onConfirm={handleRestore}
        onCancel={() => setConfirmReplace(false)}
      />
    </div>
  )
}
