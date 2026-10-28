import React, { useEffect, useState } from 'react'
import { jobService, ProviderAlert } from '@/services/JobService'
import { LLM_PROVIDER_OPTIONS } from '@/constants/llmProviders'

const POLL_MS = 30_000

function providerLabel(key: string): string {
  return LLM_PROVIDER_OPTIONS.find((o) => o.value === key)?.label ?? key
}

/** Warns when an LLM provider account ran out of credits; comments then fall back to template text. */
const ProviderAlertBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [alerts, setAlerts] = useState<ProviderAlert[]>([])

  useEffect(() => {
    const check = () => jobService.getProviderAlerts().then(setAlerts).catch(() => setAlerts([]))
    check()
    const id = window.setInterval(check, POLL_MS)
    return () => window.clearInterval(id)
  }, [])

  if (alerts.length === 0) return null
  return (
    <div
      role="alert"
      className={`rounded-md border border-red-500/40 bg-red-500/10 px-3.5 py-3 text-sm text-text-primary ${className}`}
    >
      <strong>Out of credits: {alerts.map((a) => providerLabel(a.provider)).join(', ')}.</strong>{' '}
      New comments from {alerts.length === 1 ? 'this model' : 'these models'} use the plain template text until the
      account is refilled. Last failure {new Date(Math.max(...alerts.map((a) => a.last_seen)) * 1000).toLocaleString()}.
    </div>
  )
}

export default ProviderAlertBanner
