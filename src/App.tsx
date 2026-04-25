import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ToastProvider } from './components/Toast/ToastContext'
import BackupReminder from './components/BackupReminder/BackupReminder'
import StorageWarning from './components/StorageWarning/StorageWarning'

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
      <BackupReminder />
      <StorageWarning />
    </ToastProvider>
  )
}
