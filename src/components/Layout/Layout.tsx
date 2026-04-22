import { Outlet } from 'react-router-dom'
import BottomNav from '../BottomNav/BottomNav'
import s from './Layout.module.css'

export default function Layout() {
  return (
    <div className={s.root}>
      <main className={s.content}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
