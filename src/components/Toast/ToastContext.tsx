import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import s from './Toast.module.css'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastCtx {
  showToast: (message: string, action?: ToastAction) => void
  setRaisedMode: (raised: boolean) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {}, setRaisedMode: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [action, setAction] = useState<ToastAction | null>(null)
  const [raised, setRaised] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string, act?: ToastAction) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setMessage(msg)
    setAction(act ?? null)
    // С кнопкой даём больше времени, чтобы пользователь успел нажать.
    timerRef.current = setTimeout(() => { setMessage(null); setAction(null) }, act ? 6000 : 2500)
  }, [])

  const setRaisedMode = useCallback((r: boolean) => setRaised(r), [])

  return (
    <ToastContext.Provider value={{ showToast, setRaisedMode }}>
      {children}
      {message && createPortal(
        <div className={`${s.toast} ${raised ? s.raised : ''} ${action ? s.withAction : ''}`}>
          <span className={s.toastMsg}>{message}</span>
          {action && (
            <button
              className={s.toastAction}
              onClick={() => {
                if (timerRef.current) clearTimeout(timerRef.current)
                setMessage(null)
                setAction(null)
                action.onClick()
              }}
            >{action.label}</button>
          )}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
