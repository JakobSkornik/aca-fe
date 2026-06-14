import React from 'react'
import Icon from '@/components/ui/Icon'
import { useTheme } from '@/helpers/useTheme'

type TopBarProps = {
  subtitle?: React.ReactNode
  right?: React.ReactNode
  onLogoClick?: () => void
  className?: string
}

export function TopBar({ subtitle, right, onLogoClick, className = '' }: TopBarProps) {
  const { theme, toggle } = useTheme()
  return (
    <header className={`ca-topbar ${className}`}>
      <div className="brand">
        <div
          className="brand-mark"
          role="button"
          tabIndex={0}
          onClick={onLogoClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onLogoClick?.()
          }}
          style={{ cursor: 'pointer' }}
        >
          {'♞︎'}
        </div>
        <div className="text-left">
          <div
            className="brand-title"
            role="button"
            tabIndex={0}
            onClick={onLogoClick}
            style={{ cursor: 'pointer' }}
          >
            Chess Annotator
          </div>
          {subtitle != null ? <div className="brand-sub mono">{subtitle}</div> : null}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn icon-btn" title="Toggle theme" onClick={toggle}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
      {right != null ? right : null}
    </header>
  )
}

export default TopBar
