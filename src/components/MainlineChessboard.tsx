import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameState } from '../contexts/GameStateContext'

const PADDING_PX = 16
const MIN_BOARD_SIZE = 300
const FIXED_BOARD_SIZE = 300

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
        // Check if we're in a fixed-width container (smaller screens)
        const containerWidth = parentRef.current.clientWidth
        const containerHeight = parentRef.current.clientHeight
        
        // Use fixed size for smaller screens or when container is constrained
        if (containerWidth <= FIXED_BOARD_SIZE + 32) { // 32px for padding
          setBoardWidth(FIXED_BOARD_SIZE - 2 * PADDING_PX)
        } else {
          // Use responsive sizing for larger screens
          const width = Math.max(
            containerHeight - 2 * PADDING_PX,
            MIN_BOARD_SIZE
          )
          setBoardWidth(width)
        }
      }
    }
    
    // Use a debounced resize handler to prevent excessive updates
    let resizeTimeout: NodeJS.Timeout
    const debouncedHandleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 100)
    }
    
    handleResize()
    
    // Add resize listener for responsive behavior
    window.addEventListener('resize', debouncedHandleResize)
    return () => {
      window.removeEventListener('resize', debouncedHandleResize)
      clearTimeout(resizeTimeout)
    }
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
