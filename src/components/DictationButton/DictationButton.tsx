import { useT } from '../../i18n'
import s from './DictationButton.module.css'

const IconMic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

interface Props {
  isAvailable: boolean
  isActive: boolean
  onToggle: () => void
}

export default function DictationButton({ isAvailable, isActive, onToggle }: Props) {
  const t = useT()

  if (!isAvailable) {
    return (
      <button
        className={`${s.btn} ${s.disabled}`}
        disabled
        title={t.components.voiceOffline}
        type="button"
      >
        <IconMic />
        <span>{t.components.voiceDictation}</span>
      </button>
    )
  }

  return (
    <button
      className={`${s.btn} ${isActive ? s.active : ''}`}
      onClick={onToggle}
      title={isActive ? t.components.voiceStopDictation : t.components.voiceStartDictation}
      type="button"
    >
      <IconMic />
      <span>{isActive ? t.components.voiceListening : t.components.voiceDictation}</span>
    </button>
  )
}
