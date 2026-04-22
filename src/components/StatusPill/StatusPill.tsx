import type { SharpeningStatus } from '../../db/db'
import s from './StatusPill.module.css'

const LABELS: Record<SharpeningStatus, string> = {
  accepted: 'принят',
  inwork:   'в работе',
  done:     'готов',
}

interface Props {
  status: SharpeningStatus
}

export default function StatusPill({ status }: Props) {
  return (
    <span className={`${s.pill} ${s[status]}`}>
      {LABELS[status]}
    </span>
  )
}
