import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useGameState } from '../contexts/GameStateContext'

const GameViewer = ({
  onArrowHover,
}: {
  onArrowHover: (arrow: string | null) => void
}) => {
  const listRef = useRef<HTMLDivElement>(null)
  const { gameState, setGameState } = useGameState()
  const { moves, currentMoveIndex, game } = gameState
  const { Result, Opening } = game.header()
  const [hoveredMove, setHoveredMove] = useState<string | null>(null)
  const [animatedScore, setAnimatedScore] = useState(0)
  const [loadingMoveTree, setLoadingMoveTree] = useState(false)

  const handleMoveNavigation = (action: 'first' | 'prev' | 'next' | 'last') => {
    let newIndex = currentMoveIndex
    switch (action) {
      case 'first':
        newIndex = 0
        break
      case 'prev':
        newIndex = Math.max(0, currentMoveIndex - 1)
        break
      case 'next':
        newIndex = Math.min(moves.length - 1, currentMoveIndex + 1)
        break
      case 'last':
        newIndex = moves.length - 1
        break
    }
    setGameState((prev) => ({ ...prev, currentMoveIndex: newIndex }))
  }

  const handleRowClick = (index: number) => {
    setGameState((prev) => ({ ...prev, currentMoveIndex: index }))
  }

  useEffect(() => {
    if (listRef.current) {
      const activeItem = listRef.current.querySelector(
        `.move-item-${currentMoveIndex}`
      )
      if (activeItem) {
        const offset = 360
        const topPosition = activeItem.getBoundingClientRect().top
        const containerTop = listRef.current.getBoundingClientRect().top
        listRef.current.scrollBy({
          top: topPosition - containerTop - offset,
          behavior: 'smooth',
        })
      }
    }
  }, [currentMoveIndex])

  const currentMove = moves[currentMoveIndex]
  const score = currentMove?.score || 0
  const bestContinuations = currentMove?.bestContinuations || []
  const sideToMove = currentMoveIndex % 2 === 0 ? 'White' : 'Black' // Determine side to move

  const normalizeScore = (score: number) => {
    const yOffset = 0.5
    const xOffset = 0.5
    const x = score - xOffset
    const normalized = x / (1 + Math.abs(x)) + yOffset
    return normalized * 100
  }

  useEffect(() => {
    const blackScore = normalizeScore(score)
    setAnimatedScore(blackScore)
  }, [score])

  const handleHoverMove = (arrow: string | null) => {
    onArrowHover(arrow)
    setHoveredMove(arrow)
  }

  // New function to call API to enrich the PGN and retrieve the move tree
  const handleLoadMoveTree = async () => {
    try {
      setLoadingMoveTree(true)
      // Assuming game.pgn() returns the current PGN string
      const pgn = game.pgn()
      const response = await axios.post('/api/evaluator', { pgn, config: {} })
      const enrichedResult = response.data.enrichedPgn
      // Assume enrichedResult contains a moveTree property
      setGameState((prev) => ({
        ...prev,
        moveTree: enrichedResult.moveTree,
      }))
    } catch (error) {
      console.error('Error loading move tree:', error)
    } finally {
      setLoadingMoveTree(false)
    }
  }

  return (
    <div className="relative flex flex-col w-[400px] h-screen border border-gray-300 rounded-md overflow-hidden">
      {/* Top Section: Game Information */}
      <div className="p-4 border-b bg-white z-10 sticky top-0">
        <p>
          <strong>Result:</strong> {Result || 'N/A'}
        </p>
        <p>
          <strong>Opening:</strong> {Opening || 'Unknown'}
        </p>
      </div>

      {/* Score Visualization */}
      <div className="p-4 border-b bg-white z-10 sticky">
        <div className="flex items-center justify-between">
          <span className="text-sm">Black</span>
          <span className="text-sm">White</span>
        </div>
        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gray-400 transition-[width] duration-500"
            style={{
              width: `${animatedScore}%`,
              left: 0,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {score.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Best Continuations */}
      <div className="p-4 border-b bg-white z-10 sticky">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Best Continuations</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">STM</span>
            <div
              className="w-4 h-4 rounded-full"
              style={{
                backgroundColor: sideToMove === 'White' ? '#eaeaea' : '#444444',
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {bestContinuations.map((move, index) => {
            const isWhiteMove = currentMoveIndex % 2 === 1

            return (
              <button
                key={index}
                className="px-3 py-1 bg-gray-200 rounded-md text-sm hover:bg-gray-300"
                style={{
                  backgroundColor: isWhiteMove ? '#0a0a0acc' : '#dadada88',
                  color: isWhiteMove ? 'white' : 'black',
                  boxShadow:
                    hoveredMove === move ? '0 0 1px 4px #999999aa' : '',
                }}
                onMouseEnter={() => handleHoverMove(move)}
                onMouseLeave={() => handleHoverMove(null)}
              >
                <p className="text-sm font-semibold">{move.slice(0, 4)}</p>
                <p className="text-xs">{move.slice(6, -4)}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation and Move Tree Button */}
      <div className="p-4 border-b bg-white z-10 sticky flex justify-evenly">
        <button
          className="bg-gray-300 py-2 px-4 rounded-md"
          onClick={() => handleMoveNavigation('first')}
        >
          ⏮
        </button>
        <button
          className="bg-gray-300 py-2 px-4 rounded-md"
          onClick={() => handleMoveNavigation('prev')}
        >
          ◀
        </button>
        <button
          className="bg-gray-300 py-2 px-4 rounded-md"
          onClick={() => handleMoveNavigation('next')}
        >
          ▶
        </button>
        <button
          className="bg-gray-300 py-2 px-4 rounded-md"
          onClick={() => handleMoveNavigation('last')}
        >
          ⏭
        </button>
        {/* Button to load move tree from the API */}
        <button
          className="bg-blue-500 text-white py-2 px-4 rounded-md"
          onClick={handleLoadMoveTree}
          disabled={loadingMoveTree}
        >
          {loadingMoveTree ? 'Loading Tree...' : 'Load Move Tree'}
        </button>
      </div>

      {/* Move List Section */}
      <div className="overflow-y-auto flex-1 p-4 bg-gray-50" ref={listRef}>
        <ul>
          {moves.map(({ move, comment }, index) => {
            const moveNumber = Math.floor((index + 1) / 2)
            const isWhiteMove = index % 2 === 1
            return (
              <li
                key={index}
                className={`p-2 move-item-${index} ${
                  index === currentMoveIndex ? 'bg-gray-300 font-bold' : ''
                } ${!isWhiteMove ? 'bg-gray-200' : ''} cursor-pointer`}
                onClick={() => handleRowClick(index)}
              >
                {isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`} {move}{' '}
                {comment && (
                  <span className="text-gray-500">{`${comment}`}</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default GameViewer
