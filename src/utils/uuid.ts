// Единый генератор uuid с фолбэком для сред без crypto.randomUUID
// (старые Android WebView). Используется для guid записей и batchId корзины.
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'u-' + Date.now().toString(36) + '-' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
}
