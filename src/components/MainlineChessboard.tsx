import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Arrow } from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'
import { Chess, Square } from 'chess.js'
import { Move } from '@/types/chess/Move'

const PADDING_PX = 16
const MIN_BOARD_SIZE = 500

const WhiteCapturesMap: Record<string, string> = {
  p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔',
}
const BlackCapturesMap: Record<string, string> = {
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
}

const MainlineChessboard = ({ hoveredArrow }: { hoveredArrow: string | null }) => {
  const { gameState, setCurrentMoveIndex } = useGameState()
  const { moves, currentMoveIndex } = gameState
  const [boardWidth, setBoardWidth] = useState<number>(0)
  const parentRef = useRef<HTMLDivElement>(null)
  const currentFen = moves[currentMoveIndex]?.position
  const whiteCaptures = moves[currentMoveIndex]?.capturedByWhite
  const blackCaptures = moves[currentMoveIndex]?.capturedByBlack

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

  const arrows = hoveredArrow
    ? ([
        [
          hoveredArrow.slice(0, 2) as Square,
          hoveredArrow.slice(2, 4) as Square,
          'var(--orange)',
        ],
      ] as Arrow[])
    : []

  let whiteCapturesString = ['']
  if (whiteCaptures != null) {
    whiteCapturesString = Object.entries(whiteCaptures).map(
      ([piece, count]) => `${BlackCapturesMap[piece]} `.repeat(count)
    )
  }
  let blackCapturesString = ['']
  if (blackCaptures != null) {
    blackCapturesString = Object.entries(blackCaptures).map(
      ([piece, count]) => `${WhiteCapturesMap[piece]} `.repeat(count)
    )
  }

  return (
    <div ref={parentRef} className="flex flex-col w-full items-center p-4 border-r mx-auto">
      {gameState.isLoaded && (
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Captured: {blackCapturesString}</p>
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
          />
        </div>
      )}
      {gameState.isLoaded && (
        <div className="text-center mb-2">
          <p className="text-sm text-gray-600">Captured: {whiteCapturesString}</p>
        </div>
      )}
    </div>
  )
}

export default MainlineChessboard
