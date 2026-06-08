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
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { flushAnalyticsQueue } from './services/analytics'
import { db } from './db/instance'
import { purgeExpired } from './utils/trash'

const PURGE_INTERVAL_MS = 12 * 60 * 60 * 1000

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
    flushAnalyticsQueue()
    navigator.storage?.persist?.()
    window.addEventListener('online', flushAnalyticsQueue)
    runPurgeIfDue()
    return () => window.removeEventListener('online', flushAnalyticsQueue)
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
        </AutoBackupProvider>
      </ToastProvider>
    </LocaleProvider>
  )
}
