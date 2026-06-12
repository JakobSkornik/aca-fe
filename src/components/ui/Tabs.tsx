import React, { useState } from 'react'

export type TabDef = {
  key: string
  label: string
  content: React.ReactNode
}

type Props = {
  tabs: TabDef[]
  initialKey?: string
  className?: string
}

/** Simple tab strip; content area fills the remaining height. */
export const Tabs: React.FC<Props> = ({ tabs, initialKey, className = '' }) => {
  const [active, setActive] = useState(initialKey ?? tabs[0]?.key)
  const current = tabs.find((t) => t.key === active) ?? tabs[0]

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border-tertiary bg-background-secondary px-1 pt-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === current?.key}
            onClick={() => setActive(t.key)}
            className={`rounded-t-md border border-b-0 px-2.5 py-1 text-[11px] font-medium transition-colors ${
              t.key === current?.key
                ? 'border-border-tertiary bg-background-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:bg-background-primary/60 hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-background-primary">{current?.content}</div>
    </div>
  )
}
