import { useEffect, useState } from 'react'
import { getCanInstall, subscribe, promptInstall } from '../utils/installPrompt'

// React-обёртка над utils/installPrompt: реактивный canInstall + вызов диалога.
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(getCanInstall())

  useEffect(() => subscribe(setCanInstall), [])

  return { canInstall, promptInstall }
}
