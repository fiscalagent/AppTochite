import { NavLink, useNavigate } from 'react-router-dom'
import s from './BottomNav.module.css'

export default function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className={s.nav}>
      <NavLink to="/" end className={({ isActive }) => `${s.tab} ${isActive ? s.active : ''}`}>
        <span className={s.tabIcon}>👥</span>
        <span>Клиенты</span>
      </NavLink>

      <button className={s.addBtn} onClick={() => navigate('/sharpenings/new')}>
        + Заточка
      </button>

      <NavLink to="/history" className={({ isActive }) => `${s.tab} ${isActive ? s.active : ''}`}>
        <span className={s.tabIcon}>📋</span>
        <span>История</span>
      </NavLink>

      <NavLink to="/reference/stones" className={({ isActive }) => `${s.tab} ${isActive ? s.active : ''}`}>
        <span className={s.tabIcon}>🔧</span>
        <span>Справочник</span>
      </NavLink>
    </nav>
  )
}
