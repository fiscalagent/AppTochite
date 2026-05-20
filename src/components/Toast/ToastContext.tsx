import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import s from './Toast.module.css'

interface ToastCtx {
  showToast: (message: string) => void
  setRaisedMode: (raised: boolean) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {}, setRaisedMode: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [raised, setRaised] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg)
    timerRef.current = setTimeout(() => setMessage(null), 2500)
  }, [])

  const setRaisedMode = useCallback((r: boolean) => setRaised(r), [])

  return (
    <ToastContext.Provider value={{ showToast, setRaisedMode }}>
      {children}
      {message && createPortal(
        <div className={`${s.toast} ${raised ? s.raised : ''}`}>{message}</div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
