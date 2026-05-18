import s from './DictationCandidates.module.css'

interface Props {
  label: string
  items: string[]
  onPick: (item: string) => void
  onClose: () => void
}

export default function DictationCandidates({ label, items, onPick, onClose }: Props) {
  return (
    <div className={s.panel}>
      <div className={s.header}>
        <span className={s.title}>Уточни: {label}</span>
        <button className={s.close} type="button" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <ol className={s.list}>
        {items.map((item, i) => (
          <li key={item}>
            <button type="button" className={s.itemBtn} onClick={() => onPick(item)}>
              <span className={s.num}>{i + 1}.</span>
              <span className={s.name}>{item}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
