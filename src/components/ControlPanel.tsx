import React from 'react'
import PgnLoader from './PgnLoader'
import GameViewer from './GameViewer'
import { useGameState } from '../contexts/GameStateContext'

type ControlPanelProps = {
  onArrowHover: (arrow: string | null) => void
  showFeatures: boolean
  setShowFeatures: (show: boolean) => void
}

const ControlPanel = ({
  onArrowHover,
  showFeatures,
  setShowFeatures,
}: ControlPanelProps) => {
  const { gameState } = useGameState()

  return (
    <div className="p-4 overflow-y-hidden h-full w-full">
      {!gameState.moves.length || gameState.moves.length === 1 ? (
        <PgnLoader />
      ) : (
        <GameViewer
          onArrowHover={onArrowHover}
          showFeatures={showFeatures}
          setShowFeatures={setShowFeatures}
        />
      )}
    </div>
  )
}

export default ControlPanel
