// В APK-сборке (`vite build --mode capacitor`) голос выключен — Web Speech API в
// Android WebView отсутствует, тумблер только мешал бы. Облако (Яндекс.Диск)
// работает и в APK: REST-вызовы Диска origin-независимы, а OAuth-токен в WebView
// добывается через встроенный браузер с перехватом redirect (см. cloudAuthNative.ts).
// Vite статически подставляет import.meta.env.MODE → нативные ветки отсекаются из
// PWA-бандла (MODE='production'), PWA-флоу не трогается.
const isCapacitorBuild = import.meta.env.MODE === 'capacitor'

export const FEATURES = {
  voiceInput: !isCapacitorBuild, // мастер-выключатель для разработчика
  cloudBackup: true, // Яндекс.Диск — облачный бэкап (в APK через нативный OAuth)
}

// Баннер миграции PWA→APK (Ф3). Тёмный код: по умолчанию выключен, чтобы живые
// PWA-юзеры его не видели, пока APK не готов. Коммит запуска 2.0.0 (Ф7) флипнет
// дефолт в true. До запуска включается на устройстве для теста ключом
// localStorage 'migration_prompt'='true'. В самой APK-сборке мигрировать некуда.
const MIGRATION_PROMPT_DEFAULT = false

export function isMigrationPromptEnabled(): boolean {
  if (isCapacitorBuild) return false
  return MIGRATION_PROMPT_DEFAULT || localStorage.getItem('migration_prompt') === 'true'
}

const VOICE_STORAGE_KEY = 'voice_input_enabled'

// Голосовой ввод включён по умолчанию. В localStorage пишем только явное
// отключение ('false'); отсутствие ключа трактуется как «включено».
export function isVoiceEnabled(): boolean {
  return FEATURES.voiceInput && localStorage.getItem(VOICE_STORAGE_KEY) !== 'false'
}

export function setVoiceEnabled(value: boolean): void {
  if (value) {
    localStorage.removeItem(VOICE_STORAGE_KEY)
  } else {
    localStorage.setItem(VOICE_STORAGE_KEY, 'false')
  }
}
