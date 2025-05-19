import React, { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameState } from '../contexts/GameStateContext'
import { Arrow, Square } from 'react-chessboard/dist/chessboard/types'
import Comments from './Comments'

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
  const { gameState } = useGameState()
  const { moves, moveTree, currentMoveIndex } = gameState
  const [boardWidth, setBoardWidth] = useState<number>(0)

  const parentRef = useRef<HTMLDivElement>(null)

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

  const fen = moves[currentMoveIndex].position
  const headers = gameState.game.getHeaders()
  const whiteCaptures = moves[currentMoveIndex].capturedByWhite
  const blackCaptures = moves[currentMoveIndex].capturedByBlack

  const whiteCapturesString = Object.entries(whiteCaptures).map(
    ([piece, count]) => {
      return `${WhiteCapturesMap[piece]} `.repeat(count)
    }
  )

  const blackCapturesString = Object.entries(blackCaptures).map(
    ([piece, count]) => {
      return `${BlackCapturesMap[piece]} `.repeat(count)
    }
  )
  const arrows = hoveredArrow
    ? ([
        [
          hoveredArrow.slice(0, 2) as Square,
          hoveredArrow.slice(2, 4) as Square,
          'var(--orange)'
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
          <h3 className="text-lg font-semibold">{headers['Black']}</h3>
          <h3 className="text-md">{headers['BlackElo']}</h3>
          <p className="text-sm text-gray-600">
            Captured: {blackCapturesString}
          </p>
        </div>
      )}
      {boardWidth > 0 && (
        <Chessboard
        position={fen}
        boardWidth={boardWidth}
        customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
        customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
        customNotationStyle={{ color: 'var(--darkest-gray)' }}
        customArrows={arrows}
        />
      )}
      {gameState.isLoaded && (
        <div className="text-center mb-2">
          <h3 className="text-lg font-semibold">{headers['White']}</h3>
          <h3 className="text-md">{headers['WhiteElo']}</h3>
          <p className="text-sm text-gray-600">
            Captured: {whiteCapturesString}
          </p>
        </div>
      )}
      {moveTree != null && (
        <Comments moveTree={moveTree} currentMoveIndex={currentMoveIndex} />
      )}
    </div>
  )
}

export default ChessBoardSection
