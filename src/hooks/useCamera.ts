export const PHOTO_COMPRESS_KEY = 'photo-compression'

export function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const size = 300
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      canvas.getContext('2d')!.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject() }
    img.src = url
  })
}

export function pickAvatarFile(capture: boolean, onDone: (b64: string) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  if (capture) input.setAttribute('capture', 'environment')
  input.style.display = 'none'
  document.body.appendChild(input)
  const cleanup = () => {
    if (document.body.contains(input)) document.body.removeChild(input)
  }
  input.onchange = () => {
    const file = input.files?.[0]
    cleanup()
    if (!file) return
    resizeAvatar(file)
      .then(onDone)
      .catch(() => {
        const reader = new FileReader()
        reader.onload = () => onDone(reader.result as string)
        reader.readAsDataURL(file)
      })
  }
  input.addEventListener('cancel', cleanup)
  input.click()
}

function resizeImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

function processFile(file: File, onDone: (b64: string) => void) {
  const compressed = localStorage.getItem(PHOTO_COMPRESS_KEY) === 'on'
  const quality = compressed ? 0.65 : 0.82
  const maxWidth = compressed ? 1280 : 1920
  resizeImage(file, maxWidth, quality)
    .then(onDone)
    .catch(() => {
      const reader = new FileReader()
      reader.onload = () => onDone(reader.result as string)
      reader.readAsDataURL(file)
    })
}

function pickFile(capture: boolean, onDone: (b64: string) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  if (capture) input.setAttribute('capture', 'environment')
  input.style.display = 'none'
  // Must be in DOM for Android WebView to deliver the camera result without crashing.
  document.body.appendChild(input)
  const cleanup = () => {
    if (document.body.contains(input)) document.body.removeChild(input)
  }
  input.onchange = () => {
    const file = input.files?.[0]
    cleanup()
    if (file) processFile(file, onDone)
  }
  // Clean up if the user cancels without selecting a file.
  input.addEventListener('cancel', cleanup)
  input.click()
}

// В APK (`--mode capacitor`) фото берём нативным @capacitor/camera, а не <input
// type=file>: системная камера/Photo Picker вместо «выбери приложение». Плагин
// импортируется динамически и только в этой ветке — в PWA-сборке (MODE='production')
// условие сворачивается в false, Rollup вырезает и ветку, и chunk плагина, бандл не
// растёт. Результат прогоняется через тот же processFile → сжатие идентично web.
const IS_CAPACITOR = import.meta.env.MODE === 'capacitor'

async function nativeGetPhoto(source: 'camera' | 'gallery', onDone: (b64: string) => void) {
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.DataUrl,
      quality: 90,
      allowEditing: false,
      correctOrientation: true,
    })
    if (!photo.dataUrl) return
    const blob = await (await fetch(photo.dataUrl)).blob()
    const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
    processFile(file, onDone)
  } catch {
    // Отмена пользователем или отказ в разрешении — тихо игнорируем, как web-cancel.
  }
}

export function useCamera() {
  function openCamera(onDone: (b64: string) => void) {
    if (IS_CAPACITOR) return void nativeGetPhoto('camera', onDone)
    pickFile(true, onDone)
  }

  function openGallery(onDone: (b64: string) => void) {
    if (IS_CAPACITOR) return void nativeGetPhoto('gallery', onDone)
    pickFile(false, onDone)
  }

  return { openCamera, openGallery }
}
