// Платформенные проверки для установки PWA. На iOS нет beforeinstallprompt —
// установка только вручную через «Поделиться → На экран „Домой“», и только в
// Safari (Chrome/Firefox и пр. на iOS этого пункта не дают).

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ маскируется под Mac — ловим по тач-экрану
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!iOS) return false
  // другие браузеры на iOS не умеют «На экран Домой»
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|mercury/i.test(ua)
  return !otherBrowser
}

// Можно ли показать iOS-инструкцию: Safari на iOS и ещё не установлено.
export function isIosInstallable(): boolean {
  return isIosSafari() && !isStandalone()
}
