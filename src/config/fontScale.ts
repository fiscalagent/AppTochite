// Масштаб интерфейса — device-specific предпочтение, как язык и голосовой ввод.
// Хранится в localStorage, ВНЕ бэкапа: это настройка устройства, а не данные.
// Прецедент — readStoredLocale() и isVoiceEnabled() тоже читают localStorage.
//
// Механизм — CSS `zoom` на <body>. В отличие от transform:scale, zoom честно
// рефлоует вёрстку (не оставляет «дыр» и не требует компенсации ширины) и
// одинаково увеличивает и текст, и отступы, и иконки — то есть весь интерфейс
// растёт согласованно. Поддерживается во всех Chromium (наши ~90% — Android
// WebView/Chrome). Вешаем именно на <body>, а не на #root: модалки и шторки
// монтируются порталом в document.body (см. ConfirmModal и др.), и при zoom на
// #root они остались бы в масштабе 1x.

export type FontScale = 'normal' | 'large'

export const FONT_SCALES: readonly FontScale[] = ['normal', 'large']

const SCALE_VALUE: Record<FontScale, number> = {
  normal: 1,
  large: 1.25,
}

const STORAGE_KEY = 'apptochite-font-scale'

function isFontScale(value: unknown): value is FontScale {
  return value === 'normal' || value === 'large'
}

export function readStoredFontScale(): FontScale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (isFontScale(raw)) return raw
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — мягкий фолбэк
  }
  return 'normal'
}

// Применяет масштаб мгновенно, без перерисовки React: CSS-переменную читает
// правило `body { zoom: var(--ui-scale, 1) }` в reset.css.
export function applyFontScale(scale: FontScale): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--ui-scale', String(SCALE_VALUE[scale]))
}

export function writeStoredFontScale(scale: FontScale): void {
  try {
    localStorage.setItem(STORAGE_KEY, scale)
  } catch {
    // запись не критична — масштаб просто не переживёт перезагрузку
  }
  applyFontScale(scale)
}
