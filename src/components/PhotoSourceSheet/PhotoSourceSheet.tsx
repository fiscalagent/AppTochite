import s from './PhotoSourceSheet.module.css'

const IconCamera = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

const IconGallery = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
)

interface Props {
  onCamera: () => void
  onGallery: () => void
  onClose: () => void
}

export default function PhotoSourceSheet({ onCamera, onGallery, onClose }: Props) {
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.sheet} onClick={e => e.stopPropagation()}>
        <div className={s.handle} />
        <button className={s.option} onClick={() => { onCamera(); onClose() }}>
          <span className={s.icon}><IconCamera /></span>
          Сфотографировать
        </button>
        <button className={s.option} onClick={() => { onGallery(); onClose() }}>
          <span className={s.icon}><IconGallery /></span>
          Выбрать из галереи
        </button>
        <button className={s.cancel} onClick={onClose}>Отмена</button>
      </div>
    </div>
  )
}
