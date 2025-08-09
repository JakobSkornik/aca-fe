import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameState } from '../contexts/GameStateContext'
import { Chess, Square } from 'chess.js'
import { Move } from '@/types/chess/Move'
import { useSquareFit } from '@/hooks/useSquareFit'

const MIN_BOARD_SIZE = 240
const BOARD_PADDING = 8

/**
 * PreviewChessboard Component
 * 
 * Displays either preview moves or falls back to mainline moves.
 * Uses elegant helper functions for safe access to move data.
 * Automatically handles MoveList structure for both preview and mainline moves.
 */
const PreviewChessboard = () => {
  const { state, manager } = useGameState()
  const { previewMode, previewMoves, previewMoveIndex, currentMoveIndex, isLoaded } = state
  const [boardWidth, setBoardWidth] = useState<number>(0)
  const [currentPosition, setCurrentPosition] = useState<string>('start')
  const parentRef = useRef<HTMLDivElement>(null)
  const boardSize = useSquareFit(parentRef, { padding: BOARD_PADDING, min: MIN_BOARD_SIZE })

  // Sizing handled by useSquareFit

  // Get the current position based on mode
  const getCurrentPosition = () => {
    if (previewMode) {
      return manager.getPreviewPosition(previewMoveIndex)
    } else {
      return manager.getCurrentPosition(currentMoveIndex)
    }
  }

  // Get the current captures based on mode
  const getCurrentCaptures = () => {
    if (previewMode) {
      return manager.getPreviewCaptures(previewMoveIndex)
    } else {
      return manager.getCapturesForMove(currentMoveIndex)
    }
  }

  // Update current position when the display position changes
  useEffect(() => {
    const position = getCurrentPosition()
    if (position) {
      setCurrentPosition(position)
    }
  }, [previewMode, previewMoveIndex, currentMoveIndex, previewMoves.getLength()])

  // Handle making a move on the chessboard
  const handleDrop = (sourceSquare: Square, targetSquare: Square) => {
    try {
      // Use chess.js to validate and create the move
      const chess = new Chess(currentPosition)

      // Let chess.js handle all validation - it will reject invalid moves automatically
      const moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })

      if (!moveResult) {
        console.log('Move was rejected by chess.js')
        return false
      }

      // Create the new move object
      const newMove: Move = {
        id: manager.getNextId(),
        depth: -1,
        position: moveResult.after,
        move: moveResult.from + moveResult.to,
        isAnalyzed: false,
        context: 'preview',
        piece: `${moveResult.color}${moveResult.piece}`
      }

      if (!previewMode) {
        // Not in preview mode
        const mainlineMoves = manager.getMainlineMovesList()
        const nextMove = mainlineMoves[currentMoveIndex + 1]

        if (nextMove && newMove.position === nextMove.position) {
          // Move matches the next mainline move - just advance
          manager.moveNext()
          return true
        } else {
          // First advance to the next position, then enter preview mode
          manager.moveNext()
          manager.enterPreviewModeWithMove(newMove)
          return true
        }
      } else {
        // Already in preview mode
        const previewMovesList = previewMoves.getMainlineMoves()
        const nextPreviewMove = previewMovesList[previewMoveIndex + 1]

        if (nextPreviewMove && newMove.position === nextPreviewMove.position) {
          // Move matches the next preview move - just advance
          manager.moveNext()
          return true
        } else {
          manager.clearPreviewMovesFromIndex(previewMoveIndex + 1)
          manager.addPreviewMove(newMove)
          return true
        }
      }
    } catch (error) {
      console.error('Error making move:', error)
      return false
    }
  }

  // Get current position and captures
  const displayCaptures = getCurrentCaptures()

  // Format captures for display
  const whiteCapturesString = manager.formatCapturesForDisplay(displayCaptures.capturedByWhite, true)
  const blackCapturesString = manager.formatCapturesForDisplay(displayCaptures.capturedByBlack, false)

  return (
    <div ref={parentRef} className="flex flex-col w-full items-center px-2 py-2 border-r">
      {isLoaded && (
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Captured: {blackCapturesString}</p>
        </div>
      )}
      {boardSize > 0 && (
        <div className={`align-center justify-center ${previewMode ? 'selected-shadow' : ''}`} style={{ width: boardSize, height: boardSize }}>
          <Chessboard
            position={currentPosition}
            boardWidth={boardSize}
            customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
            customNotationStyle={{ color: 'var(--darkest-gray)' }}
            onPieceDrop={handleDrop}
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

export default PreviewChessboard
