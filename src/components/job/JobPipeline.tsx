import React from 'react'
import type { JobStatus } from '@/types/Job'

const STAGES = ['Queued', 'Engine', 'Commentary', 'Ready'] as const

type PipeState = 'done' | 'active' | 'idle' | 'error'

function pipelineFromStatus(status: JobStatus, failedAtEngine: boolean): PipeState[] {
  switch (status) {
    case 'waiting':
      return ['active', 'idle', 'idle', 'idle']
    case 'processing':
      return ['done', 'active', 'idle', 'idle']
    case 'engine_complete':
      return ['done', 'done', 'active', 'idle']
    case 'completed':
      return ['done', 'done', 'done', 'done']
    case 'failed':
      if (failedAtEngine) return ['done', 'error', 'idle', 'idle']
      return ['done', 'done', 'error', 'idle']
    default:
      return ['idle', 'idle', 'idle', 'idle']
  }
}

type Props = {
  status: JobStatus
  /** Heuristic: message mentions engine vs commentary failure */
  failedAtEngine?: boolean
}

export function JobPipeline({ status, failedAtEngine = true }: Props) {
  const states = pipelineFromStatus(status, failedAtEngine)

  return (
    <div className="relative mb-7 flex items-start">
      {STAGES.map((label, i) => {
        const type = states[i]
        const iconChar =
          type === 'done' ? '✓' : type === 'active' ? '◉' : type === 'error' ? '✕' : '○'
        const connDone = i < STAGES.length - 1 && states[i] === 'done'
        const connActive =
          i < STAGES.length - 1 && states[i] !== 'done' && states[i + 1] === 'active'
        return (
          <div key={label} className="relative flex flex-1 flex-col items-center">
            {i < STAGES.length - 1 ? (
              <div
                className={`absolute left-1/2 top-3.5 z-0 h-0.5 w-full -translate-y-1/2 ${
                  connDone ? 'bg-emerald-500' : connActive ? 'bg-gradient-to-r from-emerald-500 to-border-tertiary' : 'bg-border-tertiary'
                }`}
              />
            ) : null}
            <div
              className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                type === 'done'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : type === 'active'
                    ? 'border-accent-progress bg-background-primary text-accent-progress'
                    : type === 'error'
                      ? 'border-red-400 bg-background-danger text-text-danger'
                      : 'border-border-tertiary bg-background-primary text-text-tertiary'
              }`}
            >
              {iconChar}
            </div>
            <div
              className={`mt-1.5 text-center text-[11px] ${
                type === 'done'
                  ? 'font-medium text-emerald-600 dark:text-emerald-400'
                  : type === 'active'
                    ? 'font-medium text-text-primary'
                    : type === 'error'
                      ? 'font-medium text-text-danger'
                      : 'text-text-tertiary'
              }`}
            >
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default JobPipeline
