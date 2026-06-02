import type { SharpeningStatus } from '../../db/instance'
import { useT, enumLabel } from '../../i18n'
import s from './StatusPill.module.css'

interface Props {
  status: SharpeningStatus
}

export default function StatusPill({ status }: Props) {
  const t = useT()
  return (
    <span className={`${s.pill} ${s[status]}`}>
      {enumLabel(t.enums.status, status)}
    </span>
  )
}
