// Нативный Яндекс-OAuth для APK через @capacitor/inappbrowser.
//
// В PWA токен добывается полностраничным редиректом (window.location → Яндекс →
// redirect URI → OAuthCallback). В WebView так нельзя: redirect уводит на чужой
// origin и приложение исчезает. Здесь открываем авторизацию во встроенном WebView
// и ПЕРЕХВАТЫВАЕМ переход на redirect URI (событие browserPageNavigationCompleted) —
// токен лежит в #фрагменте. Саму страницу redirect не используем.
//
// Импортируется ТОЛЬКО из ветки IS_CAPACITOR в BackupScreen → плагин и этот модуль
// вырезаются из PWA-бандла (Rollup DCE). PWA-флоу не затронут.

import type { PluginListenerHandle } from '@capacitor/core'
import { buildOAuthUrl, consumeOAuthState } from './cloudBackup'

// Тот же redirect URI, что зарегистрирован у PWA в настройках Яндекс-приложения.
// Реально не загружаем — ловим переход на него и достаём токен из фрагмента.
const REDIRECT_URI = 'https://fiscalagent.github.io/AppTochite/oauth/yandex/callback'

// Возвращает access_token при успехе, либо null (отмена/ошибка/несовпадение state).
export async function nativeYandexOAuth(clientId: string): Promise<string | null> {
  const { InAppBrowser, DefaultWebViewOptions } = await import('@capacitor/inappbrowser')
  const authUrl = buildOAuthUrl(clientId, REDIRECT_URI) // пишет state в sessionStorage

  return new Promise<string | null>(resolve => {
    let settled = false
    let navHandle: PluginListenerHandle | undefined
    let closeHandle: PluginListenerHandle | undefined

    const finish = async (token: string | null) => {
      if (settled) return
      settled = true
      navHandle?.remove()
      closeHandle?.remove()
      await InAppBrowser.close().catch(() => {})
      resolve(token)
    }

    InAppBrowser.addListener('browserPageNavigationCompleted', ({ url }) => {
      if (!url || !url.startsWith(REDIRECT_URI)) return // ждём именно redirect
      const frag = url.split('#')[1] ?? ''
      const params = new URLSearchParams(frag)
      const token = params.get('access_token')
      const returnedState = params.get('state')
      const expectedState = consumeOAuthState()
      const ok = token && expectedState && returnedState === expectedState
      finish(ok ? token : null)
    }).then(h => { navHandle = h; if (settled) h.remove() })

    // Пользователь закрыл встроенный браузер сам — считаем отменой.
    InAppBrowser.addListener('browserClosed', () => finish(null))
      .then(h => { closeHandle = h; if (settled) h.remove() })

    InAppBrowser.openInWebView({
      url: authUrl,
      options: { ...DefaultWebViewOptions, showURL: false, closeButtonText: 'Отмена' },
    }).catch(() => finish(null))
  })
}
