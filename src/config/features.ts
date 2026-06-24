// В сборке для APK (`vite build --mode capacitor`) голос и облако выключены:
//   • голос — Web Speech API в Android WebView отсутствует, тумблер только мешал бы;
//   • облако — Яндекс-OAuth в WebView приедет отдельным релизом (2.1.0), миграция v1
//     идёт файлом. Vite статически подставляет import.meta.env.MODE → ветки
//     отсекаются из cap-бандла, PWA-сборку (MODE='production') не трогает.
const isCapacitorBuild = import.meta.env.MODE === 'capacitor'

export const FEATURES = {
  voiceInput: !isCapacitorBuild, // мастер-выключатель для разработчика
  cloudBackup: !isCapacitorBuild, // Яндекс.Диск — облачный бэкап
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
