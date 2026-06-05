import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  type Locale,
  readStoredLocale,
  writeStoredLocale,
  applyHtmlLang,
} from './locale'
import { dicts, ru, type Dict } from './dict'
import { db } from '../db/instance'
import { syncStonesCatalog } from '../db/seed'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dict
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Синхронное чтение из localStorage в инициализаторе — без мигания языка.
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale())

  useEffect(() => {
    applyHtmlLang(locale)
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    writeStoredLocale(next)
    setLocaleState(next)
    syncStonesCatalog(db).catch(() => {})
  }, [])

  // Фолбэк на русский, пока словарь локали не добавлен (Фаза 1).
  const t = dicts[locale] ?? ru

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

// хук-аксессоры живут рядом с провайдером; выносить ради HMR не оправдано
// (тот же подход, что в AutoBackupContext).
// eslint-disable-next-line react-refresh/only-export-components
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT(): Dict {
  return useLocale().t
}

// Тотальный аксессор enum-подписи: неизвестное (или пустое) значение возвращается
// как есть. Гарантия из плана безопасности — локализация не теряет данные.
// eslint-disable-next-line react-refresh/only-export-components
export function enumLabel(map: Record<string, string>, raw: string | undefined | null): string {
  if (raw == null || raw === '') return ''
  return map[raw] ?? raw
}
