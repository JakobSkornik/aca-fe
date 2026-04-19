import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { Card } from '@/components/ui/Card'

/** Players, ratings, result, opening (split from former GameViewer). */
const OpeningMetadataCard: React.FC = () => {
  const { state } = useGameState()
  const { pgnHeaders } = state
  const { result, opening, whiteName, whiteElo, blackName, blackElo } = pgnHeaders || {
    result: '',
    opening: '',
    whiteName: '',
    whiteElo: '',
    blackName: '',
    blackElo: '',
  }

  return (
    <Card title="Game info" className="flex flex-col" bodyClassName="p-3 text-xs text-text-secondary">
      <p>
        <span className="font-semibold text-text-primary">White:</span> {whiteName || '—'}
      </p>
      <p>
        <span className="font-semibold text-text-primary">White Elo:</span> {whiteElo || '—'}
      </p>
      <p>
        <span className="font-semibold text-text-primary">Black:</span> {blackName || '—'}
      </p>
      <p>
        <span className="font-semibold text-text-primary">Black Elo:</span> {blackElo || '—'}
      </p>
      <p>
        <span className="font-semibold text-text-primary">Result:</span> {result || '—'}
      </p>
      <p className="mt-1">
        <span className="font-semibold text-text-primary">Opening:</span> {opening || 'Unknown'}
      </p>
    </Card>
  )
}

export default OpeningMetadataCard
