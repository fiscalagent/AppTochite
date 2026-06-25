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

// Баннер миграции PWA→APK (Ф3). Включён с релиза 2.0.0 (Ф7) — APK готов и
// опубликован, живым PWA-юзерам показываем приглашение поставить приложение и
// перенести данные бэкапом. Можно временно отключить на устройстве ключом
// localStorage 'migration_prompt'='false'. В самой APK-сборке мигрировать некуда.
const MIGRATION_PROMPT_DEFAULT = true

export function isMigrationPromptEnabled(): boolean {
  if (isCapacitorBuild) return false
  const override = localStorage.getItem('migration_prompt')
  if (override === 'true') return true
  if (override === 'false') return false
  return MIGRATION_PROMPT_DEFAULT
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
