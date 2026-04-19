import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { jobService } from '@/services/JobService'
import type { JobResponse } from '@/types/Job'
import { Card } from '@/components/ui/Card'

function formatAgo(ts: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function jobTitle(j: JobResponse): string {
  const h = j.pgn_headers
  if (h?.opening) return h.opening
  if (h?.whiteName && h?.blackName) return `${h.whiteName} vs ${h.blackName}`
  return j.job_id.slice(0, 8) + '…'
}

function statusLine(j: JobResponse): string {
  switch (j.status) {
    case 'completed':
      return `Completed · ${formatAgo(j.created_at)}`
    case 'failed':
      return `Failed · ${formatAgo(j.created_at)}`
    case 'waiting':
      return `Queued · ${formatAgo(j.created_at)}`
    case 'processing':
    case 'engine_complete':
      return `Analyzing… · ${formatAgo(j.created_at)}`
    default:
      return j.status
  }
}

const RecentJobsSidebar: React.FC = () => {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobResponse[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await jobService.listJobs(12)
        if (!cancelled) setJobs(list)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load jobs')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const go = (j: JobResponse) => {
    if (j.status === 'completed') router.push(`/game/${j.job_id}`)
    else if (j.status === 'failed') router.push(`/job/${j.job_id}`)
    else router.push(`/job/${j.job_id}`)
  }

  return (
    <>
      <Card title="Recent jobs" bodyClassName="p-0">
        <div className="max-h-[280px] overflow-y-auto px-4 py-3">
          {err ? <div className="text-xs text-text-danger">{err}</div> : null}
          {!err && jobs.length === 0 ? (
            <div className="py-2 text-xs text-text-tertiary">No jobs yet</div>
          ) : null}
          {jobs.map((j) => (
            <button
              key={j.job_id}
              type="button"
              onClick={() => go(j)}
              className="flex w-full items-center gap-2.5 border-b border-border-tertiary py-2.5 text-left last:border-b-0 hover:bg-background-secondary"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  j.status === 'completed'
                    ? 'bg-emerald-500'
                    : j.status === 'failed'
                      ? 'bg-red-500'
                      : 'bg-accent-progress'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-text-primary">{jobTitle(j)}</div>
                <div className="mt-0.5 text-[11px] text-text-tertiary">{statusLine(j)}</div>
              </div>
              <span className="shrink-0 text-text-tertiary">→</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="What gets annotated" bodyClassName="px-4 py-3">
        <ul className="flex flex-col gap-2.5 text-xs text-text-secondary">
          <li className="flex gap-2">
            <span className="text-text-tertiary">♟</span>
            Move-by-move commentary with strategic insight
          </li>
          <li className="flex gap-2">
            <span className="text-text-tertiary">⚡</span>
            Blunders, mistakes, and missed opportunities
          </li>
          <li className="flex gap-2">
            <span className="text-text-tertiary">◎</span>
            Opening classification and theory context
          </li>
        </ul>
      </Card>
    </>
  )
}

export default RecentJobsSidebar
