import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ToastProvider } from './components/Toast/ToastContext'
import BackupReminder from './components/BackupReminder/BackupReminder'
import StorageWarning from './components/StorageWarning/StorageWarning'
import BrowserWarning from './components/BrowserWarning/BrowserWarning'

export default function App() {
  return (
    <ToastProvider>
      <BrowserWarning />
      <RouterProvider router={router} />
      <BackupReminder />
      <StorageWarning />
    </ToastProvider>
  )
}
