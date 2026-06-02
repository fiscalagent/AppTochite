// Язык интерфейса — device-specific предпочтение. Хранится в localStorage, а НЕ
// в таблице settings и тем более не в данных: бэкап и восстановление его не
// касаются ни при каких условиях. Прецедент в проекте — isVoiceEnabled() тоже
// читает localStorage. Синхронное чтение важно, чтобы при загрузке не мигал
// неверный язык до того, как отработает async-запрос к IndexedDB.

export type Locale = 'ru' | 'en'

export const LOCALES: readonly Locale[] = ['ru', 'en']

// На время Фазы 1 фундамента реально доступен только русский словарь.
// Английский добавится в Фазе 2 — тогда расширим этот список.
export const AVAILABLE_LOCALES: readonly Locale[] = ['ru']

const STORAGE_KEY = 'apptochite-locale'

// BCP-47 теги для Intl. Сам Locale ('ru'/'en') Intl тоже принимает, но полные
// теги дают предсказуемые формат даты/числа независимо от системной локали.
const LOCALE_TAG: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-US',
}

export function localeTag(locale: Locale): string {
  return LOCALE_TAG[locale] ?? LOCALE_TAG.ru
}

function isLocale(value: unknown): value is Locale {
  return value === 'ru' || value === 'en'
}

// Дефолт при первом запуске: системный язык, если он доступен, иначе русский.
export function detectDefaultLocale(): Locale {
  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  const guess: Locale = nav.toLowerCase().startsWith('ru') ? 'ru' : 'en'
  return AVAILABLE_LOCALES.includes(guess) ? guess : 'ru'
}

export function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (isLocale(raw) && AVAILABLE_LOCALES.includes(raw)) return raw
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — мягкий фолбэк
  }
  return detectDefaultLocale()
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // запись не критична — язык просто не переживёт перезагрузку
  }
}

export function applyHtmlLang(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}
