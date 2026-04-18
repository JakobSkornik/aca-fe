import { useEffect, useState } from 'react'

const POLL_MS = 30_000

/**
 * Polls `/api/status` (Next.js proxy to backend `/health`) so UI can show reachability.
 */
export function useBackendHealth(): boolean | null {
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/status')
        const json = (await res.json()) as { ok?: boolean }
        setBackendOk(Boolean(json?.ok))
      } catch {
        setBackendOk(false)
      }
    }
    checkStatus()
    const id = window.setInterval(checkStatus, POLL_MS)
    return () => window.clearInterval(id)
  }, [])

  return backendOk
}
