// AppTochite — CORS-прокси для скачивания бэкапа с Яндекс.Диска.
//
// Зачем: файловые серверы Яндекса (downloader.disk.yandex.ru → шард *.storage.yandex.net)
// не отдают CORS-заголовки, поэтому браузер не может прочитать тело файла напрямую
// (TypeError: Failed to fetch). Этот Worker качает файл серверно (CORS на сервер не
// распространяется) и отдаёт его приложению с нужным заголовком.
//
// Что он видит: только короткоживущую ПОДПИСАННУЮ ссылку на один файл — БЕЗ OAuth-токена,
// без доступа к Диску. Не хранит и не логирует (Cloudflare может кэшировать на edge).
//
// Деплой: Cloudflare → Workers & Pages → Create Worker → вставить этот код → Deploy.
// URL вида https://cloud-proxy.<account>.workers.dev положить в GitHub Secret
// VITE_CLOUD_PROXY_URL.

// Домен приложения — кто имеет право пользоваться прокси. Поменяйте при смене хостинга.
const ALLOWED_ORIGIN = 'https://fiscalagent.github.io'

// Куда разрешено проксировать — только файловые хосты Яндекс.Диска, чтобы это не стал
// открытый релей «качай что угодно».
const ALLOWED_HOST = /(^|\.)(disk\.yandex\.ru|storage\.yandex\.net)$/

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }
    if (request.method !== 'GET') {
      return new Response('method not allowed', { status: 405, headers: cors })
    }

    const target = new URL(request.url).searchParams.get('url')
    if (!target) {
      return new Response('missing ?url', { status: 400, headers: cors })
    }

    let host
    try {
      host = new URL(target).hostname
    } catch {
      return new Response('bad url', { status: 400, headers: cors })
    }
    if (!ALLOWED_HOST.test(host)) {
      return new Response('forbidden host', { status: 403, headers: cors })
    }

    let upstream
    try {
      upstream = await fetch(target, { redirect: 'follow' })
    } catch {
      return new Response('upstream fetch failed', { status: 502, headers: cors })
    }

    // Поток без буферизации — большие бэкапы (фото) проходят без нагрузки на CPU.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    })
  },
}
