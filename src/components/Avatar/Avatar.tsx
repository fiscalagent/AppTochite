import s from './Avatar.module.css'

interface Props {
  name: string
  size?: number
  isSelf?: boolean
}

export default function Avatar({ name, size = 40, isSelf = false }: Props) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const crownSize = Math.round(size * 0.42)

  return (
    <div
      className={s.wrapper}
      style={{ width: size, height: size }}
    >
      <div
        className={s.avatar}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
      {isSelf && (
        <svg
          className={s.crown}
          width={crownSize}
          height={crownSize}
          viewBox="0 0 24 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: crownSize, height: crownSize }}
        >
          <path
            d="M2 16 L4 8 L9 13 L12 4 L15 13 L20 8 L22 16 Z"
            fill="#F5C518"
            stroke="#C8960C"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <rect x="2" y="16" width="20" height="3" rx="1" fill="#F5C518" stroke="#C8960C" strokeWidth="1.2" />
          <circle cx="2" cy="16" r="1.5" fill="#C8960C" />
          <circle cx="12" cy="4" r="1.5" fill="#C8960C" />
          <circle cx="22" cy="16" r="1.5" fill="#C8960C" />
        </svg>
      )}
    </div>
  )
}
