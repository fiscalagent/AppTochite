// Карта словарей по локали. Тип Dict выводится из русского словаря — он эталон
// формы. Английский словарь (Фаза 2) обязан удовлетворять `Dict`, иначе TS
// сообщит о пропущенных/лишних ключах.

import type { Locale } from '../locale'
import { ru } from './ru'
import { en } from './en'

export type Dict = typeof ru

export const dicts: Partial<Record<Locale, Dict>> = {
  ru,
  en,
}

export { ru, en }
