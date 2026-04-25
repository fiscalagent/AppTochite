import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ToastProvider } from './components/Toast/ToastContext'
import BackupReminder from './components/BackupReminder/BackupReminder'

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
      <BackupReminder />
    </ToastProvider>
  )
}
