// Открытие веб-инструкции (guide.html) кросс-платформенно.
//
// В web — новая вкладка с файлом рядом (PWA на GitHub Pages раздаёт guide.html
// из своего base). В APK Custom Tab не видит локальный https://localhost, плюс
// window.open в WebView выкидывает в системный «выбери браузер» — поэтому в
// cap-сборке открываем тот же файл с живого сайта через @capacitor/browser
// (Custom Tab: без чужого выбора браузера и с возвратом в приложение).
//
// Плагин импортируется динамически и только в cap-ветке → в PWA-сборке
// (MODE='production') Rollup вырезает ветку и chunk плагина, бандл не растёт.

const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

// Живой адрес инструкции на GitHub Pages этого репозитория.
const GUIDE_LIVE_BASE = 'https://fiscalagent.github.io/AppTochite/'

function guideUrl(locale: string): string {
  const file = `guide${locale === 'en' ? '_en' : ''}.html`
  return IS_CAPACITOR ? `${GUIDE_LIVE_BASE}${file}` : `${import.meta.env.BASE_URL}${file}`
}

export async function openGuide(locale: string): Promise<void> {
  const url = guideUrl(locale)
  if (IS_CAPACITOR) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
    return
  }
  window.open(url, '_blank')
}
