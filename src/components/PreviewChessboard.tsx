import React, { useMemo, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import type { CustomSquareStyles } from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'
import { useSquareFit } from '@/hooks/useSquareFit'

const MIN_BOARD_SIZE = 200
const BOARD_PADDING = 8

const BEST_FROM_STYLE = { backgroundColor: 'rgba(0, 128, 255, 0.45)' }
const BEST_TO_STYLE = { backgroundColor: 'rgba(0, 128, 255, 0.60)', borderRadius: '50%' }

/**
 * Shows the engine's best continuation (PV1 first move) for the current mainline position.
 * Uses square highlights instead of arrows to avoid SVG marker-id collisions
 * with the main board (react-chessboard renders global arrowhead-N ids).
 */
const PreviewChessboard = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, isLoaded } = state
  const parentRef = useRef<HTMLDivElement>(null)
  const boardSize = useSquareFit(parentRef, { padding: BOARD_PADDING, min: MIN_BOARD_SIZE })

  const best = manager.getBestMoveForIndex(currentMoveIndex)

  const mainlineFen = manager.getCurrentPosition(currentMoveIndex)
  const displayFen = best?.fen || mainlineFen || 'start'

  const squareStyles = useMemo((): CustomSquareStyles => {
    if (!best?.from || !best?.to) return {}
    return {
      [best.from]: BEST_FROM_STYLE,
      [best.to]: BEST_TO_STYLE,
    } as CustomSquareStyles
  }, [best])

  const { capturedByWhite: whiteCaptures, capturedByBlack: blackCaptures } =
    manager.getCapturesForMove(currentMoveIndex)

  const whiteCapturesString = manager.formatCapturesForDisplay(whiteCaptures, true)
  const blackCapturesString = manager.formatCapturesForDisplay(blackCaptures, false)

  const label = best ? `Best: ${best.san}` : 'No engine line'

  return (
    <div ref={parentRef} className="flex flex-col w-full items-center px-2 py-2 border-r">
      {isLoaded && (
        <div className="text-center">
          <p className="text-sm text-gray-600">Captured: {blackCapturesString}</p>
        </div>
      )}
      {boardSize > 0 && (
        <div className="align-center justify-center ring-1 ring-offset-1 ring-blue-200/80 rounded" style={{ width: boardSize, height: boardSize }}>
          <Chessboard
            position={displayFen}
            boardWidth={boardSize}
            customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
            customNotationStyle={{ color: 'var(--darkest-gray)' }}
            customSquareStyles={Object.keys(squareStyles).length > 0 ? squareStyles : undefined}
            arePiecesDraggable={false}
            boardOrientation="white"
            showBoardNotation={true}
            snapToCursor={false}
          />
        </div>
      )}
      {isLoaded && (
        <div className="text-center mt-2 mb-1">
          <p className="text-sm font-semibold text-darkest-gray">{label}</p>
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
