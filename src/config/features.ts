export const FEATURES = {
  voiceInput: true, // мастер-выключатель для разработчика
  cloudBackup: true, // Яндекс.Диск — облачный бэкап
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
