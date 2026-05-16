import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ToastProvider } from './components/Toast/ToastContext'
import { AutoBackupProvider } from './contexts/AutoBackupContext'
import BackupReminder from './components/BackupReminder/BackupReminder'
import StorageWarning from './components/StorageWarning/StorageWarning'
import BrowserWarning from './components/BrowserWarning/BrowserWarning'
import OnboardingSheet from './components/OnboardingSheet/OnboardingSheet'
import { flushAnalyticsQueue } from './services/analytics'

export default function App() {
  useEffect(() => {
    flushAnalyticsQueue()
    window.addEventListener('online', flushAnalyticsQueue)
    return () => window.removeEventListener('online', flushAnalyticsQueue)
  }, [])

  return (
    <ToastProvider>
      <AutoBackupProvider>
        <BrowserWarning />
        <RouterProvider router={router} />
        <BackupReminder />
        <StorageWarning />
        <OnboardingSheet />
      </AutoBackupProvider>
    </ToastProvider>
  )
}
