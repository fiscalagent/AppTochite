let count = 0

function getRoot(): HTMLElement | null {
  return document.getElementById('root')
}

export function startBlur() {
  count++
  const root = getRoot()
  if (root) {
    root.style.transition = 'filter 0.2s'
    root.style.filter = 'blur(5px)'
    root.style.pointerEvents = 'none'
    root.style.userSelect = 'none'
  }
}

export function stopBlur() {
  count = Math.max(0, count - 1)
  if (count === 0) {
    const root = getRoot()
    if (root) {
      root.style.filter = ''
      root.style.pointerEvents = ''
      root.style.userSelect = ''
    }
  }
}
