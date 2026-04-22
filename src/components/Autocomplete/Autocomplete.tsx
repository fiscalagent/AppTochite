import { useState } from 'react'
import s from './Autocomplete.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  autoFocus?: boolean
}

export default function Autocomplete({ value, onChange, suggestions, placeholder, autoFocus }: Props) {
  const [open, setOpen] = useState(false)

  const filtered = value.length > 0
    ? suggestions.filter(item => item.toLowerCase().startsWith(value.toLowerCase())).slice(0, 8)
    : []

  const visible = open && filtered.length > 0

  return (
    <div className={s.wrap}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {visible && (
        <div className={s.dropdown}>
          {filtered.map(item => (
            <div
              key={item}
              className={s.item}
              onPointerDown={e => { e.preventDefault(); onChange(item); setOpen(false) }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
