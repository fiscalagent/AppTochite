import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ToastProvider } from './components/Toast/ToastContext'
import { AutoBackupProvider } from './contexts/AutoBackupContext'
import { LocaleProvider } from './i18n'
import BackupReminder from './components/BackupReminder/BackupReminder'
import StorageWarning from './components/StorageWarning/StorageWarning'
import BrowserWarning from './components/BrowserWarning/BrowserWarning'
import OnboardingSheet from './components/OnboardingSheet/OnboardingSheet'
import InstallNudgeSheet from './components/InstallNudge/InstallNudgeSheet'
import FolderBackupPrompt from './components/FolderBackupPrompt/FolderBackupPrompt'
import DataLossAlert from './components/DataLossAlert/DataLossAlert'
import StorageRiskAlert from './components/StorageRiskAlert/StorageRiskAlert'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { ensurePersistentStorage } from './utils/storagePersistence'
import { flushAnalyticsQueue, track, baseContext } from './services/analytics'
import { db } from './db/instance'
import { purgeExpired } from './utils/trash'
import { healFolderBackupIfNeeded, performFolderBackup, writeSentinel } from './utils/backup'

const PURGE_INTERVAL_MS = 12 * 60 * 60 * 1000
const APP_OPEN_DEBOUNCE_MS = 30 * 60 * 1000

// app_open: при загрузке и при возврате во вкладку с паузой ≥30 мин. По
// deviceId+дате считается DAU/retention, по displayMode — доля установивших PWA.
function trackAppOpen() {
  const last = Number(sessionStorage.getItem('lastOpenAt') ?? 0)
  if (Date.now() - last < APP_OPEN_DEBOUNCE_MS) return
  sessionStorage.setItem('lastOpenAt', String(Date.now()))
  track('app_open', {
    ...baseContext(),
    referrer: document.referrer || null,
    src: new URLSearchParams(location.search).get('src'),
  }).catch(() => {})
}

async function runPurgeIfDue() {
  try {
    const entry = await db.settings.get('lastPurgeAt')
    const last = entry ? new Date(entry.value as string).getTime() : 0
    if (Date.now() - last < PURGE_INTERVAL_MS) return
    await purgeExpired(db)
    await db.settings.put({ key: 'lastPurgeAt', value: new Date().toISOString() })
  } catch (err) {
    // Не блокируем запуск приложения, но логируем — иначе вечный сбой purge
    // незаметно копит мусор в корзине.
    console.warn('purgeExpired failed', err)
  }
}

export default function App() {
  useEffect(() => {
    // Счётчик запусков (вне бэкапа) — для баннера установки «для возвращающихся».
    localStorage.setItem('launchCount', String(Number(localStorage.getItem('launchCount') ?? 0) + 1))
    flushAnalyticsQueue()
    trackAppOpen()
    ensurePersistentStorage()
    window.addEventListener('online', flushAnalyticsQueue)
    const onVisible = () => { if (document.visibilityState === 'visible') trackAppOpen() }
    document.addEventListener('visibilitychange', onVisible)
    runPurgeIfDue()
    healFolderBackupIfNeeded(db).catch(() => {})
    writeSentinel(db).catch(() => {})

    // Периодический бэкап: SW шлёт сообщение когда приложение открыто во время sync-события.
    function handleSWMessage(event: MessageEvent) {
      if (event.data?.type === 'periodic-backup') {
        performFolderBackup(db).catch(() => {})
        writeSentinel(db).catch(() => {})
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)

    return () => {
      window.removeEventListener('online', flushAnalyticsQueue)
      document.removeEventListener('visibilitychange', onVisible)
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
    }
  }, [])

  return (
    <LocaleProvider>
      <ToastProvider>
        <AutoBackupProvider>
          <ErrorBoundary name="BrowserWarning"><BrowserWarning /></ErrorBoundary>
          <RouterProvider router={router} />
          <ErrorBoundary name="BackupReminder"><BackupReminder /></ErrorBoundary>
          <ErrorBoundary name="StorageWarning"><StorageWarning /></ErrorBoundary>
          <ErrorBoundary name="OnboardingSheet"><OnboardingSheet /></ErrorBoundary>
          <ErrorBoundary name="InstallNudgeSheet"><InstallNudgeSheet /></ErrorBoundary>
        <ErrorBoundary name="FolderBackupPrompt"><FolderBackupPrompt /></ErrorBoundary>
        <ErrorBoundary name="DataLossAlert"><DataLossAlert /></ErrorBoundary>
        <ErrorBoundary name="StorageRiskAlert"><StorageRiskAlert /></ErrorBoundary>
        </AutoBackupProvider>
      </ToastProvider>
    </LocaleProvider>
  )
}
