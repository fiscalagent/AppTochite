import { useT } from '../../i18n'
import s from './BackupCriticalBanner.module.css'

interface Props {
  daysSince: number | null
}

export default function BackupCriticalBanner({ daysSince }: Props) {
  const t = useT()
  // BackupReminder монтируется снаружи RouterProvider, поэтому useNavigate/useLocation недоступны.
  // location.pathname читаем напрямую и сравниваем без basename.
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  if (pathname.endsWith('/backup')) return null

  const text = daysSince === null
    ? t.components.backupNeverDone
    : t.components.backupNotDoneFor(daysSince)

  const href = `${import.meta.env.BASE_URL}backup`

  return (
    <a className={s.banner} href={href}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span className={s.text}>{text}</span>
      <span className={s.cta}>{t.components.bannerOpen}</span>
    </a>
  )
}
