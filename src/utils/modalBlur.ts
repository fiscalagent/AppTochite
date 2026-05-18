// Token-based blur: каждый вызов startBlur() получает свой токен и возвращает
// идемпотентную стоп-функцию. Двойной stop одного и того же токена ничего не
// делает; забытый stop удерживает блюр — но не ломает счётчик у других вызовов.

const active = new Set<symbol>()

function getRoot(): HTMLElement | null {
  return document.getElementById('root')
}

function applyBlur() {
  const root = getRoot()
  if (!root) return
  root.style.transition = 'filter 0.2s'
  root.style.filter = 'blur(5px)'
  root.style.pointerEvents = 'none'
  root.style.userSelect = 'none'
}

function clearBlur() {
  const root = getRoot()
  if (!root) return
  root.style.filter = ''
  root.style.pointerEvents = ''
  root.style.userSelect = ''
}

export function startBlur(): () => void {
  const token = Symbol()
  active.add(token)
  applyBlur()
  return () => {
    if (!active.delete(token)) return
    if (active.size === 0) clearBlur()
  }
}
