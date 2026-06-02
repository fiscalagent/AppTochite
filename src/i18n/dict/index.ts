// Карта словарей по локали. Тип Dict выводится из русского словаря — он эталон
// формы. Английский словарь (Фаза 2) обязан удовлетворять `Dict`, иначе TS
// сообщит о пропущенных/лишних ключах.

import type { Locale } from '../locale'
import { ru } from './ru'

export type Dict = typeof ru

// На Фазе 1 доступен только русский. Английский добавится сюда как `en` после
// перевода. dicts намеренно НЕ полный Record<Locale, Dict> — провайдер делает
// фолбэк на ru для ещё не добавленных локалей.
export const dicts: Partial<Record<Locale, Dict>> = {
  ru,
}

export { ru }
