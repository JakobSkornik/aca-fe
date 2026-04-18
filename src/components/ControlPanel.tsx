import React from 'react'

import BackendHealthIndicator from './BackendHealthIndicator'
import GameViewer from './GameViewer'
import PgnLoader from './PgnLoader'
import { useBackendHealth } from '@/hooks/useBackendHealth'
import { useGameState } from '../contexts/GameStateContext'

const ControlPanel = () => {
  const { state } = useGameState()
  const backendOk = useBackendHealth()

  return (
    <div className="flex h-full w-full flex-col overflow-y-hidden p-4">
      <div className="mb-2 flex shrink-0 justify-end border-b border-gray-200/80 pb-2">
        <BackendHealthIndicator backendOk={backendOk} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-hidden">
        {!state.isLoaded && <PgnLoader />}
        {state.isLoaded && <GameViewer />}
      </div>
    </div>
  )
}

export default ControlPanel
