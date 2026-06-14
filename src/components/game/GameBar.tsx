import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'

/** Game-info strip under the topbar: players, result, opening, engine, options. */
const GameBar: React.FC = () => {
  const { state } = useGameState()
  const h = state.pgnHeaders
  const ai = state.gameJson?.analysis_info
  const meta = state.gameJson?.metadata

  const dot = <span className="dot" />

  return (
    <div className="gamebar">
      <span className="players">
        {(h?.whiteName || '—') + (h?.whiteElo ? ` (${h.whiteElo})` : '')}
        {'  –  '}
        {(h?.blackName || '—') + (h?.blackElo ? ` (${h.blackElo})` : '')}
      </span>
      {h?.result ? <span className="result-badge">{h.result}</span> : null}
      {h?.opening ? (
        <>
          {dot}
          <span className="opening">{h.opening}</span>
        </>
      ) : null}
      {ai ? (
        <>
          {dot}
          <span className="meta-mono">
            {ai.engine} d{ai.depth}
          </span>
        </>
      ) : null}
      {meta?.commentary_level ? (
        <>
          {dot}
          <span className="meta-mono" style={{ textTransform: 'capitalize' }}>
            {meta.commentary_level}
            {meta.comment_side && meta.comment_side !== 'both' ? ` · ${meta.comment_side} only` : ''}
          </span>
        </>
      ) : null}
      <div style={{ flex: 1 }} />
      {h?.event ? <span className="meta-mono">{h.event}</span> : null}
    </div>
  )
}

export default GameBar
