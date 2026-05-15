import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ToastProvider } from './components/Toast/ToastContext'
import { AutoBackupProvider } from './contexts/AutoBackupContext'
import BackupReminder from './components/BackupReminder/BackupReminder'
import StorageWarning from './components/StorageWarning/StorageWarning'
import BrowserWarning from './components/BrowserWarning/BrowserWarning'
import OnboardingSheet from './components/OnboardingSheet/OnboardingSheet'

export default function App() {
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
