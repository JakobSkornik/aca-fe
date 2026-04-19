import React from 'react'

type TopBarProps = {
  subtitle?: React.ReactNode
  right?: React.ReactNode
  onLogoClick?: () => void
  className?: string
}

export function TopBar({ subtitle, right, onLogoClick, className = '' }: TopBarProps) {
  return (
    <header
      className={`flex shrink-0 items-center justify-between border-b border-border-tertiary bg-background-primary px-4 py-2.5 ${className}`}
    >
      <button
        type="button"
        onClick={onLogoClick}
        className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent p-0 text-left hover:opacity-90"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-background-secondary text-base text-text-secondary">
          ♟
        </span>
        <span>
          <span className="block text-[15px] font-medium text-text-primary">Chess Annotator</span>
          {subtitle != null ? (
            <span className="mt-0.5 block text-xs text-text-tertiary">{subtitle}</span>
          ) : null}
        </span>
      </button>
      {right != null ? <div className="flex items-center gap-2">{right}</div> : null}
    </header>
  )
}

export default TopBar
