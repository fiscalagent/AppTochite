let count = 0

export function startBlur() {
  count++
  document.body.classList.add('has-modal')
}

export function stopBlur() {
  count = Math.max(0, count - 1)
  if (count === 0) document.body.classList.remove('has-modal')
}
