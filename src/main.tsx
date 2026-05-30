import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/reset.css'
import App from './App'
import { seedDatabase } from './db/seed'
import { maybeCreatePreMigrationSnapshot } from './db/preMigrationSnapshot'

// When a new Service Worker takes control (new app version deployed),
// reload immediately so the new JS bundle and Dexie migrations run cleanly.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

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
