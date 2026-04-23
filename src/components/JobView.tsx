import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { jobService } from '@/services/JobService'
import type { JobResponse } from '@/types/Job'
import TopBar from '@/components/ui/TopBar'
import { Card } from '@/components/ui/Card'
import BackendHealthIndicator from '@/components/BackendHealthIndicator'
import { useBackendHealth } from '@/hooks/useBackendHealth'
import { JobPipeline } from '@/components/job/JobPipeline'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface JobViewProps {
  jobId: string
}

function formatAgo(ts: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function dualProgress(job: JobResponse): { engine: number; commentary: number; show: boolean } {
  const p = job.progress ?? 0
  switch (job.status) {
    case 'waiting':
      return { engine: 0, commentary: 0, show: false }
    case 'processing':
      return { engine: Math.min(100, p), commentary: 0, show: true }
    case 'engine_complete':
      return {
        engine: 100,
        commentary: p <= 95 ? 0 : Math.min(100, ((p - 95) / 5) * 100),
        show: true,
      }
    case 'completed':
      return { engine: 100, commentary: 100, show: true }
    case 'failed':
      return { engine: Math.min(100, p), commentary: 0, show: true }
    default:
      return { engine: 0, commentary: 0, show: false }
  }
}

function statusBadgeVariant(
  status: JobResponse['status']
): 'waiting' | 'processing' | 'engine' | 'ready' | 'failed' {
  switch (status) {
    case 'waiting':
      return 'waiting'
    case 'processing':
      return 'processing'
    case 'engine_complete':
      return 'engine'
    case 'completed':
      return 'ready'
    case 'failed':
      return 'failed'
  }
}

function cardTitle(status: JobResponse['status']): string {
  switch (status) {
    case 'waiting':
      return 'Waiting in queue'
    case 'processing':
      return 'Engine analyzing'
    case 'engine_complete':
      return 'Commentary streaming'
    case 'completed':
      return 'Analysis complete'
    case 'failed':
      return 'Analysis failed'
  }
}

const JobView: React.FC<JobViewProps> = ({ jobId }) => {
  const [job, setJob] = useState<JobResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const backendOk = useBackendHealth()

  useEffect(() => {
    const poll = async () => {
      try {
        const status = await jobService.getJobStatus(jobId)
        setJob(status)
      } catch (e) {
        console.error(e)
        setError('Failed to fetch job status')
      }
    }
    poll()
    const intervalId = setInterval(poll, 2000)
    return () => clearInterval(intervalId)
  }, [jobId, router])

  const failedAtEngine =
    job?.status === 'failed' &&
    !(job.message?.toLowerCase().includes('commentary') ?? false)

  const tip =
    job?.status === 'waiting'
      ? 'Analysis typically starts within a short time. This page updates automatically — no need to refresh.'
      : job?.status === 'processing'
        ? 'Stockfish is evaluating each position. Commentary begins after the engine pass completes.'
        : job?.status === 'engine_complete'
          ? 'The board is ready to open while commentary streams in.'
          : ''

  if (error && !job) {
    return (
      <div className="min-h-screen bg-background-secondary px-4 py-6">
        <div className="mx-auto max-w-[900px] text-text-danger">{error}</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-secondary text-text-secondary">
        Loading job status…
      </div>
    )
  }

  const dp = dualProgress(job)
  const h = job.pgn_headers

  return (
    <div className="min-h-screen bg-background-secondary text-text-primary">
      <div className="mx-auto max-w-[900px] px-4 py-6 pb-16">
        <TopBar
          subtitle={
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-0.5 border-0 bg-transparent p-0 text-left text-xs text-text-tertiary hover:text-text-secondary"
            >
              ← Back to home
            </button>
          }
          onLogoClick={() => router.push('/')}
          right={<BackendHealthIndicator backendOk={backendOk} />}
        />

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px] lg:items-start">
          <Card
            title={cardTitle(job.status)}
            headerRight={
              <span className="max-w-[140px] truncate font-mono text-[11px] text-text-tertiary">
                {job.job_id}
              </span>
            }
            bodyClassName="px-5 py-6"
          >
            <JobPipeline status={job.status} failedAtEngine={failedAtEngine} />

            <div className="mb-5 rounded-md border border-border-tertiary bg-background-secondary px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={statusBadgeVariant(job.status)}>
                  {job.status === 'waiting'
                    ? 'Queued'
                    : job.status === 'processing'
                      ? 'Processing'
                      : job.status === 'engine_complete'
                        ? 'Commentary'
                        : job.status === 'completed'
                          ? 'Ready'
                          : 'Failed'}
                </StatusBadge>
                <span className="font-mono text-xs text-text-secondary">{job.message}</span>
              </div>
              {job.status === 'waiting' && job.queued_ahead != null ? (
                <div className="mt-1 text-xs text-text-tertiary">
                  Position {job.queued_ahead + 1} in queue — engine will start shortly
                </div>
              ) : null}
            </div>

            {dp.show ? (
              <div className="mb-5 flex flex-col gap-2.5">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-text-secondary">
                    <span>Engine analysis</span>
                    <span className="font-mono text-[11px] text-text-tertiary">{Math.round(dp.engine)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-sm border border-border-tertiary bg-background-secondary">
                    <div
                      className="h-full rounded-sm bg-accent-engine transition-all duration-500"
                      style={{ width: `${dp.engine}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-text-secondary">
                    <span>Commentary generation</span>
                    <span className="font-mono text-[11px] text-text-tertiary">
                      {Math.round(dp.commentary)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-sm border border-border-tertiary bg-background-secondary">
                    <div
                      className="h-full rounded-sm bg-accent-commentary transition-all duration-500"
                      style={{ width: `${dp.commentary}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {job.status === 'engine_complete' ? (
              <div className="mb-5 overflow-hidden rounded-md border border-border-tertiary">
                <div className="flex items-center gap-2 border-b border-border-tertiary bg-background-secondary px-3.5 py-2 text-[11px] text-text-secondary">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent-commentary" />
                  Commentary is streaming in…
                </div>
                <div className="space-y-2 px-3.5 py-3">
                  <div className="h-2.5 w-[90%] rounded bg-background-secondary" />
                  <div className="h-2.5 w-[75%] rounded bg-background-secondary" />
                  <div className="h-2.5 w-[55%] animate-pulse rounded bg-border-tertiary" />
                </div>
              </div>
            ) : null}

            {job.status === 'failed' ? (
              <div className="mb-5 rounded-md border border-border-danger bg-background-danger px-4 py-3.5">
                <div className="mb-1 text-sm font-medium text-text-danger">Analysis failed</div>
                <div className="mb-3 font-mono text-xs text-text-danger opacity-90">
                  {job.error || job.message}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-text-danger px-3.5 py-2 text-xs font-medium text-white hover:opacity-90"
                    onClick={async () => {
                      try {
                        const j = await jobService.retryJob(jobId)
                        router.push(`/job/${j.job_id}`)
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Retry failed')
                      }
                    }}
                  >
                    Retry analysis
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border-secondary bg-transparent px-4 py-2 text-xs text-text-secondary hover:bg-background-secondary"
                    onClick={() => router.push(`/?recover=${jobId}`)}
                  >
                    Re-submit PGN
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              {(job.status === 'engine_complete' || job.status === 'completed') && (
                <button
                  type="button"
                  onClick={() => router.push(`/game/${jobId}`)}
                  className="rounded-md bg-text-primary px-5 py-2.5 text-sm font-medium text-background-primary hover:opacity-90"
                >
                  {job.status === 'engine_complete' ? 'Preview board →' : 'View game →'}
                </button>
              )}
              {job.status === 'engine_complete' ? (
                <p className="text-[11px] text-text-tertiary">
                  Commentary is still streaming — the board is ready to open now.
                </p>
              ) : null}
            </div>
          </Card>

          <div className="flex flex-col gap-3.5">
            <Card title="Job details" bodyClassName="px-4 py-3">
              <dl className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-text-tertiary">Job ID</dt>
                  <dd className="max-w-[140px] truncate text-right font-mono text-text-secondary">{job.job_id}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-text-tertiary">Opening</dt>
                  <dd className="truncate text-right text-text-secondary">{h?.opening || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-text-tertiary">Moves</dt>
                  <dd className="font-mono text-right text-text-secondary">{job.move_count ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-text-tertiary">Provider</dt>
                  <dd className="truncate text-right font-mono text-text-secondary">{job.llm_provider || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-text-tertiary">Effort</dt>
                  <dd className="font-mono text-right text-text-secondary">{job.llm_effort || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-text-tertiary">Submitted</dt>
                  <dd className="font-mono text-right text-text-secondary">{formatAgo(job.created_at)}</dd>
                </div>
              </dl>
              {job.pgn_preview ? (
                <pre className="mt-3 max-h-20 overflow-hidden rounded-md border border-border-tertiary bg-background-secondary p-2.5 font-mono text-[11px] leading-relaxed text-text-tertiary">
                  {job.pgn_preview}
                </pre>
              ) : null}
            </Card>

            {tip ? (
              <Card title="While you wait" bodyClassName="px-4 py-3 text-xs leading-relaxed text-text-secondary">
                {tip}
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobView
