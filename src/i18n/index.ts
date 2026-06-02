// Barrel: единая точка импорта i18n. Чистые ре-экспорты, без определения
// компонентов — иначе react-refresh ругается на смешение.

export { LocaleProvider, useLocale, useT, enumLabel } from './LocaleProvider'
export { plural } from './plural'
export { fmtDate, fmtDateTime, fmtMoney, fmtNumber } from './format'
export {
  type Locale,
  LOCALES,
  AVAILABLE_LOCALES,
  localeTag,
  detectDefaultLocale,
} from './locale'
export { type Dict, dicts, ru } from './dict'
