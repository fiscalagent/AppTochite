import { useState, useRef } from 'react'
import s from './Autocomplete.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  autoFocus?: boolean
  onSelect?: (value: string) => void
}

export default function Autocomplete({ value, onChange, suggestions, placeholder, autoFocus, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const lastTapRef = useRef<{ item: string; time: number } | null>(null)

  const filtered = value.length > 0
    ? suggestions.filter(item => item.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : []

  const visible = open && filtered.length > 0

  function handleSelect(item: string) {
    onChange(item)
    onSelect?.(item)
    setOpen(false)
  }

  function handleItemPointerDown(e: React.PointerEvent, item: string) {
    e.preventDefault()
    const now = Date.now()
    if (lastTapRef.current && lastTapRef.current.item === item && now - lastTapRef.current.time < 300) {
      handleSelect(item)
      lastTapRef.current = null
    } else {
      lastTapRef.current = { item, time: now }
    }
  }

  return (
    <div className={s.wrap}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSelect?.(value); setOpen(false) } }}
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
              onPointerDown={e => handleItemPointerDown(e, item)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
