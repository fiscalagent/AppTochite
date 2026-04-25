export const PHOTO_COMPRESS_KEY = 'photo-compression'

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
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) processFile(file, onDone)
  }
  input.click()
}

export function useCamera() {
  function openCamera(onDone: (b64: string) => void) {
    pickFile(true, onDone)
  }

  function openGallery(onDone: (b64: string) => void) {
    pickFile(false, onDone)
  }

  return { openCamera, openGallery }
}
