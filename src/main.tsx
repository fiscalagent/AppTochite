import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/reset.css'
import App from './App'
import { seedDatabase } from './db/seed'
import { maybeCreatePreMigrationSnapshot } from './db/preMigrationSnapshot'
import { track } from './services/analytics'
import './utils/installPrompt' // side-effect: слушатели beforeinstallprompt/appinstalled

// When a new Service Worker takes control (new app version deployed),
// reload immediately so the new JS bundle and Dexie migrations run cleanly.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

// Глобальные обработчики ошибок → телеметрия. Троттлим, чтобы шторм исключений
// (например, цикл) не залил очередь сотнями одинаковых строк.
let lastErrorAt = 0
function reportError(name: string, message: string) {
  const now = Date.now()
  if (now - lastErrorAt < 10_000) return
  lastErrorAt = now
  track('error', { name, message: message.slice(0, 300), screen: location.hash || location.pathname })
    .catch(() => {})
}
window.addEventListener('error', (e) => reportError('window.error', e.message))
window.addEventListener('unhandledrejection', (e) =>
  reportError('unhandledrejection', String((e.reason as { message?: string })?.message ?? e.reason)),
)

async function bootstrap() {
  // Если в IndexedDB версия схемы ниже кодовой — снапшот ДО открытия Dexie.
  // Страховка от ошибок в наших миграциях. Сбои логируются, старт не блокируют.
  await maybeCreatePreMigrationSnapshot()
  seedDatabase().catch(err => console.error('[AppTochite] seed failed:', err))
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
