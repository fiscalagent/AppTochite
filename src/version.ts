export const APP_VERSION = '2.4.8'

// Версия для отображения. APK-сборка (Capacitor) получает суффикс «A», PWA — нет,
// чтобы на экране «О программе» / бэкапа было видно, какая сборка запущена.
// APP_VERSION остаётся чистым semver — его сравнивает useVersionCheck с GitHub-релизом,
// литера в числе сломала бы parseVer (Number('0A') === NaN).
export const VERSION_LABEL =
  APP_VERSION + (import.meta.env.MODE === 'capacitor' ? 'A' : '')
