import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import type { GameSummaryDigest } from '@/types/WebSocketMessages'
import { Card } from '@/components/ui/Card'

const GameSummaryPanel: React.FC = () => {
  const { state, manager } = useGameState()
  const { gameSummary, commentaryComplete } = state
  const d = gameSummary as GameSummaryDigest | null

  const goToPly = (ply: number) => {
    const idx = Math.max(0, ply - 1)
    manager.goToMove(idx)
  }

  /** PGN-style label: White `N.` Black `N...` (ply is 1-based half-move). */
  const fmtPlyLabel = (ply: number, san: string) => {
    const full = Math.max(1, Math.ceil(ply / 2))
    const isWhite = ply % 2 === 1
    return isWhite ? `${full}. ${san}` : `${full}... ${san}`
  }

  return (
    <Card
      title="Game summary"
      className="flex h-full min-h-[200px] w-full flex-col overflow-hidden"
      bodyClassName="min-h-0 flex-1 overflow-y-auto p-3 text-xs text-text-secondary"
    >
      {!d && !commentaryComplete && (
        <div className="flex items-center gap-2 text-text-tertiary">
          <span
            className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border-secondary border-t-accent-engine"
            aria-hidden
          />
          <span>Summary generating…</span>
        </div>
      )}
      {!d && commentaryComplete && <p className="italic text-text-tertiary">No summary available.</p>}
      {d && (
        <>
          <section>
            <h3 className="mb-1 font-semibold text-text-primary">Overview</h3>
            <p className="leading-relaxed text-text-secondary whitespace-pre-wrap">{d.overall_story}</p>
            <p className="mt-1 text-text-secondary">{d.opening_character}</p>
          </section>
          {d.phase_story?.length > 0 && (
            <section className="mt-3">
              <h3 className="mb-1 font-semibold text-text-primary">Phases</h3>
              <ul className="list-disc space-y-1 pl-4 text-text-secondary">
                {d.phase_story.map((p, i) => (
                  <li key={`${p.phase}-${i}`}>
                    <span className="font-medium capitalize">{p.phase}:</span> {p.summary}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {d.turning_points?.length > 0 && (
            <section className="mt-3">
              <h3 className="mb-1 font-semibold text-text-primary">Turning points</h3>
              <div className="flex flex-wrap gap-1.5">
                {d.turning_points.map((tp, i) => (
                  <button
                    key={`${tp.ply}-${tp.san}-${i}`}
                    type="button"
                    title={tp.why}
                    onClick={() => goToPly(tp.ply)}
                    className="rounded-md border border-border-info bg-background-info px-2 py-0.5 text-[11px] font-medium text-text-info hover:opacity-90"
                  >
                    {fmtPlyLabel(tp.ply, tp.san)}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="mt-3">
            <h3 className="mb-1 font-semibold text-text-primary">Winning plan</h3>
            <p className="text-text-secondary">{d.winning_side_plan}</p>
          </section>
          <section className="mt-3">
            <h3 className="mb-1 font-semibold text-text-primary">What went wrong</h3>
            <p className="text-text-secondary">{d.losing_side_mistakes}</p>
          </section>
        </>
      )}
    </Card>
  )
}

export default GameSummaryPanel
