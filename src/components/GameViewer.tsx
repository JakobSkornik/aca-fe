import Image from 'next/image'
import React, { useEffect, useRef, useState } from 'react'
import MoveTree from './MoveTree'
import { useGameState } from '../contexts/GameStateContext'

const GameViewer = ({
  onArrowHover,
}: {
  onArrowHover: (arrow: string | null) => void
}) => {
  const listRef = useRef<HTMLDivElement>(null)
  const { gameState, setGameState } = useGameState()
  const { moves, currentMoveIndex, game, moveTree } = gameState
  const { Result, Opening } = game?.header() || { Result: '', Opening: '' }
  const [animatedScore, setAnimatedScore] = useState(50) // Default to even position
  const [showMoveTree, setShowMoveTree] = useState(false)

  const handleMoveNavigation = (action: 'first' | 'prev' | 'next' | 'last') => {
    let newIndex = currentMoveIndex || 0
    switch (action) {
      case 'first':
        newIndex = 0
        break
      case 'prev':
        newIndex = Math.max(0, newIndex - 1)
        break
      case 'next':
        newIndex = Math.min((moves?.length || 1) - 1, newIndex + 1)
        break
      case 'last':
        newIndex = (moves?.length || 1) - 1
        break
    }
    setGameState((prev) => ({ ...prev, currentMoveIndex: newIndex }))
  }

  const handleRowClick = (index: number) => {
    setGameState((prev) => ({ ...prev, currentMoveIndex: index }))
  }

  // Replace the current useEffect for scrolling
  useEffect(() => {
    if (listRef.current && moves?.length) {
      const activeItem = listRef.current.querySelector(
        `.move-item-${currentMoveIndex}`
      )
      if (activeItem) {
        // Get container dimensions
        const container = listRef.current
        const containerRect = container.getBoundingClientRect()

        // Get item dimensions
        const itemRect = activeItem.getBoundingClientRect()

        // Calculate if item is in view
        const isInView =
          itemRect.top >= containerRect.top &&
          itemRect.bottom <= containerRect.bottom

        // Only scroll if not in view
        if (!isInView) {
          // Calculate scroll position (center the item)
          const scrollTop =
            itemRect.top -
            containerRect.top +
            container.scrollTop -
            containerRect.height / 2 +
            itemRect.height / 2

          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
          })
        }
      }
    }
  }, [currentMoveIndex, moves?.length])

  const currentMove = moves?.[currentMoveIndex || 0]
  const deep_score = currentMove?.deep_score || 0
  // const shallow_score = currentMove?.shallow_score || 0
  const bestContinuations = currentMove?.bestContinuations || []
  const sideToMove = (currentMoveIndex || 0) % 2 === 0 ? 'White' : 'Black' // Determine side to move

  const normalizeScore = (score: number) => {
    // Convert engine scores (centipawns) to a percentage using sigmoid
    // Divide by 100 to convert centipawns to pawns
    const scoreInPawns = score / 100

    // Use sigmoid function: 1 / (1 + e^(-k*x))
    // Where k controls the steepness of the curve (sensitivity to score)
    const k = 1 // Steepness factor - higher = steeper curve
    const sigmoid = 1 / (1 + Math.exp(-k * scoreInPawns))

    // Convert to percentage (0-100)
    return sigmoid * 100
  }

  useEffect(() => {
    // Use deep score for visualization
    const normalizedScore = normalizeScore(deep_score)
    setAnimatedScore(normalizedScore)
  }, [deep_score])

  const handleHoverMove = (arrow: string | null) => {
    onArrowHover(arrow)
  }

  return (
    <div className="relative flex flex-col w-[400px] h-screen border border-gray-300 rounded-md">
      {/* Top Section: Game Information */}
      <div className="p-4 border-b bg-white z-10 sticky top-0">
        <div className="flex justify-between items-center">
          <div>
            <p>
              <strong>Result:</strong> {Result || 'N/A'}
            </p>
            <p>
              <strong>Opening:</strong> {Opening || 'Unknown'}
            </p>
          </div>
          <button
            onClick={() => setShowMoveTree(true)}
            className="px-2 py-2 bg-dark-gray text-white rounded-md text-sm hvr-shadow"
          >
            <Image src="/icons/tree.svg" alt="Tree" height={24} width={24} />
          </button>
        </div>
      </div>

      {/* Score Visualization */}
      <div className="p-4 border-b bg-white z-10 sticky">
        <div className="flex items-center justify-between">
          <span className="text-sm">White</span>
          <span className="text-sm">Black</span>
        </div>
        <div className="relative h-4 bg-dark-gray rounded-full">
          <div
            className="absolute h-full bg-light-gray transition-[width] duration-500"
            style={{
              width: `${animatedScore}%`,
              left: 0,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {(deep_score / 100).toFixed(2)}
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
                backgroundColor: sideToMove === 'White' ? '#eaeaea' : '#666666',
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {bestContinuations.map((move, index) => {
            const isWhiteMove = (currentMoveIndex || 0) % 2 === 1
            // Handle both string and object formats for bestContinuations
            const moveText = typeof move === 'string' ? move : move.move
            const moveScore = typeof move === 'string' ? null : move.score

            return (
              <button
                key={index}
                className="px-3 py-1 bg-gray-200 rounded-md text-sm hvr-shadow"
                style={{
                  backgroundColor: isWhiteMove ? '#666666' : '#eaeaea',
                  color: isWhiteMove ? 'white' : 'black',
                }}
                onMouseEnter={() => handleHoverMove(moveText)}
                onMouseLeave={() => handleHoverMove(null)}
              >
                <p className="text-sm font-semibold">{moveText}</p>
                {moveScore !== null && (
                  <p className="text-xs">{(moveScore / 100).toFixed(2)}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-b bg-white z-10 sticky flex justify-evenly">
        <button
          className="bg-dark-gray light-gray py-2 px-4 rounded-md hvr-shadow"
          onClick={() => handleMoveNavigation('first')}
        >
          <Image src="/icons/fast_back.svg" alt="⏮" height={24} width={24} />
        </button>
        <button
          className="bg-dark-gray light-gray py-2 px-4 rounded-md hvr-shadow"
          onClick={() => handleMoveNavigation('prev')}
        >
          <Image src="/icons/back.svg" alt="◀" height={24} width={24} />
        </button>
        <button
          className="bg-dark-gray light-gray py-2 px-4 rounded-md hvr-shadow"
          onClick={() => handleMoveNavigation('next')}
        >
          <Image src="/icons/forward.svg" alt="▶" height={24} width={24} />
        </button>
        <button
          className="bg-dark-gray light-gray py-2 px-4 rounded-md hvr-shadow"
          onClick={() => handleMoveNavigation('last')}
        >
          <Image src="/icons/fast_forward.svg" alt="⏭" height={24} width={24} />
        </button>
      </div>

      {/* Move List Section */}
      <div
        className="overflow-y-auto flex-1 p-4"
        ref={listRef}
        style={{ maxHeight: 'calc(100vh - 240px)' }} // Dynamic height calculation
      >
        <ul className="pb-20">
          {' '}
          {/* Add bottom padding to ensure last items are scrollable */}
          {moves?.map((moveData, index) => {
            const moveNumber = Math.floor((index + 1) / 2)
            const isWhiteMove = index % 2 === 1
            const scoreDisplay = (moveData.deep_score / 100).toFixed(2)

            // Define the selected style with orange shadow
            const selectedStyle =
              index === currentMoveIndex
                ? {
                    boxShadow: '0 0 3px 2px #ff770050',
                    position: 'relative' as const,
                    zIndex: 1,
                  }
                : {}

            return (
              <li
                key={index}
                className={`p-2 move-item-${index} ${
                  index === currentMoveIndex ? 'font-bold' : ''
                } ${
                  !isWhiteMove ? 'bg-light-gray' : ''
                } cursor-pointer flex justify-between rounded-md`}
                style={selectedStyle}
                onClick={() => handleRowClick(index)}
              >
                <div>
                  {isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`}{' '}
                  {moveData.move}
                </div>
                <div className="text-gray-600">{scoreDisplay}</div>
              </li>
            )
          })}
        </ul>
      </div>

      {showMoveTree && moveTree && (
        <MoveTree
          moveTree={moveTree}
          onClose={() => setShowMoveTree(false)}
          onArrowHover={onArrowHover}
        />
      )}

      {/* Debug info - can be removed in production */}
      <div className="p-2 text-xs text-gray-500 border-t bg-light-gray">
        <p>Position: {currentMove?.position || 'Starting position'}</p>
        <p>Move tree nodes: {moveTree ? Object.keys(moveTree).length : 0}</p>
      </div>
    </div>
  )
}

export default GameViewer
