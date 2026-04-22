import s from './Avatar.module.css'

interface Props {
  name: string
  size?: number
}

export default function Avatar({ name, size = 40 }: Props) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={s.avatar}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}
