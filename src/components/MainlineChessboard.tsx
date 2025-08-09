import React, { useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameState } from '../contexts/GameStateContext'
import { useSquareFit } from '@/hooks/useSquareFit'

const MIN_BOARD_SIZE = 240
const BOARD_PADDING = 8

const MainlineChessboard = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, isLoaded } = state
  const parentRef = useRef<HTMLDivElement>(null)
  const boardSize = useSquareFit(parentRef, { padding: BOARD_PADDING, min: MIN_BOARD_SIZE })

  // Use manager helpers
  const currentFen = manager.getCurrentPosition(currentMoveIndex)
  const { capturedByWhite: whiteCaptures, capturedByBlack: blackCaptures } = manager.getCapturesForMove(currentMoveIndex)

  // Sizing handled by useSquareFit

  // Use manager helpers for captures display
  const whiteCapturesString = manager.formatCapturesForDisplay(whiteCaptures, true)
  const blackCapturesString = manager.formatCapturesForDisplay(blackCaptures, false)

  return (
    <div ref={parentRef} className="flex flex-col w-full items-center px-2 py-2 border-r">
      {isLoaded && (
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Captured: {blackCapturesString}</p>
        </div>
      )}
      {boardSize > 0 && (
        <div className="align-center justify-center" style={{ width: boardSize, height: boardSize }}>
          <Chessboard
            position={currentFen || undefined}
            boardWidth={boardSize}
            customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
            customNotationStyle={{ color: 'var(--darkest-gray)' }}
            areArrowsAllowed={false}
            arePiecesDraggable={false}
            boardOrientation="white"
            showBoardNotation={true}
            snapToCursor={false}
          />
        </div>
      )}
      {isLoaded && (
        <div className="text-center mb-2">
          <p className="text-sm text-gray-600">Captured: {whiteCapturesString}</p>
        </div>
      )}
    </div>
  )
}

export default MainlineChessboard
