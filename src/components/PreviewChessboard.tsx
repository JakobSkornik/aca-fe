import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Arrow } from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'
import { Chess, Square } from 'chess.js'
import { Move } from '@/types/chess/Move'
import { 
  getPositionForIndex, 
  getCapturesForMove as getCapturesHelper,
  formatCapturesForDisplay as formatCaptures
} from '@/helpers/moveListUtils'

const PADDING_PX = 16
const MIN_BOARD_SIZE = 500

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
  const parentRef = useRef<HTMLDivElement>(null)

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

  // Use manager helpers for safe access
  const getPreviewPosition = () => {
    if (previewMode && previewMoves.length > 0 && previewMoveIndex >= 0) {
      return manager.getPreviewPosition(previewMoveIndex)
    }
    return null
  }

  const getPreviewCaptures = () => {
    if (previewMode && previewMoves.length > 0 && previewMoveIndex >= 0) {
      return manager.getPreviewCaptures(previewMoveIndex)
    }
    return { capturedByWhite: undefined, capturedByBlack: undefined }
  }

  // Determine what to display: preview or fallback to mainline
  const previewPosition = getPreviewPosition()
  const previewCaptures = getPreviewCaptures()
  
  const shouldShowPreview = previewMode && previewPosition !== null
  const displayPosition = shouldShowPreview 
    ? previewPosition 
    : manager.getCurrentPosition(currentMoveIndex)
    
  const displayCaptures = shouldShowPreview 
    ? previewCaptures 
    : manager.getCapturesForMove(currentMoveIndex)

  // Format captures for display
  const whiteCapturesString = manager.formatCapturesForDisplay(displayCaptures.capturedByWhite, true)
  const blackCapturesString = manager.formatCapturesForDisplay(displayCaptures.capturedByBlack, false)

  // Add this handler for making a move in preview mode
  const handleDrop = (sourceSquare: Square, targetSquare: Square) => {
    if (!previewMode) return false
    // Use chess.js to validate and create the move
    const chess = new Chess(displayPosition || undefined)
    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    if (move) {
      // Convert chess.js move to your Move type (add more fields as needed)
      const newMove: Move = {
        id: -1,
        depth: -1,
        position: chess.fen(),
        move: move.san,
        isAnalyzed: false,
        context: '',
        piece: move.piece,
        // annotation, score, phase, capturedByWhite, capturedByBlack, trace can be left undefined
      }
      manager.addPreviewMove(newMove)
      manager.commitPreviewToMainline()
      return true
    }
    return false
  }

  return (
    <div ref={parentRef} className="flex flex-col w-full items-center p-4 border-r mx-auto">
      {/* Preview mode indicator */}
      {previewMode && shouldShowPreview && (
        <div className="text-center mb-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            Preview Mode
          </span>
        </div>
      )}
      
      {isLoaded && (
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Captured: {blackCapturesString}</p>
        </div>
      )}
      {boardWidth > 0 && (
        <div className="align-center justify-center">
          <Chessboard
            position={displayPosition || undefined}
            boardWidth={boardWidth}
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
