import React from 'react'

export type StatusBadgeVariant =
  | 'waiting'
  | 'processing'
  | 'engine'
  | 'ready'
  | 'failed'
  | 'neutral'

const variantClass: Record<StatusBadgeVariant, string> = {
  waiting: 'bg-background-warning text-text-warning',
  processing: 'bg-background-info text-text-info',
  engine: 'bg-background-info text-text-info',
  ready: 'bg-background-success text-text-success',
  failed: 'bg-background-danger text-text-danger',
  neutral: 'bg-background-secondary text-text-secondary',
}

type Props = {
  variant: StatusBadgeVariant
  children: React.ReactNode
  className?: string
}

export function StatusBadge({ variant, children, className = '' }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${variantClass[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export default StatusBadge
