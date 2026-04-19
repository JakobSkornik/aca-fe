import React from 'react'

type Props = {
  backendOk: boolean | null
  className?: string
  showLabel?: boolean
}

function statusTitle(backendOk: boolean | null): string {
  if (backendOk === null) return 'Checking backend status…'
  if (backendOk) return 'Backend is up and running.'
  return 'Backend is not reachable.'
}

const BackendHealthIndicator: React.FC<Props> = ({
  backendOk,
  className = '',
  showLabel = true,
}) => {
  const title = statusTitle(backendOk)
  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-border-tertiary bg-background-secondary px-2.5 py-1 text-xs text-text-secondary ${className}`}
      title={title}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
          backendOk === null
            ? 'bg-text-tertiary'
            : backendOk
              ? 'bg-emerald-500'
              : 'bg-red-500'
        }`}
      />
      {showLabel ? (
        <span className="font-medium">
          {backendOk === null ? 'API checking…' : backendOk ? 'API online' : 'API offline'}
        </span>
      ) : null}
    </div>
  )
}

export default BackendHealthIndicator
