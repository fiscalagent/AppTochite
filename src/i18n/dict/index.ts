// Карта словарей по локали. Dict — структурный тип из русского словаря (Widened
// убирает буквальные строковые типы, оставляя только форму), поэтому английский
// словарь обязан иметь те же ключи и сигнатуры функций — иначе TS сообщит о
// пропущенных или лишних ключах.

import type { Locale } from '../locale'
import { ru } from './ru'
import { en } from './en'

// Рекурсивно заменяет string-литералы на string, сохраняя форму объекта и
// сигнатуры функций. Позволяет хранить переводы в dicts без ошибок TS2322.
type Widened<T> =
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends (...args: infer A) => infer R ? (...args: A) => R :
  T extends readonly (infer E)[] ? readonly Widened<E>[] :
  T extends object ? { readonly [K in keyof T]: Widened<T[K]> } :
  T

export type Dict = Widened<typeof ru>

export const dicts: Partial<Record<Locale, Dict>> = {
  ru,
  en,
}

export { ru, en }
