// Постоянство хранилища браузера. В не-установленном контексте (обычная вкладка
// или legacy-ярлык вместо настоящего WebAPK) IndexedDB считается «best-effort» —
// Chrome вправе его вытеснить, из-за чего добавленные клиенты/заточки пропадают.
// Здесь: (1) один раз просим постоянное хранилище, (2) сообщаем, осталось ли оно
// вытесняемым — это и есть сигнал «приложение установлено некорректно».

let persistencePromise: Promise<boolean> | null = null

// Запрашивает постоянное хранилище один раз за загрузку. persist() идемпотентен,
// но в Firefox показывает промпт — поэтому мемоизируем обещание, чтобы не спросить
// дважды (общий источник для App.tsx и детектора).
// Возврат: true — хранилище постоянное (или API нет и считаем надёжным),
// false — вытесняемое, данные под угрозой.
export function ensurePersistentStorage(): Promise<boolean> {
  if (persistencePromise) return persistencePromise
  persistencePromise = (async () => {
    if (typeof navigator === 'undefined' || !navigator.storage) return true
    try {
      if (navigator.storage.persisted && (await navigator.storage.persisted())) return true
      if (navigator.storage.persist) return await navigator.storage.persist()
      // API недоступен — определить нельзя, ложную тревогу не поднимаем.
      return true
    } catch {
      return true
    }
  })()
  return persistencePromise
}

// true — данные под угрозой: хранилище вытесняемое и получить постоянное не удалось.
// В APK (нативное durable-хранилище WebView) persisted() бывает ложно false —
// поэтому в Capacitor-сборке всегда считаем безопасным (ветку срежет DCE).
export async function isStorageEvictable(): Promise<boolean> {
  if (import.meta.env.MODE === 'capacitor') return false
  return !(await ensurePersistentStorage())
}
