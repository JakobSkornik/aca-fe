import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'

import MoveTree from './MoveTree'
import Tooltip from './ui/Tooltip'
import { Move } from '@/types/chess/Move'
import { UIHelpers } from '@/helpers/uiHelpers'
import { useGameState } from '@/contexts/GameStateContext'
import Comments from './Comments'

type GameViewerProps = {}

const GameViewer = () => {
  const listRef = useRef<HTMLDivElement>(null)
  const {
    gameState,
    resetGameState,
    setCurrentMoveIndex,
    requestMoveAnalysis,
    requestFullGameAnalysis, // New
    setPreviewMode,
    setPreviewMoves,
    setPreviewPvs,
    setPreviewMoveIndex,
    addPreviewMove,
  } = useGameState()
  const {
    moves,
    movePvs,
    currentMoveIndex,
    previewMode,
    previewMoves,
    previewMovePvs,
    previewMoveIndex,
    isAnalysisInProgress,
    analysisProgress,
    isFullyAnalyzed,
  } = gameState
  const { result, opening, whiteName, whiteElo, blackName, blackElo } = gameState?.pgnHeaders || {
    result: '',
    opening: '',
    whiteName: '',
    whiteElo: '',
    blackName: '',
    blackElo: '',
  }
  const [animatedScore, setAnimatedScore] = useState(-1)
  const [showMoveTree, setShowMoveTree] = useState(false)
  const [currentMove, setCurrentMove] = useState<Move | null>(null)

  const displayedMoves = previewMode ? previewMoves : moves
  const activePvs = previewMode ? previewMovePvs : movePvs

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

  useEffect(() => {
    if (displayedMoves.length >= 1 && !displayedMoves[0].isAnalyzed) {
      requestMoveAnalysis(displayedMoves[0])
      setCurrentMove(displayedMoves[0])
    }
  }, [displayedMoves, requestMoveAnalysis])

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

  const handlePvClick = (pvIdx: number, pvMoveIdx: number) => {
    const startIdx = currentMoveIndex

    const currentMoves = previewMode
      ? previewMoves.slice(0, startIdx + 1)
      : moves.slice(0, startIdx + 1)
    setPreviewMoves([...currentMoves])

    // const currentPvs = Object.fromEntries(
    //   Object.entries(previewMode ? previewMovePvs : movePvs).filter(
    //     ([key]) => Number(key) <= startIdx
    //   )
    // )
    // setPreviewPvs(currentPvs)

    // if (!previewMode) {
    //   setPreviewMoveIndex(startIdx)
    // }

    // const chess = new Chess(currentMove?.position || '')
    for (let i = 0; i <= pvMoveIdx; i++) {
      // chess.move(displayedPvs[pvIdx][i].move)
      addPreviewMove(displayedPvs[pvIdx][i])
    }

    setPreviewMode(true)
    // handleMoveChange(startIdx + 1)
  }

  const exitPreviewMode = () => {
    setPreviewMode(false)
    setCurrentMoveIndex(currentMoveIndex || 0)
  }

  const handleShowMoveTree = () => {
    setShowMoveTree(true)
  }

  const stm = (currentMoveIndex || 0) % 2 === 1
  const score = currentMove?.score ? currentMove.score : 0
  const pvs = activePvs[currentMoveIndex] || []

  const displayedPvs = (() => {
    const sortedPvs = [...pvs].sort((pvA, pvB) => {
      const scoreA = pvA[0]?.score ?? 0
      const scoreB = pvB[0]?.score ?? 0
      return stm ? scoreB - scoreA : scoreA - scoreB
    })
    return sortedPvs.slice(0, 3)
  })()

  const normalizeScore = (score: number) => {
    const scoreInPawns = score / 100
    const k = 1
    const sigmoid = 1 / (1 + Math.exp(-k * scoreInPawns))
    return sigmoid * 100
  }

  useEffect(() => {
    const normalizedScore = normalizeScore(score)
    setAnimatedScore(normalizedScore)
  }, [score])

  const clearContext = () => {
    resetGameState()
  }

  return (
    <div className="relative flex flex-col w-[90%] h-screen rounded-md">
      {/* Top Section: Game Information */}
      <div className="p-4 border-b z-10 sticky top-0">
        <div className="flex justify-between items-start">
          {!previewMode && (
            <div>
              <p>
                <strong>White:</strong> {whiteName || 'N/A'}
              </p>
              <p className="text-sm">
                <strong>White ELO:</strong> {whiteElo || 'N/A'}
              </p>
              <p>
                <strong>Black:</strong> {blackName || 'N/A'}
              </p>
              <p className="text-sm">
                <strong>Black ELO:</strong> {blackElo || 'N/A'}
              </p>
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
                className={UIHelpers.getIconButtonClasses()}
              >
                <img src="/icons/close.svg" alt="Close" className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Show game tree">
              <button
                onClick={handleShowMoveTree}
                className={UIHelpers.getIconButtonClasses()}
              >
                <img src="/icons/tree.svg" alt="Tree" className="w-4 h-4" />
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

      {/* PVs */}
      <div className="p-2 space-y-1">
        {displayedPvs.map((pv, pvIdx) => (
          <div
            key={pvIdx}
            className="flex items-center text-xs"
          >
            <span className="font-bold mr-2 text-darkest-gray">
              {pv[0] && pv[0].score !== undefined && (pv[0].score / 100).toFixed(2)}
            </span>
            <div className="flex space-x-1">
              {pv.map((move, moveIdx) => {
                const isWhiteMove = (currentMoveIndex + moveIdx) % 2 === 1;
                const moveColors = UIHelpers.getPvMoveColors(false, isWhiteMove);
                return (
                  <span
                    key={moveIdx}
                    className={`p-1 ${moveColors.bg} ${moveColors.text} rounded-sm cursor-pointer hover:bg-gray-300`}
                    onClick={() => {
                      const originalPvIdx = pvs.findIndex(
                        (originalPv) => originalPv === pv
                      )
                      handlePvClick(originalPvIdx, moveIdx)
                    }}
                  >
                    {move.move}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Analysis Status */}
      {!isFullyAnalyzed && (
        <div className="p-2 text-center">
          {isAnalysisInProgress ? (
            <div>
              <p className="text-sm text-gray-600">
                Analyzing...{analysisProgress.toFixed(0)}%
              </p>
              <div className="relative h-4 bg-darkest-gray rounded-full w-full">
                <div
                  className="absolute h-full bg-light-gray transition-[width] duration-500 rounded-full"
                  style={{ width: `${analysisProgress}%`, left: 0 }}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ color: 'var(--lightest-gray)' }}
                >
                  {analysisProgress.toFixed(0)}%
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => requestFullGameAnalysis()}
              className={UIHelpers.getPrimaryButtonClasses(isAnalysisInProgress)}
              disabled={isAnalysisInProgress}
            >
              Run Full Analysis
            </button>
          )}
        </div>
      )}

      {/* Move navigation */}
      <div className="flex justify-center items-center space-x-2 p-2 rounded-b-md">
        <button
          onClick={() => handleMoveNavigation('first')}
          className={UIHelpers.getButtonClasses()}
        >
          <img
            src="/icons/fast_back.svg"
            alt="First"
            className="w-4 h-4"
          />
        </button>
        <button
          onClick={() => handleMoveNavigation('prev')}
          className={UIHelpers.getButtonClasses()}
        >
          <img src="/icons/back.svg" alt="Previous" className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleMoveNavigation('next')}
          className={UIHelpers.getButtonClasses()}
        >
          <img src="/icons/forward.svg" alt="Next" className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleMoveNavigation('last')}
          className={UIHelpers.getButtonClasses()}
        >
          <img
            src="/icons/fast_forward.svg"
            alt="Last"
            className="w-4 h-4"
          />
        </button>
        {previewMode &&(<button
          onClick={() => exitPreviewMode()}>
          <img
            src="/icons/close.svg"
            alt="Close"
            className="w-4 h-4"
          />
        </button>)}
      </div>

      {showMoveTree && (
        <MoveTree
          onClose={() => setShowMoveTree(false)}
        />
      )}

      {/* Comments Section */}
      <div className="p-4 border-t z-10">
        <Comments />
      </div>
    </div>
  )
}

export default GameViewer
