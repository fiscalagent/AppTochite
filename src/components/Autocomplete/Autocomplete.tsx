import { useState, useRef } from 'react'
import s from './Autocomplete.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  autoFocus?: boolean
  onSelect?: (value: string) => void
  micButton?: React.ReactNode
}

export default function Autocomplete({ value, onChange, suggestions, placeholder, autoFocus, onSelect, micButton }: Props) {
  const [open, setOpen] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const filtered = value.length > 0
    ? suggestions.filter(item => {
        const lower = item.toLowerCase()
        return value.toLowerCase().split(/\s+/).filter(Boolean).every(tok => lower.includes(tok))
      }).slice(0, 8)
    : []

  const visible = open && filtered.length > 0

  function handleSelect(item: string) {
    onChange(item)
    onSelect?.(item)
    setOpen(false)
  }

  return (
    <div className={s.wrap}>
      <div className={micButton ? s.inputWrap : undefined}>
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSelect?.(value); setOpen(false) } }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className={micButton ? s.inputWithMic : undefined}
        />
        {micButton}
      </div>
      {visible && (
        <div className={s.dropdown}>
          {filtered.map(item => (
            <div
              key={item}
              className={s.item}
              onPointerDown={e => { e.preventDefault(); touchStartRef.current = { x: e.clientX, y: e.clientY } }}
              onPointerUp={e => {
                if (!touchStartRef.current) return
                const dx = Math.abs(e.clientX - touchStartRef.current.x)
                const dy = Math.abs(e.clientY - touchStartRef.current.y)
                if (dx < 8 && dy < 8) handleSelect(item)
                touchStartRef.current = null
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

