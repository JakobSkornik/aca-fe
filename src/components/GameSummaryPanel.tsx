import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import type { GameSummaryDigest } from '@/types/WebSocketMessages'

const GameSummaryPanel: React.FC = () => {
  const { state, manager } = useGameState()
  const { gameSummary, commentaryComplete } = state
  const d = gameSummary as GameSummaryDigest | null

  const goToPly = (ply: number) => {
    const idx = Math.max(0, ply - 1)
    manager.goToMove(idx)
  }

  /** PGN / annotation move number (1-based full-move index), not raw half-move ply. */
  const annotationMoveNo = (ply: number) => Math.max(1, Math.ceil(ply / 2))

  return (
    <div className="flex h-full min-h-[200px] w-full flex-col overflow-hidden rounded-md border border-gray-200 bg-lightest-gray text-xs">
      <div className="flex-shrink-0 border-b border-gray-200 bg-light-gray/80 px-2 py-1.5">
        <span className="text-sm font-semibold text-darkest-gray">Game summary</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-3">
        {!d && !commentaryComplete && (
          <div className="flex items-center gap-2 text-gray-500">
            <span
              className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
              aria-hidden
            />
            <span>Summary generating…</span>
          </div>
        )}
        {!d && commentaryComplete && (
          <p className="text-gray-500 italic">No summary available.</p>
        )}
        {d && (
          <>
            <section>
              <h3 className="mb-1 font-bold text-gray-600">Overview</h3>
              <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{d.overall_story}</p>
              <p className="mt-1 text-gray-700">{d.opening_character}</p>
            </section>
            {d.phase_story?.length > 0 && (
              <section>
                <h3 className="mb-1 font-bold text-gray-600">Phases</h3>
                <ul className="list-disc pl-4 space-y-1 text-gray-800">
                  {d.phase_story.map((p, i) => (
                    <li key={`${p.phase}-${i}`}>
                      <span className="font-medium capitalize">{p.phase}:</span> {p.summary}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {d.turning_points?.length > 0 && (
              <section>
                <h3 className="mb-1 font-bold text-gray-600">Turning points</h3>
                <div className="flex flex-wrap gap-1">
                  {d.turning_points.map((tp, i) => (
                    <button
                      key={`${tp.ply}-${tp.san}-${i}`}
                      type="button"
                      title={tp.why}
                      onClick={() => goToPly(tp.ply)}
                      className="rounded border border-indigo-300 bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-900 hover:bg-indigo-100"
                    >
                      {annotationMoveNo(tp.ply)}. {tp.san}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h3 className="mb-1 font-bold text-gray-600">Winning plan</h3>
              <p className="text-gray-800">{d.winning_side_plan}</p>
            </section>
            <section>
              <h3 className="mb-1 font-bold text-gray-600">What went wrong</h3>
              <p className="text-gray-800">{d.losing_side_mistakes}</p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default GameSummaryPanel
