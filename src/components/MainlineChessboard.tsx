import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Arrow } from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'

const PADDING_PX = 16
const MIN_BOARD_SIZE = 500

const MainlineChessboard = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, isLoaded } = state
  const [boardWidth, setBoardWidth] = useState<number>(0)
  const parentRef = useRef<HTMLDivElement>(null)

  // Use manager helpers
  const currentFen = manager.getCurrentPosition(currentMoveIndex)
  const { capturedByWhite: whiteCaptures, capturedByBlack: blackCaptures } = manager.getCapturesForMove(currentMoveIndex)

  useEffect(() => {
    const handleResize = () => {
      if (parentRef.current) {
        const width = Math.max(
          parentRef.current.clientHeight - 2 * PADDING_PX,
          MIN_BOARD_SIZE
        )
        setBoardWidth(width)
      }
    }
    handleResize()
  }, [])

  // Use manager helpers for captures display
  const whiteCapturesString = manager.formatCapturesForDisplay(whiteCaptures, true)
  const blackCapturesString = manager.formatCapturesForDisplay(blackCaptures, false)

  return (
    <div ref={parentRef} className="flex flex-col w-full items-center p-4 border-r mx-auto">
      {isLoaded && (
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Captured: {blackCapturesString}</p>
        </div>
      )}
      {boardWidth > 0 && (
        <div className="align-center justify-center">
          <Chessboard
            position={currentFen || undefined}
            boardWidth={boardWidth}
            customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
            customNotationStyle={{ color: 'var(--darkest-gray)' }}
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
