import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Arrow } from 'react-chessboard/dist/chessboard/types'

import Comments from './Comments'
import { useGameState } from '../contexts/GameStateContext'
import { Chess, Square } from 'chess.js'
import { Move } from '@/types/chess/Move'

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
    setPreviewPvs,
    setPreviewMoveIndex,
    requestMoveAnalysis,
  } = useGameState()

  const {
    moves,
    movePvs,
    currentMoveIndex,
    previewMode,
    previewMoves,
    previewMovePvs,
    previewMoveIndex,
  } = gameState
  const [boardWidth, setBoardWidth] = useState<number>(0)

  const parentRef = useRef<HTMLDivElement>(null)
  const allMoves = previewMode ? gameState.previewMoves : gameState.moves
  const currentFen = allMoves[currentMoveIndex]?.position

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

    // Initial calculation
    handleResize()
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
        id: allMoves.length + 1,
        move: moveResult.san,
        position: moveResult.after,
        score: 0,
        isAnalyzed: false,
        context: 'preview',
        depth: moves[currentMoveIndex]?.depth ?? 0,
        piece: moveResult.piece,
      } as Move

      // dont switch to preview mode if the move is the same as the next move
      if (
        !previewMode &&
        newMove.position === allMoves[currentMoveIndex + 1]?.position
      ) {
        setCurrentMoveIndex(currentMoveIndex + 1)
        return true
      }

      const prevMoves = (!previewMode ? moves : previewMoves).slice(
        0,
        currentMoveIndex + 1
      )
      setPreviewMoves(prevMoves)

      const prevPvs = Object.fromEntries(
        Object.entries(!previewMode ? movePvs : previewMovePvs).filter(
          ([key]) => Number(key) <= currentMoveIndex
        )
      )
      setPreviewPvs(prevPvs)

      addPreviewMove(newMove)
      requestMoveAnalysis(newMove)
      setPreviewMoveIndex(previewMode ? previewMoveIndex : currentMoveIndex)
      setCurrentMoveIndex(currentMoveIndex + 1)
      setPreviewMode(true)
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
      className="flex flex-col w-full items-center p-4 border-r mx-auto"
    >
      {gameState.isLoaded && (
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">
            Captured: {blackCapturesString}
          </p>
        </div>
      )}
      {boardWidth > 0 && (
        <div className="align-center justify-center">
        <Chessboard
          position={currentFen}
          boardWidth={boardWidth}
          customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
          customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
          customNotationStyle={{ color: 'var(--darkest-gray)' }}
          customArrows={arrows}
          onPieceDrop={handleMove}
        />
      </div>)}
      {gameState.isLoaded && (
        <div className="text-center mb-2">
          <p className="text-sm text-gray-600">
            Captured: {whiteCapturesString}
          </p>
        </div>
      )}
      {/* {gameState.isLoaded && <Comments />} */}
    </div>
  )
}

export default ChessBoardSection
