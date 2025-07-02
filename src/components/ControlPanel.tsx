import React from 'react'
import PgnLoader from './PgnLoader'
import GameViewer from './GameViewer'
import { useGameState } from '../contexts/GameStateContext'

type ControlPanelProps = {}

const ControlPanel = () => {
  const { gameState } = useGameState()

  return (
    <div className="p-4 overflow-y-hidden h-full w-full">
      {!gameState.isLoaded && !gameState.previewMode && <PgnLoader />}
      {(gameState.isLoaded || gameState.previewMode) && (
        <GameViewer />
      )}
    </div>
  )
}

export default ControlPanel
