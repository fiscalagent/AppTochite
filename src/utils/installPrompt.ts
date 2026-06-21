import { track, trackOnce, baseContext } from '../services/analytics'

// Тонкий слой над событиями установки PWA. Слушатели вешаются один раз при
// импорте модуля (side-effect-импорт из main.tsx), потому что beforeinstallprompt
// браузер может выстрелить ещё до монтирования React.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const subscribers = new Set<(canInstall: boolean) => void>()

function notify() {
  for (const fn of subscribers) fn(deferred != null)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // не показываем дефолтный мини-баннер — даём свою кнопку
    deferred = e as BeforeInstallPromptEvent
    trackOnce('install_promptable', baseContext())
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferred = null
    track('app_installed', baseContext()).catch(() => {})
    notify()
  })
}

export function getCanInstall(): boolean {
  return deferred != null
}

// Подписка для React-хука; возвращает функцию отписки.
export function subscribe(fn: (canInstall: boolean) => void): () => void {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

// Показ системного диалога установки + замер исхода воронки.
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  track('install_prompt_shown', baseContext()).catch(() => {})
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  track('install_choice', { outcome }).catch(() => {})
  deferred = null // повторно один и тот же event использовать нельзя
  notify()
  return outcome
}
