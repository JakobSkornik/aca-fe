import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { jobService } from '@/services/JobService'
import { useGameState } from '@/contexts/GameStateContext'
import { Card } from '@/components/ui/Card'
import {
  LLM_PROVIDER_OPTIONS,
  providerSupportsEffort,
  type LlmEffort,
  type LlmProvider,
} from '@/constants/llmProviders'

const EXAMPLES = [
  { id: 'Test', path: '/data/short.pgn', label: 'Test' },
  { id: 'Example 1', path: '/data/example1.pgn', label: 'Example 1' },
  { id: '2759 elo', path: '/data/2759.pgn', label: '2759 elo' },
  { id: '2000 elo', path: '/data/2000.pgn', label: '2000 elo' },
] as const

const LandingNewAnalysis: React.FC = () => {
  const router = useRouter()
  const { manager } = useGameState()
  const [pgn, setPgn] = useState('')
  const [activeExample, setActiveExample] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [provider, setProvider] = useState<LlmProvider>(manager.getModelParams().provider)
  const [effort, setEffort] = useState<LlmEffort>(manager.getModelParams().effort)
  const [commentaryLevel, setCommentaryLevel] = useState<string>('intermediate')
  const [commentSide, setCommentSide] = useState<string>('both')
  const selectedProviderOption = useMemo(
    () => LLM_PROVIDER_OPTIONS.find((o) => o.value === provider),
    [provider],
  )
  const showEffort = providerSupportsEffort(provider)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const recover = router.query.recover
    if (typeof recover === 'string' && recover) {
      const saved = sessionStorage.getItem(`aca_pgn_${recover}`)
      if (saved) {
        setPgn(saved)
        setActiveExample(null)
      }
    }
  }, [router.query.recover])

  const moveCountHint = (text: string) => {
    const m = text.match(/\d+\./g)
    const n = m ? m.length : 0
    return `${n} moves · ${text.length} chars`
  }

  const loadExample = async (ex: (typeof EXAMPLES)[number]) => {
    try {
      const res = await fetch(ex.path)
      const t = await res.text()
      setPgn(t)
      setActiveExample(ex.id)
      setError(null)
    } catch (e) {
      console.error(e)
      setError('Failed to load example PGN')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f || !f.name.endsWith('.json')) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        const s = JSON.stringify(json)
        sessionStorage.setItem('aca_offline_json', s)
        sessionStorage.setItem('aca_offline_json_backup', s)
        router.push('/game/offline')
      } catch {
        setError('Invalid JSON file')
      }
    }
    reader.readAsText(f)
  }, [router])

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        const s = JSON.stringify(json)
        sessionStorage.setItem('aca_offline_json', s)
        sessionStorage.setItem('aca_offline_json_backup', s)
        router.push('/game/offline')
      } catch {
        setError('Invalid JSON file')
      }
    }
    reader.readAsText(f)
  }

  const submit = async () => {
    if (!pgn.trim()) return
    setLoading(true)
    setError(null)
    try {
      manager.setModelParams({ provider, effort })
      const job = await jobService.submitJob(pgn, {
        llm_provider: provider,
        llm_effort: effort,
        commentary_level: commentaryLevel,
        comment_side: commentSide,
      })
      sessionStorage.setItem(`aca_pgn_${job.job_id}`, pgn.trim())
      router.push(`/job/${job.job_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title="New analysis"
      headerRight={
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-1 border-0 bg-transparent text-xs text-text-secondary hover:text-text-primary"
        >
          Advanced
          <span className={`inline-block text-[10px] transition-transform ${advancedOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
      }
      bodyClassName="p-5"
    >
      <div className="mb-1.5 text-xs text-text-secondary">Load example game</div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => loadExample(ex)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              activeExample === ex.id
                ? 'border-border-primary text-text-primary'
                : 'border-border-tertiary bg-background-secondary text-text-secondary hover:border-border-secondary'
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="mb-1.5 text-xs text-text-secondary">PGN</div>
      <textarea
        spellCheck={false}
        className="min-h-[200px] w-full resize-y rounded-md border border-border-tertiary bg-background-secondary px-3.5 py-3 font-mono text-xs leading-relaxed text-text-primary outline-none focus:border-border-primary"
        value={pgn}
        onChange={(e) => {
          setPgn(e.target.value)
          setActiveExample(null)
        }}
      />
      <div className="mt-1 text-right text-[11px] text-text-tertiary">{moveCountHint(pgn)}</div>

      <div className="mt-3.5 flex flex-col gap-3.5 sm:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[11px] text-text-tertiary">Commentary language</div>
          <select
            value={commentaryLevel}
            onChange={(e) => setCommentaryLevel(e.target.value)}
            className="w-full rounded-md border border-border-secondary bg-background-primary px-2.5 py-2 text-sm text-text-primary outline-none focus:border-border-primary"
          >
            <option value="beginner">Beginner — concepts explained simply</option>
            <option value="intermediate">Intermediate — club player</option>
            <option value="expert">Expert — dry, Informant style</option>
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[11px] text-text-tertiary">Comment side</div>
          <select
            value={commentSide}
            onChange={(e) => setCommentSide(e.target.value)}
            className="w-full rounded-md border border-border-secondary bg-background-primary px-2.5 py-2 text-sm text-text-primary outline-none focus:border-border-primary"
          >
            <option value="both">Both sides</option>
            <option value="white">White only</option>
            <option value="black">Black only</option>
          </select>
        </div>
      </div>

      {advancedOpen ? (
        <div className="mt-3.5 flex flex-col gap-3.5 rounded-md border border-border-tertiary bg-background-secondary p-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] text-text-tertiary">LLM provider</div>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as LlmProvider)}
              className="w-full rounded-md border border-border-secondary bg-background-primary px-2.5 py-2 text-sm text-text-primary outline-none focus:border-border-primary"
            >
              {LLM_PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {selectedProviderOption ? (
              <p className="mt-1 text-[10px] leading-snug text-text-tertiary">
                Models: {selectedProviderOption.modelSummary}
              </p>
            ) : null}
          </div>
          {showEffort ? (
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[11px] text-text-tertiary">Reasoning effort</div>
              <select
                value={effort}
                onChange={(e) => setEffort(e.target.value as LlmEffort)}
                className="w-full rounded-md border border-border-secondary bg-background-primary px-2.5 py-2 text-sm text-text-primary outline-none focus:border-border-primary"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="mt-3 text-sm text-text-danger">{error}</div> : null}

      <div className="mt-5">
        <button
          type="button"
          disabled={loading || !pgn.trim()}
          onClick={submit}
          className="btn btn-primary w-full"
          style={{ justifyContent: 'center', padding: '10px' }}
        >
          {loading ? 'Submitting…' : 'Analyze game'}
        </button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-text-tertiary">
        <span className="h-px flex-1 bg-border-tertiary" />
        or load existing analysis
        <span className="h-px flex-1 bg-border-tertiary" />
      </div>

      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onFilePick} />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="cursor-pointer rounded-md border border-dashed border-border-secondary px-5 py-8 text-center transition-colors hover:border-border-primary hover:bg-background-secondary"
      >
        <div className="mb-1.5 text-xl text-text-tertiary">⬆</div>
        <div className="text-sm text-text-secondary">Drop a JSON file or click to browse</div>
        <div className="mt-1 text-[11px] text-text-tertiary">Previously exported analysis · .json</div>
      </div>
    </Card>
  )
}

export default LandingNewAnalysis
