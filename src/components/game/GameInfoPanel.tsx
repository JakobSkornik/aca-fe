import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'

/** Players, ratings, result, opening and engine metadata (tab under the board). */
const GameInfoPanel: React.FC = () => {
  const { state } = useGameState()
  const { pgnHeaders, gameJson } = state
  const h = pgnHeaders
  const ai = gameJson?.analysis_info

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'White', value: `${h?.whiteName || '—'}${h?.whiteElo ? ` (${h.whiteElo})` : ''}` },
    { label: 'Black', value: `${h?.blackName || '—'}${h?.blackElo ? ` (${h.blackElo})` : ''}` },
    { label: 'Result', value: h?.result || '—' },
    { label: 'Event', value: h?.event || '—' },
    { label: 'Opening', value: h?.opening || 'Unknown' },
    {
      label: 'Engine',
      value: ai ? `${ai.engine} (depth ${ai.depth}, ${ai.multipv} lines)` : '—',
    },
  ]

  return (
    <div className="h-full overflow-y-auto p-3">
      <dl className="space-y-1.5 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3">
            <dt className="shrink-0 font-semibold text-text-primary">{r.label}</dt>
            <dd className="truncate text-right text-text-secondary">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default GameInfoPanel
