// Универсальная плюрализация через встроенный Intl.PluralRules — корректна и для
// русского (one/few/many/other), и для английского (one/other). Заменяет ручной
// pluralRu и работает для любой локали без своих таблиц.
//
//   plural('ru', n, { one:'заточка', few:'заточки', many:'заточек' })
//
// Подстановка числа: символ '#' в форме заменяется на n.
//   plural('en', n, { one:'# knife', other:'# knives' })

import type { Locale } from './locale'
import { localeTag } from './locale'

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>

// Кэш PluralRules по локали — конструктор Intl нетривиально дорогой.
const rulesCache = new Map<Locale, Intl.PluralRules>()

function getRules(locale: Locale): Intl.PluralRules {
  let r = rulesCache.get(locale)
  if (!r) {
    r = new Intl.PluralRules(localeTag(locale))
    rulesCache.set(locale, r)
  }
  return r
}

export function plural(locale: Locale, n: number, forms: PluralForms): string {
  const category = getRules(locale).select(n)
  const form = forms[category] ?? forms.other ?? ''
  return form.replace('#', String(n))
}
