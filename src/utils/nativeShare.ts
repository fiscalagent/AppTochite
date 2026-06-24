// Нативный шаринг файлов в APK через @capacitor/share. В Android WebView
// navigator.share с файлами не поддерживается, а <a download> молча не работает —
// поэтому в cap-сборке фото/отчёты уходят системным «Поделиться».
//
// Share-плагин принимает только file-URI (не Blob/dataURL), поэтому каждый файл
// сначала пишем во временную cache-папку через @capacitor/filesystem и берём его
// URI (FileProvider настроен: cache-path в file_paths.xml, authorities в манифесте).
//
// Оба плагина импортируются динамически и вызываются только из ветки
// `import.meta.env.MODE === 'capacitor'` → в PWA-сборке Rollup вырезает и хелпер,
// и chunk'и плагинов (бандл не растёт).

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1)) // отрезаем «data:...;base64,»
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Стейджит файлы в cache и вызывает системное «Поделиться». Бросает при отмене
// пользователем — вызывающий код ловит так же, как web-cancel.
export async function shareFilesNative(
  files: File[],
  opts: { title?: string; text?: string } = {},
): Promise<void> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')

  const uris: string[] = []
  for (const file of files) {
    const data = await blobToBase64(file)
    await Filesystem.writeFile({ path: file.name, data, directory: Directory.Cache })
    const { uri } = await Filesystem.getUri({ path: file.name, directory: Directory.Cache })
    uris.push(uri)
  }

  await Share.share({ ...opts, files: uris })
}
