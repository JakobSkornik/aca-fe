import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'

/** One labelled info row, rendered only when it has a value. */
const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => {
  if (value == null || value === '') return null
  return (
    <div className="gameinfo-row">
      <span className="gameinfo-label">{label}</span>
      <span className="gameinfo-value">{value}</span>
    </div>
  )
}

function playerLabel(name?: string | null, elo?: number | null): string {
  const n = (name || '').trim() || '—'
  return elo && elo > 0 ? `${n} (${elo})` : n
}

function clean(value?: string | null): string {
  const v = (value || '').trim()
  return v && v !== '?' && v !== '-' ? v : ''
}

/** Game-info section under the board: full labelled metadata for the game. */
const GameBar: React.FC = () => {
  const { state } = useGameState()
  const meta = state.gameJson?.metadata
  const ai = state.gameJson?.analysis_info
  const moveCount = state.gameJson?.moves?.length ?? 0
  const opening =
    clean(meta?.opening) +
    (clean(meta?.opening_eco) ? ` (${clean(meta?.opening_eco)})` : '')
  const level = clean(meta?.commentary_level)
  const side = meta?.comment_side && meta.comment_side !== 'both' ? meta.comment_side : ''

  return (
    <div className="gameinfo">
      <InfoRow label="White" value={playerLabel(meta?.white, meta?.whiteElo)} />
      <InfoRow label="Black" value={playerLabel(meta?.black, meta?.blackElo)} />
      <InfoRow label="Result" value={clean(meta?.result)} />
      <InfoRow label="Event" value={clean(meta?.eventId)} />
      <InfoRow label="Site" value={clean(meta?.site)} />
      <InfoRow label="Round" value={clean(meta?.round)} />
      <InfoRow label="Date" value={clean(meta?.date)} />
      <InfoRow label="Opening" value={opening || undefined} />
      <InfoRow
        label="Engine"
        value={ai ? `${ai.engine} · depth ${ai.depth}` : undefined}
      />
      <InfoRow
        label="Commentary"
        value={level ? `${level}${side ? ` · ${side} only` : ''}` : undefined}
      />
      <InfoRow label="Moves" value={moveCount ? Math.ceil(moveCount / 2) : undefined} />
    </div>
  )
}

export default GameBar
