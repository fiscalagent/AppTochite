import { useEffect } from 'react'

const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

// В APK аппаратная кнопка «назад» без этой подписки закрывает приложение
// целиком: Capacitor Bridge сам KEYCODE_BACK не перехватывает — это делает
// только плагин @capacitor/app (см. BridgeActivity/Bridge — там обработчика
// нет). Подписка приравнивает её к on-screen ◀ (SPA POP-навигация); выход из
// приложения — только когда в истории возвращаться уже некуда (canGoBack=false,
// т.е. window.history.state.idx === 0 — переключение вкладок BottomNav через
// replace на idx не влияет, так что смена вкладок не «съедает» выход).
export function useHardwareBackButton() {
  useEffect(() => {
    if (!IS_CAPACITOR) return
    let cancelled = false
    let handle: { remove: () => void } | undefined

    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back()
        else App.exitApp()
      }).then(h => {
        if (cancelled) h.remove()
        else handle = h
      })
    })

    return () => {
      cancelled = true
      handle?.remove()
    }
  }, [])
}
