import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import MoveTree from './MoveTree'
import { initialGameState, useGameState } from '../contexts/GameStateContext'

type GameViewerProps = {
  onArrowHover: (arrow: string | null) => void
  showFeatures: boolean
  setShowFeatures: (show: boolean) => void
}

const GameViewer = ({
  onArrowHover,
  showFeatures,
  setShowFeatures,
}: GameViewerProps) => {
  const listRef = useRef<HTMLDivElement>(null)
  const { gameState, setGameState } = useGameState()
  const { moves, currentMoveIndex, game, moveTree } = gameState
  const { Result, Opening } = game?.header() || { Result: '', Opening: '' }
  const [animatedScore, setAnimatedScore] = useState(50) // Default to even position
  const [showMoveTree, setShowMoveTree] = useState(false)

  const handleMoveNavigation = useCallback(
    (action: 'first' | 'prev' | 'next' | 'last') => {
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
    },
    [currentMoveIndex, moves?.length, setGameState]
  )

  const handleRowClick = (index: number) => {
    setGameState((prev) => ({ ...prev, currentMoveIndex: index }))
  }

  useEffect(() => {
    // Scroll to the active move item when the currentMoveIndex changes
    if (listRef.current && moves?.length) {
      const activeItem = listRef.current.querySelector(
        `.move-item-${currentMoveIndex}`
      )
      if (activeItem) {
        const container = listRef.current
        const containerRect = container.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        const isInView =
          itemRect.top >= containerRect.top &&
          itemRect.bottom <= containerRect.bottom

        if (!isInView) {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleMoveNavigation('prev')
      } else if (e.key === 'ArrowRight') {
        handleMoveNavigation('next')
      } else if (e.key === 'ArrowUp') {
        handleMoveNavigation('first')
      } else if (e.key === 'ArrowDown') {
        handleMoveNavigation('last')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentMoveIndex, handleMoveNavigation, moves.length])

  const currentMove = moves?.[currentMoveIndex || 0]
  const deep_score = currentMove?.deep_score || 0
  const bestContinuations = currentMove?.bestContinuations || []
  const stm = (currentMoveIndex || 0) % 2 === 0

  const normalizeScore = (score: number) => {
    // sigmoid function: 1 / (1 + e^(-k*x))
    // k controls the steepness of the curve (sensitivity to score)
    const scoreInPawns = score / 100
    const k = 1 // Steepness factor - higher = steeper curve
    const sigmoid = 1 / (1 + Math.exp(-k * scoreInPawns))
    return sigmoid * 100
  }

  useEffect(() => {
    const normalizedScore = normalizeScore(deep_score)
    setAnimatedScore(normalizedScore)
  }, [deep_score])

  const handleHoverMove = (arrow: string | null) => {
    onArrowHover(arrow)
  }

  const clearContext = () => {
    setGameState(initialGameState)
  }

  return (
    <div className="relative flex flex-col w-[400px] h-screen rounded-md">
      {/* Top Section: Game Information */}
      <div className="p-4 border-b z-10 sticky top-0">
        <div className="flex justify-between items-center">
          <div>
            <p>
              <strong>Result:</strong> {Result || 'N/A'}
            </p>
            <p>
              <strong>Opening:</strong> {Opening || 'Unknown'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearContext}
              className="px-2 py-2 bg-darkest-gray text-white rounded-md text-sm hvr-shadow"
            >
              <Image src="/icons/close.svg" alt="Tree" height={24} width={24} />
            </button>
            <button
              onClick={() => setShowMoveTree(true)}
              className="px-2 py-2 bg-darkest-gray text-white rounded-md text-sm hvr-shadow"
            >
              <Image src="/icons/tree.svg" alt="Tree" height={24} width={24} />
            </button>
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="px-2 py-2 bg-darkest-gray text-white rounded-md text-sm hvr-shadow"
            >
              <Image src="/icons/chart.svg" alt="Tree" height={24} width={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Score Visualization */}
      <div className="p-4 border-b z-10 sticky">
        <div className="flex items-center justify-between">
          <span className="text-sm">White</span>
          <span className="text-sm">Black</span>
        </div>
        <div className="relative h-4 bg-darkest-gray rounded-full">
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
      <div className="p-4 border-b z-10 sticky">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Best Continuations</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">STM</span>
            <div
              className="w-4 h-4 rounded-full"
              style={{
                backgroundColor: stm
                  ? 'var(--dark-gray)'
                  : 'var(--darkest-gray)',
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {bestContinuations.map((move, index) => {
            const moveText = typeof move === 'string' ? move : move.move
            const moveScore = typeof move === 'string' ? null : move.score

            return (
              <button
                key={index}
                className="px-3 py-1 bg-gray-200 rounded-md text-sm hvr-shadow"
                style={{
                  backgroundColor: stm
                    ? 'var(--dark-gray)'
                    : 'var(--darkest-gray)',
                  color: stm ? 'var(--darkest-gray)' : 'var(--lightest-gray)',
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
      <div className="p-4 border-b z-10 sticky flex justify-evenly">
        <button
          className="bg-darkest-gray light-gray py-2 px-4 rounded-md hvr-shadow"
          onClick={() => handleMoveNavigation('first')}
        >
          <Image src="/icons/fast_back.svg" alt="⏮" height={24} width={24} />
        </button>
        <button
          className="bg-darkest-gray light-gray py-2 px-4 rounded-md hvr-shadow"
          onClick={() => handleMoveNavigation('prev')}
        >
          <Image src="/icons/back.svg" alt="◀" height={24} width={24} />
        </button>
        <button
          className="bg-darkest-gray light-gray py-2 px-4 rounded-md hvr-shadow"
          onClick={() => handleMoveNavigation('next')}
        >
          <Image src="/icons/forward.svg" alt="▶" height={24} width={24} />
        </button>
        <button
          className="bg-darkest-gray light-gray py-2 px-4 rounded-md hvr-shadow"
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
            const isWhiteMove = index % 2 === 0
            const scoreDisplay = (moveData.deep_score / 100).toFixed(2)

            // Define the selected style with orange shadow
            const selectedStyle =
              index === currentMoveIndex
                ? {
                    boxShadow: '0 0 10px 3px var(--dark-gray)',
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
                  !isWhiteMove ? 'bg-lightest-gray' : 'bg-dark-gray'
                } cursor-pointer flex justify-between rounded-md`}
                style={selectedStyle}
                onClick={() => handleRowClick(index)}
              >
                <div>
                  {isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`}{' '}
                  {moveData.move}
                </div>
                <div className="var(--darkest-gray)">{scoreDisplay}</div>
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
    </div>
  )
}

export default GameViewer
