import React, { useEffect, useRef, useState } from 'react'
import Icon from '@/components/ui/Icon'

export type SelectOption = { value: string; label: string; hint?: string }

type Props = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
}

/** Click-to-open dropdown (template `.menu` chrome). Replaces native <select>,
 * which was swallowing click-to-open under our layout. */
const Select: React.FC<Props> = ({ value, options, onChange, className = '' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [open])

  return (
    <div className={`menu-wrap ${className}`} ref={ref}>
      <button
        type="button"
        className="btn w-full"
        style={{ justifyContent: 'space-between' }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <Icon name="chevDown" size={14} />
      </button>
      {open ? (
        <div className="menu" style={{ left: 0, right: 0, minWidth: 0 }} role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              style={o.value === value ? { background: 'var(--bg-3)' } : undefined}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{o.label}</span>
                {o.hint ? <span className="text-[10px] text-text-tertiary">{o.hint}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default Select
