export const FEATURES = {
  voiceInput: true, // мастер-выключатель для разработчика
}

const VOICE_STORAGE_KEY = 'voice_input_enabled'

export function isVoiceEnabled(): boolean {
  return FEATURES.voiceInput && localStorage.getItem(VOICE_STORAGE_KEY) === 'true'
}

export function setVoiceEnabled(value: boolean): void {
  if (value) {
    localStorage.setItem(VOICE_STORAGE_KEY, 'true')
  } else {
    localStorage.removeItem(VOICE_STORAGE_KEY)
  }
}
