import React, { useState } from 'react'

type Props = {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

/** Collapsible section (wireframe `sub-toggle` / `sub-content`). */
export function AccordionRow({ label, defaultOpen = false, children, className = '' }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer select-none items-center gap-1 py-0.5 text-left text-[10px] text-text-tertiary hover:text-text-secondary"
      >
        <span className="inline-block w-3 shrink-0">{open ? '▾' : '▸'}</span>
        {label}
      </button>
      {open ? (
        <div className="mt-1 rounded border border-border-tertiary bg-background-secondary p-1.5 text-[10px] leading-snug text-text-secondary">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default AccordionRow
