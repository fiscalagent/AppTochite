import s from './BackupCriticalBanner.module.css'

interface Props {
  daysSince: number | null
}

export default function BackupCriticalBanner({ daysSince }: Props) {
  // BackupReminder монтируется снаружи RouterProvider, поэтому useNavigate/useLocation недоступны.
  // location.pathname читаем напрямую и сравниваем без basename.
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  if (pathname.endsWith('/backup')) return null

  const text = daysSince === null
    ? 'Бэкап ни разу не делался. Высокий риск потери данных.'
    : `Бэкап не делался ${daysSince} ${daysWord(daysSince)}. Высокий риск потери данных.`

  const href = `${import.meta.env.BASE_URL}backup`

  return (
    <a className={s.banner} href={href}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span className={s.text}>{text}</span>
      <span className={s.cta}>Открыть</span>
    </a>
  )
}

function daysWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня'
  return 'дней'
}
