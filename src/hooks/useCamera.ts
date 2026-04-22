// Ресайзит изображение до maxWidth, возвращает base64 jpeg
function resizeImage(file: File, maxWidth = 1200): Promise<string> {
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
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

export function useCamera() {
  function takePhoto(onDone: (base64: string) => void) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.setAttribute('capture', 'environment')

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const base64 = await resizeImage(file)
        onDone(base64)
      } catch {
        // если ресайз не удался — берём оригинал
        const reader = new FileReader()
        reader.onload = () => onDone(reader.result as string)
        reader.readAsDataURL(file)
      }
    }

    input.click()
  }

  return { takePhoto }
}
