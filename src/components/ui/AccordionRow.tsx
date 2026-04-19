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
        className="flex w-full cursor-pointer select-none items-center gap-1 rounded border border-border-tertiary bg-background-secondary px-1.5 py-1 text-left text-[10px] font-medium text-text-primary hover:border-accent-progress/50 hover:bg-background-primary"
      >
        <span className="inline-block w-3 shrink-0 text-accent-progress">{open ? '▾' : '▸'}</span>
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
