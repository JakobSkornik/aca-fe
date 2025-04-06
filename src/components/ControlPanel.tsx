import React from 'react'
import PgnLoader from './PgnLoader'
import GameViewer from './GameViewer'
import { useGameState } from '../contexts/GameStateContext'

const ControlPanel = ({ onArrowHover }: { onArrowHover: (arrow: string | null) => void }) => {
  const { gameState } = useGameState()

  return (
    <div className="p-4 overflow-y-hidden h-full w-full">
      {!gameState.moves.length || gameState.moves.length === 1 ? (
        <PgnLoader />
      ) : (
        <GameViewer onArrowHover={onArrowHover} />
      )}
    </div>
  )
}

export default ControlPanel
