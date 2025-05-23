import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'

import MoveTree from './MoveTree'
import { useGameState } from '../contexts/GameStateContext'
import { Move } from '@/types/ws'
import Tooltip from './ui/Tooltip'

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
  const {
    gameState,
    resetGameState,
    setCurrentMoveIndex,
    requestMoveAnalysis,
    requestTraceTree,
    setPreviewMode,
    setPreviewMoves,
    setPreviewMoveIndex,
    addPreviewMove,
  } = useGameState()
  const {
    moves,
    currentMoveIndex,
    moveTree,
    previewMode,
    previewMoves,
    previewMoveIndex,
  } = gameState
  const { result, opening } = gameState?.pgnHeaders || {
    result: '',
    opening: '',
  }
  const [animatedScore, setAnimatedScore] = useState(50) // Default to even position
  const [showMoveTree, setShowMoveTree] = useState(false)
  const [currentMove, setCurrentMove] = useState<Move | null>(null)

  const displayedMoves = previewMode ? previewMoves : moves

  const handleMoveChange = useCallback(
    (newMoveIndex: number) => {
      if (!displayedMoves[newMoveIndex]) {
        return
      }

      if (!displayedMoves[newMoveIndex].isAnalyzed) {
        requestMoveAnalysis(displayedMoves[newMoveIndex])
      }

      setCurrentMove(displayedMoves[newMoveIndex])
      setCurrentMoveIndex(newMoveIndex)
    },
    [displayedMoves, requestMoveAnalysis, setCurrentMoveIndex]
  )

  const handleMoveNavigation = useCallback(
    (action: 'first' | 'prev' | 'next' | 'last' | 'click') => {
      let newIndex = currentMoveIndex || 0
      switch (action) {
        case 'first':
          newIndex = 0
          break
        case 'prev':
          newIndex = Math.max(0, newIndex - 1)
          break
        case 'next':
          newIndex = Math.min((displayedMoves?.length || 1) - 1, newIndex + 1)
          break
        case 'last':
          newIndex = (displayedMoves?.length || 1) - 1
          break
      }
      handleMoveChange(newIndex)
    },
    [currentMoveIndex, handleMoveChange, displayedMoves?.length]
  )

  const handleRowClick = (index: number) => {
    handleMoveChange(index)
  }

  useEffect(() => {
    setCurrentMove(displayedMoves?.[currentMoveIndex || 0] || null)
  }, [gameState, currentMoveIndex, displayedMoves])

  useEffect(() => {
    // Scroll to the active move item when the currentMoveIndex changes
    if (listRef.current && displayedMoves?.length) {
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
  }, [currentMoveIndex, displayedMoves?.length])

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
  }, [currentMoveIndex, handleMoveNavigation, displayedMoves.length])

  const handlePvHover = (pvMoves: string[], pvIdx: number) => {
    onArrowHover(pvMoves[pvIdx] || null)
  }

  const handlePvClick = (pvIdx: number, pvMoveIdx: number) => {
    const currentMoves = displayedMoves.slice(0, currentMoveIndex + 1)
    setPreviewMoves([...currentMoves])

    if (!previewMode) {
      setPreviewMoveIndex(currentMoveIndex)
    }

    const chess = new Chess(currentMove?.position || '')
    for (let i = 0; i <= pvMoveIdx; i++) {
      chess.move(displayedPvs[pvIdx].moves[i])
      const previewMove = {
        move: displayedPvs[pvIdx].moves[i],
        position: chess.fen(),
        isAnalyzed: false,
        context: 'preview',
      } as Move
      addPreviewMove(previewMove)
      requestMoveAnalysis(previewMove)
    }

    setPreviewMode(true)
    handleMoveChange(currentMoveIndex + 1 + pvMoveIdx)
  }

  const exitPreviewMode = () => {
    setPreviewMode(false)
    handleMoveChange(previewMoveIndex)
  }

  const handleShowMoveTree = () => {
    if (moves && moves.length > 0 && Object.keys(moveTree).length == 0) {
      requestTraceTree(moves)
    }
    setShowMoveTree(true)
  }

  const stm = (currentMoveIndex || 0) % 2 === 0
  const score = currentMove?.score ? currentMove.score : 0
  const pvs = currentMove?.pvs || []

  const displayedPvs = (() => {
    const validPvs = Array.isArray(pvs)
      ? pvs.filter((pv) => pv && typeof pv.score === 'number')
      : []
    const sortedPvs = [...validPvs].sort((a, b) =>
      stm ? b.score - a.score : a.score - b.score
    )
    return sortedPvs.slice(0, 3)
  })()

  const normalizeScore = (score: number) => {
    // sigmoid function: 1 / (1 + e^(-k*x))
    // k controls the steepness of the curve (sensitivity to score)
    const scoreInPawns = score / 100
    const k = 1 // Steepness factor - higher = steeper curve
    const sigmoid = 1 / (1 + Math.exp(-k * scoreInPawns))
    return sigmoid * 100
  }

  useEffect(() => {
    const normalizedScore = normalizeScore(score)
    setAnimatedScore(normalizedScore)
  }, [score])

  // const handleHoverMove = (arrow: string | null) => {
  //   onArrowHover(arrow)
  // }

  const clearContext = () => {
    resetGameState()
  }

  return (
    <div className="relative flex flex-col w-[400px] h-screen rounded-md">
      {/* Top Section: Game Information */}
      <div className="p-4 border-b z-10 sticky top-0">
        <div className="flex justify-between items-center">
          {!previewMode && (
            <div>
              <p>
                <strong>Result:</strong> {result || 'N/A'}
              </p>
              <p className="text-sm">
                <strong>Opening:</strong> {opening || 'Unknown'}
              </p>
            </div>
          )}
          {previewMode && (
            <div>
              <p>
                <strong>Previewing:</strong> {currentMove?.move || 'N/A'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Tooltip content="Close analysis session">
              <button
                onClick={clearContext}
                className="px-2 py-2 bg-darkest-gray text-white rounded-md text-sm hvr-shadow"
              >
                <Image
                  src="/icons/close.svg"
                  alt="Close"
                  height={24}
                  width={24}
                />
              </button>
            </Tooltip>
            <Tooltip content="Show move tree">
              <button
                onClick={handleShowMoveTree}
                className="px-2 py-2 bg-darkest-gray text-white rounded-md text-sm hvr-shadow"
              >
                <Image
                  src="/icons/tree.svg"
                  alt="Tree"
                  height={24}
                  width={24}
                />
              </button>
            </Tooltip>
            <Tooltip content="Show feature charts">
              <button
                onClick={() => setShowFeatures(!showFeatures)}
                className="px-2 py-2 bg-darkest-gray text-white rounded-md text-sm hvr-shadow"
              >
                <Image
                  src="/icons/chart.svg"
                  alt="Chart"
                  height={24}
                  width={24}
                />
              </button>
            </Tooltip>
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
            className="absolute h-full bg-light-gray transition-[width] duration-500 rounded-full"
            style={{
              width: `${animatedScore}%`,
              left: 0,
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{
              color: score > 0 ? 'var(--darkest-gray)' : 'var(--lightest-gray)',
            }}
          >
            {(score / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Best Continuations */}
      <div className="p-4 border-b z-10 sticky overflow-x-auto">
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
        <div className="flex flex-col gap-2 mt-2">
          {[0, 1, 2].map((rowIdx) => {
            const pv = displayedPvs[rowIdx]

            if (!pv) {
              // Return an empty placeholder row with consistent height
              return (
                <div
                  key={`empty-${rowIdx}`}
                  className="flex items-center gap-1 no-wrap"
                  style={{ minHeight: '30px' }}
                />
              )
            }

            return (
              <div key={rowIdx} className="flex items-center gap-1 no-wrap">
                <span className="text-sm font-semibold mr-1">
                  {(pv.score / 100).toFixed(2)}:
                </span>
                {pv.moves.map((pvMoveText, moveInPvIdx) => {
                  const isWhiteMoveInThisPvStep = stm
                    ? moveInPvIdx % 2 === 0
                    : moveInPvIdx % 2 !== 0

                  return (
                    <div
                      key={`${rowIdx}-${moveInPvIdx}`}
                      className="px-2 py-0.5 rounded text-sm cursor-pointer hvr-shadow"
                      style={{
                        backgroundColor: isWhiteMoveInThisPvStep
                          ? 'var(--light-gray)'
                          : 'var(--darkest-gray)',
                        color: isWhiteMoveInThisPvStep
                          ? 'var(--darkest-gray)'
                          : 'var(--lightest-gray)',
                      }}
                      onMouseEnter={() =>
                        handlePvHover(
                          pv.moves.slice(0, moveInPvIdx + 1),
                          moveInPvIdx
                        )
                      }
                      onMouseLeave={() => handlePvHover([], 0)}
                      onClick={() => handlePvClick(rowIdx, moveInPvIdx)}
                    >
                      {pvMoveText}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-b z-10 sticky flex justify-evenly">
        <Tooltip content="First move">
          <button
            className="bg-darkest-gray light-gray py-2 px-4 rounded-md hvr-shadow"
            onClick={() => handleMoveNavigation('first')}
          >
            <Image src="/icons/fast_back.svg" alt="⏮" height={24} width={24} />
          </button>
        </Tooltip>
        <Tooltip content="Previous move">
          <button
            className="bg-darkest-gray light-gray py-2 px-4 rounded-md hvr-shadow"
            onClick={() => handleMoveNavigation('prev')}
          >
            <Image src="/icons/back.svg" alt="◀" height={24} width={24} />
          </button>
        </Tooltip>
        <Tooltip content="Next move">
          <button
            className="bg-darkest-gray light-gray py-2 px-4 rounded-md hvr-shadow"
            onClick={() => handleMoveNavigation('next')}
          >
            <Image src="/icons/forward.svg" alt="▶" height={24} width={24} />
          </button>
        </Tooltip>
        <Tooltip content="Last move">
          <button
            className="bg-darkest-gray light-gray py-2 px-4 rounded-md hvr-shadow"
            onClick={() => handleMoveNavigation('last')}
          >
            <Image
              src="/icons/fast_forward.svg"
              alt="⏭"
              height={24}
              width={24}
            />
          </button>
        </Tooltip>
        {previewMode && (
          <Tooltip content="Exit variation preview">
            <button
              className="bg-orange-500 text-white py-2 px-4 rounded-md hvr-shadow"
              onClick={exitPreviewMode}
            >
              <Image
                src="/icons/close.svg"
                alt="Exit Preview"
                height={24}
                width={24}
              />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Move List Section */}
      <div
        className="overflow-y-auto flex-1 p-4"
        ref={listRef}
        style={{ maxHeight: 'calc(100vh - 240px)' }} // Dynamic height calculation
      >
        <ul className="pb-20">
          {' '}
          {displayedMoves?.map((moveData, index) => {
            const moveNumber = Math.floor((index + 1) / 2)
            const isWhiteMove = index % 2 === 0
            const scoreDisplay =
              moveData.score !== undefined
                ? (moveData.score / 100).toFixed(2)
                : ''
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
