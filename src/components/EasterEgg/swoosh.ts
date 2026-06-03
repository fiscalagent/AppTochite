// Звук взмаха клинка для пасхалки — синтезируется на лету через Web Audio API,
// чтобы не тащить бинарный ассет и не возиться с лицензией на сэмпл.
// Это band-pass-фильтрованный белый шум с быстрым свипом частоты вверх-вниз
// (эффект «вззз») и резкой огибающей атака/затухание.
export function playSwoosh(delaySec = 0): () => void {
  const AC = window.AudioContext ?? (window as unknown as {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!AC) return () => {}

  let ctx: AudioContext
  try {
    ctx = new AC()
  } catch {
    return () => {}
  }
  // AudioContext создаётся внутри пользовательского жеста (7 тапов), так что
  // resume() обычно не нужен, но на всякий случай.
  ctx.resume?.()

  const dur = 0.42
  const start = ctx.currentTime + delaySec

  // буфер белого шума
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  const src = ctx.createBufferSource()
  src.buffer = buffer

  // band-pass со свипом частоты — характерный свистящий «вжух»
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 2.6
  bp.frequency.setValueAtTime(650, start)
  bp.frequency.exponentialRampToValueAtTime(3800, start + 0.16)
  bp.frequency.exponentialRampToValueAtTime(800, start + dur)

  // огибающая громкости: резкая атака, быстрый спад
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.62, start + 0.07)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)

  src.connect(bp).connect(gain).connect(ctx.destination)
  src.start(start)
  src.stop(start + dur)
  src.onended = () => ctx.close().catch(() => {})

  // отмена/очистка, если оверлей закрыли раньше времени
  return () => {
    try { src.stop() } catch { /* уже остановлен */ }
    ctx.close().catch(() => {})
  }
}
