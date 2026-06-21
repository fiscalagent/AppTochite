// Реестр игр-тренажёров. Добавление новой игры = новая запись здесь + экран и
// маршрут в router.tsx. Хаб (GamesHub) и навигация строятся из этого массива,
// поэтому больше нигде править список не нужно.
import type { Dict } from '../../i18n'

export type GameDef = {
  id: string
  path: string
  // Берём title/subtitle из словаря по локали — подписи не хардкодим.
  title: (t: Dict) => string
  subtitle: (t: Dict) => string
  ready: boolean
}

export const GAMES: GameDef[] = [
  {
    id: 'progression',
    path: '/games/progression',
    title: t => t.game.title,
    subtitle: t => t.game.subtitle,
    ready: true,
  },
  {
    id: 'angle',
    path: '/games/angle',
    title: t => t.gameAngle.title,
    subtitle: t => t.gameAngle.subtitle,
    ready: true,
  },
]
