import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'

/** Game narrative + episode narratives (tab under the board). */
const SummaryPanel: React.FC = () => {
  const { state, manager } = useGameState()
  const { gameNarrative, episodeNarratives, commentaryComplete, gameJson } = state

  const episodes = gameJson?.episodes ?? []

  const goToMove = (moveNumber: number) => {
    manager.goToMove(Math.max(0, (moveNumber - 1) * 2))
  }

  return (
    <div className="h-full overflow-y-auto p-3 text-xs text-text-secondary">
      {!gameNarrative && !commentaryComplete ? (
        <div className="mb-2 flex items-center gap-1.5 rounded border border-border-secondary bg-background-warning px-2 py-1.5 text-[11px] font-medium text-text-warning">
          <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-text-warning border-t-transparent" />
          <span>Summary generating…</span>
        </div>
      ) : null}
      {gameNarrative ? (
        <section className="mb-3">
          <h3 className="mb-1 font-semibold text-text-primary">The game</h3>
          <p className="whitespace-pre-wrap leading-relaxed">{gameNarrative}</p>
        </section>
      ) : null}
      {episodeNarratives.length > 0 ? (
        <section>
          <h3 className="mb-1 font-semibold text-text-primary">Episodes</h3>
          <ul className="space-y-2">
            {[...episodeNarratives]
              .sort((a, b) => a.episodeIndex - b.episodeIndex)
              .map((ep) => {
                const meta = episodes.find((e) => e.episode_index === ep.episodeIndex)
                return (
                  <li key={ep.episodeIndex}>
                    <button
                      type="button"
                      onClick={() => meta && goToMove(meta.start_move)}
                      className="font-medium text-text-primary hover:underline"
                    >
                      {meta ? `Moves ${meta.start_move}–${meta.end_move}: ` : ''}
                      {ep.title}
                    </button>
                    <p className="leading-relaxed">{ep.narrative}</p>
                  </li>
                )
              })}
          </ul>
        </section>
      ) : null}
      {!gameNarrative && episodeNarratives.length === 0 && commentaryComplete ? (
        <p className="italic text-text-tertiary">No summary available.</p>
      ) : null}
    </div>
  )
}

export default SummaryPanel
