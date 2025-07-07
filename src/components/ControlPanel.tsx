import React from 'react'
import PgnLoader from './PgnLoader'
import GameViewer from './GameViewer'
import { useGameState } from '../contexts/GameStateContext'

const ControlPanel = () => {
  const { state } = useGameState()

  return (
    <div className="p-4 overflow-y-hidden h-full w-full">
      {!state.isLoaded && !state.previewMode && <PgnLoader />}
      {(state.isLoaded || state.previewMode) && (
        <GameViewer />
      )}
    </div>
  )
}

export default ControlPanel
