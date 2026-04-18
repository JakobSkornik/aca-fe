import React from 'react'

type Props = {
  /** From `useBackendHealth()` */
  backendOk: boolean | null
  /** Extra classes on the outer flex row */
  className?: string
  /** Show “API: online/offline…” text next to the dot */
  showLabel?: boolean
}

function statusTitle(backendOk: boolean | null): string {
  if (backendOk === null) return 'Checking backend status…'
  if (backendOk) return 'Backend is up and running.'
  return 'Backend is not reachable.'
}

/** Green / grey / red status dot with native hover tooltip + optional label */
const BackendHealthIndicator: React.FC<Props> = ({
  backendOk,
  className = '',
  showLabel = true,
}) => {
  const title = statusTitle(backendOk)
  return (
    <div
      className={`flex items-center gap-2 text-xs${className ? ` ${className}` : ''}`}
      title={title}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <span
        className={`inline-block h-4 w-4 shrink-0 cursor-help rounded-full shadow-sm ring-2 ring-offset-2 ring-offset-lightest-gray ${
          backendOk === null
            ? 'bg-gray-400 ring-gray-300'
            : backendOk
              ? 'bg-green-500 ring-green-600/50'
              : 'bg-red-500 ring-red-600/50'
        }`}
      />
      {showLabel ? (
        <span className="font-medium text-gray-700">
          API: {backendOk === null ? 'checking…' : backendOk ? 'online' : 'offline'}
        </span>
      ) : null}
    </div>
  )
}

export default BackendHealthIndicator
