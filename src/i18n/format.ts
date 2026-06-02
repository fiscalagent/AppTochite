// Локале-зависимое форматирование дат, времени и денег через Intl.
// Заменяет разрозненные toLocaleDateString('ru') по коду.

import type { Locale } from './locale'
import { localeTag } from './locale'

// Валюта по умолчанию для локали. ВНИМАНИЕ: для англоязычного рынка валюта —
// продуктовое решение (какая именно?), а не технический дефолт. Здесь — лишь
// заглушка, чтобы Intl не падал; реальное значение задаётся явным аргументом.
const DEFAULT_CURRENCY: Record<Locale, string> = {
  ru: 'RUB',
  en: 'USD',
}

function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d)
}

export function fmtDate(locale: Locale, d: Date | string | number): string {
  return new Intl.DateTimeFormat(localeTag(locale)).format(toDate(d))
}

export function fmtDateTime(locale: Locale, d: Date | string | number): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(toDate(d))
}

export function fmtMoney(locale: Locale, amount: number, currency?: string): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'currency',
    currency: currency ?? DEFAULT_CURRENCY[locale] ?? 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function fmtNumber(locale: Locale, n: number): string {
  return new Intl.NumberFormat(localeTag(locale)).format(n)
}

export function fmtDateShort(locale: Locale, d: Date | string | number): string {
  return new Intl.DateTimeFormat(localeTag(locale), { day: 'numeric', month: 'short' }).format(toDate(d))
}

export function fmtDateLong(locale: Locale, d: Date | string | number): string {
  return new Intl.DateTimeFormat(localeTag(locale), { day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(d))
}

export function fmtDateDayMonth(locale: Locale, d: Date | string | number): string {
  return new Intl.DateTimeFormat(localeTag(locale), { day: 'numeric', month: 'long' }).format(toDate(d))
}

export function fmtDateMonthYear(locale: Locale, d: Date | string | number): string {
  return new Intl.DateTimeFormat(localeTag(locale), { month: 'long', year: 'numeric' }).format(toDate(d))
}

export function fmtDateTimeLong(locale: Locale, d: Date | string | number): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(toDate(d))
}

export function fmtCurrencySymbol(locale: Locale): string {
  const currency = DEFAULT_CURRENCY[locale] ?? 'RUB'
  const parts = new Intl.NumberFormat(localeTag(locale), {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).formatToParts(0)
  return parts.find(p => p.type === 'currency')?.value ?? currency
}
