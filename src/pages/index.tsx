import { useState } from 'react'

import MainlineChessboard from '@/components/MainlineChessboard'
import PreviewChessboard from '@/components/PreviewChessboard'
import ControlPanel from '@/components/ControlPanel'
import FeatureCharts from '@/components/FeatureCharts'
import MoveList from '@/components/MoveList'
import PgnLoader from '@/components/PgnLoader'
import { useGameState } from '@/contexts/GameStateContext'

const AnnotatePGN = () => {
  const { gameState } = useGameState()
  const [hoveredArrow, setHoveredArrow] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-screen bg-light-gray p-4 space-y-4">
      {!gameState.isLoaded ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <h1 className="text-2xl font-bold darkest-gray text-center mb-4">
            Automatic Chess Annotator
          </h1>
          <PgnLoader />
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold darkest-gray text-center">
            Automatic Chess Annotator
          </h1>
          <div className="flex flex-row flex-grow bg-lightest-gray shadow-md rounded-md overflow-hidden space-x-4">
            <div className="flex-none max-w-[35vw] w-[35vw]">
              <MainlineChessboard hoveredArrow={hoveredArrow} />
            </div>
            <div className="flex-none max-w-[35vw] w-[35vw]">
              <PreviewChessboard hoveredArrow={hoveredArrow} />
            </div>
            <div className="flex-none max-w-[30vw] w-[30vw]">
              <ControlPanel />
            </div>
          </div>
          <div className="flex-shrink-0 h-[20vh] overflow-y-auto">
            <MoveList />
          </div>
          <div className="flex-shrink-0 h-[10vh] overflow-y-auto">
            <FeatureCharts />
          </div>
        </>
      )}
    </div>
  )
}

export default AnnotatePGN