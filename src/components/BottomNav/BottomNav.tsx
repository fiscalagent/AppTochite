import { NavLink, useNavigate } from 'react-router-dom'
import s from './BottomNav.module.css'

const IconClients = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconHistory = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <polyline points="12 7 12 12 15 14"/>
  </svg>
)

const IconReference = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="8" height="8" rx="1.5"/>
    <rect x="14" y="3" width="8" height="8" rx="1.5"/>
    <rect x="2" y="15" width="8" height="8" rx="1.5"/>
    <rect x="14" y="15" width="8" height="8" rx="1.5"/>
  </svg>
)

const IconPlus = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

export default function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className={s.nav}>
      <NavLink to="/" end className={({ isActive }) => `${s.tab} ${isActive ? s.active : ''}`}>
        <span className={s.tabIcon}><IconClients /></span>
        <span className={s.tabLabel}>Клиенты</span>
      </NavLink>

      <div className={s.fabSlot}>
        <button className={s.fab} onClick={() => navigate('/sharpenings/new')} aria-label="Новая заточка">
          <IconPlus />
        </button>
        <span className={s.fabLabel}>Заточка</span>
      </div>

      <NavLink to="/history" className={({ isActive }) => `${s.tab} ${isActive ? s.active : ''}`}>
        <span className={s.tabIcon}><IconHistory /></span>
        <span className={s.tabLabel}>История</span>
      </NavLink>

      <NavLink to="/reference/stones" className={({ isActive }) => `${s.tab} ${isActive ? s.active : ''}`}>
        <span className={s.tabIcon}><IconReference /></span>
        <span className={s.tabLabel}>Справочник</span>
      </NavLink>
    </nav>
  )
}
