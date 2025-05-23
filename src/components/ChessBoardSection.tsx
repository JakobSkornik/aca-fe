import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Arrow } from 'react-chessboard/dist/chessboard/types'

import Comments from './Comments'
import { useGameState } from '../contexts/GameStateContext'
import { Chess, Square } from 'chess.js'

const PADDING_PX = 16
const MIN_BOARD_SIZE = 500

const WhiteCapturesMap: Record<string, string> = {
  p: '♙',
  n: '♘',
  b: '♗',
  r: '♖',
  q: '♕',
  k: '♔',
}

const BlackCapturesMap: Record<string, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
}

const ChessBoardSection = ({
  hoveredArrow,
}: {
  hoveredArrow: string | null
}) => {
  const {
    gameState,
    setCurrentMoveIndex,
    setPreviewMode,
    addPreviewMove,
    setPreviewMoves,
    setPreviewMoveIndex,
    requestMoveAnalysis,
  } = useGameState()

  const { moves, currentMoveIndex, previewMode } = gameState
  const [boardWidth, setBoardWidth] = useState<number>(0)

  const parentRef = useRef<HTMLDivElement>(null)
  const allMoves = previewMode ? gameState.previewMoves : gameState.moves
  const currentFen = allMoves[currentMoveIndex]?.position

  useEffect(() => {
    const handleResize = () => {
      if (parentRef.current) {
        const width = Math.max(
          parentRef.current.clientWidth - 2 * PADDING_PX,
          MIN_BOARD_SIZE
        )
        setBoardWidth(width)
      }
    }

    // Initial calculation
    handleResize()

    // Debounced resize observer
    const observer = new ResizeObserver(() => {
      setTimeout(handleResize, 50) // Debounce the resize observer
    })
    observer.observe(parentRef.current?.parentElement as Element)

    return () => observer.disconnect()
  }, [])

  // Making a move on the chessboard starts a preview session
  const handleMove = (sourceSquare: Square, targetSquare: Square) => {
    try {
      const move = new Chess(currentFen)
      const moveResult = move.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      const newMove = {
        move: moveResult.san,
        position: moveResult.after,
        score: 0,
        isAnalyzed: false,
        context: 'preview',
      }

      if (
        !previewMode &&
        newMove.position === allMoves[currentMoveIndex + 1]?.position
      ) {
        setCurrentMoveIndex(currentMoveIndex + 1)
        return true
      }

      if (!previewMode) {
        const prevMoves = moves.slice(0, currentMoveIndex + 1)
        setPreviewMoves(prevMoves)

        addPreviewMove(newMove)
        setPreviewMoveIndex(currentMoveIndex + 1)
        requestMoveAnalysis(newMove)
        setCurrentMoveIndex(currentMoveIndex + 1)
        setPreviewMode(true)
      }

      if (previewMode) {
        addPreviewMove(newMove)
        requestMoveAnalysis(newMove)
        setCurrentMoveIndex(currentMoveIndex + 1)
      }
      return true
    } catch {
      return false
    }
  }

  const headers = gameState.pgnHeaders

  // White captures black pieces
  const whiteCaptures = allMoves[currentMoveIndex]?.capturedByWhite
  const blackCaptures = allMoves[currentMoveIndex]?.capturedByBlack
  let whiteCapturesString = ['']
  if (whiteCaptures != null) {
    whiteCapturesString = Object.entries(whiteCaptures).map(
      ([piece, count]) => {
        return `${BlackCapturesMap[piece]} `.repeat(count)
      }
    )
  }
  let blackCapturesString = ['']
  if (blackCaptures != null) {
    blackCapturesString = Object.entries(blackCaptures).map(
      ([piece, count]) => {
        return `${WhiteCapturesMap[piece]} `.repeat(count)
      }
    )
  }

  const arrows = hoveredArrow
    ? ([
        [
          hoveredArrow.slice(0, 2) as Square,
          hoveredArrow.slice(2, 4) as Square,
          'var(--orange)',
        ],
      ] as Arrow[])
    : []

  return (
    <div
      ref={parentRef}
      className="flex flex-col w-full items-center p-4 border-r"
    >
      {gameState.isLoaded && (
        <div className="text-center mt-2">
          <h3 className="text-lg font-semibold">{headers?.blackName}</h3>
          <h3 className="text-md">{headers?.blackElo}</h3>
          <p className="text-sm text-gray-600">
            Captured: {blackCapturesString}
          </p>
        </div>
      )}
      {boardWidth > 0 && (
        <Chessboard
          position={currentFen}
          boardWidth={boardWidth}
          customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
          customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
          customNotationStyle={{ color: 'var(--darkest-gray)' }}
          customArrows={arrows}
          onPieceDrop={handleMove}
        />
      )}
      {gameState.isLoaded && (
        <div className="text-center mb-2">
          <h3 className="text-lg font-semibold">{headers?.whiteName}</h3>
          <h3 className="text-md">{headers?.whiteElo}</h3>
          <p className="text-sm text-gray-600">
            Captured: {whiteCapturesString}
          </p>
        </div>
      )}
      {gameState.isLoaded && <Comments />}
    </div>
  )
}

export default ChessBoardSection
