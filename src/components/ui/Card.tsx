import React from 'react'

type CardProps = {
  title?: React.ReactNode
  headerRight?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  headerClassName?: string
  titleClassName?: string
  /** When false, omit header row entirely */
  showHeader?: boolean
}

/**
 * Rounded panel with title bar + bottom border divider + body (wireframe `.card`).
 */
export function Card({
  title,
  headerRight,
  children,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  titleClassName = '',
  showHeader = true,
}: CardProps) {
  const hasHeader = showHeader && (title != null || headerRight != null)

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border-tertiary bg-background-primary ${className}`}
    >
      {hasHeader ? (
        <div
          className={`flex shrink-0 items-center justify-between border-b border-border-tertiary px-3.5 py-2.5 ${headerClassName}`}
        >
          {title != null ? (
            <span className={`text-xs font-medium text-text-primary ${titleClassName}`}>{title}</span>
          ) : (
            <span />
          )}
          {headerRight != null ? <div className="flex items-center gap-2">{headerRight}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}

export default Card
