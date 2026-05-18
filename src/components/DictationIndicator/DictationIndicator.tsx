import s from './DictationIndicator.module.css'

interface Props {
  lastTranscript: string
}

export default function DictationIndicator({ lastTranscript }: Props) {
  return (
    <div className={s.row} role="status" aria-live="polite">
      <span className={s.dot} />
      <span className={s.label}>Слышу:</span>
      <span className={s.transcript}>{lastTranscript || '…'}</span>
    </div>
  )
}
