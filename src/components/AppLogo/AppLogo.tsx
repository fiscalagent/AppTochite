import s from './AppLogo.module.css'

export default function AppLogo() {
  return (
    <div className={s.wrap}>
      <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
        <rect x="0" y="9" width="24" height="5" rx="2" fill="var(--text-200)" opacity="0.3"/>
        <path d="M0 9 L22 2 L24 5 L2 12 Z" fill="var(--accent)" opacity="0.7"/>
      </svg>
      <span><span className={s.textApp}>App</span><span className={s.textTochite}>Tochite</span></span>
    </div>
  )
}
