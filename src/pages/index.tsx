import { useGameState } from '@/contexts/GameStateContext'
import MainlineChessboard from '@/components/MainlineChessboard'
import PreviewChessboard from '@/components/PreviewChessboard'
import ControlPanel from '@/components/ControlPanel'
import MoveList from '@/components/MoveList'
import PgnLoader from '@/components/PgnLoader'
import FeatureTable from '@/components/FeatureTable'

const AnnotatePGN = () => {
  const { state } = useGameState()

  return (
    <div className="flex flex-col h-screen bg-light-gray p-4 space-y-4">
      {!state.isLoaded ? (
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
          <div className="flex flex-row bg-lightest-gray justify-between shadow-md rounded-md overflow-hidden space-x-4">
            <div className="flex-none max-w-[20vw] w-[20vw]">
              <MainlineChessboard />
            </div>
            <div className="flex-none max-w-[20vw] w-[20vw]">
              <PreviewChessboard />
            </div>
            <div className="flex-none max-w-[25vw] w-[25vw]">
              <FeatureTable />
            </div>
            <div className="flex-none max-w-[30vw] w-[30vw]">
              <ControlPanel />
            </div>
          </div>
          <div className="flex-shrink-0 h-[30vh] min-h-[220px] overflow-y-auto z-index-100 pb-4">
            <MoveList />
          </div>
        </>
      )}
    </div>
  )
}

export default AnnotatePGN