import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'

import MoveTree from './MoveTree'
import Tooltip from './ui/Tooltip'
import { Move } from '@/types/chess/Move'
import { UIHelpers } from '@/helpers/uiHelpers'
import { useGameState } from '@/contexts/GameStateContext'
import Comments from './Comments'
import { 
  getMainlineMove as getMainlineMoveHelper, 
  getPvMoves as getPvMovesHelper,
  getMainlineMoveCount as getMoveCountHelper,
  getMoveFromPv,
  getFirstMoveFromPv
} from '@/helpers/moveListUtils'
import { get } from 'http'

type GameViewerProps = {}

const GameViewer = () => {
  const listRef = useRef<HTMLDivElement>(null)
  const { state, manager } = useGameState()
  const {
    moves,
    currentMoveIndex,
    previewMode,
    previewMoves,
    previewMoveIndex,
    isAnalysisInProgress,
    analysisProgress,
    isFullyAnalyzed,
    pgnHeaders,
  } = state
  const { result, opening, whiteName, whiteElo, blackName, blackElo } = pgnHeaders || {
    result: '',
    opening: '',
    whiteName: '',
    whiteElo: '',
    blackName: '',
    blackElo: '',
  }
  const [animatedScore, setAnimatedScore] = useState(-1)
  const [showMoveTree, setShowMoveTree] = useState(false)

  const displayedMoves = previewMode ? previewMoves : moves

  // Always derive the mainline move for score display
  const mainlineMove = previewMode
    ? previewMoves[previewMoveIndex]?.[0] || null
    : manager.getMainlineMove(currentMoveIndex)
  const score = mainlineMove?.score ?? 0

  // Get PVs for the current position using manager
  const getCurrentPvs = () => {
    if (previewMode) {
      const pvMoves = manager.getPvMoves(previewMoveIndex)
      return pvMoves.length > 0 ? [pvMoves] : []
    } else {
      const pvMoves = manager.getPvMoves(currentMoveIndex)
      return pvMoves.length > 0 ? [pvMoves] : []
    }
  }

  const handleMoveChange = useCallback(
    (newMoveIndex: number) => {
      const mainlineMove = manager.getMainlineMove(newMoveIndex)
      if (!mainlineMove) return
      if (!mainlineMove.isAnalyzed) {
        manager.requestMoveAnalysis(mainlineMove)
      }
      manager.goToMove(newMoveIndex)
    },
    [manager]
  )

  const handleMoveNavigation = useCallback(
    (action: 'first' | 'prev' | 'next' | 'last' | 'click') => {
      const totalMoves = manager.getMainlineMoveCount()
      let newIndex = currentMoveIndex || 0
      switch (action) {
        case 'first':
          newIndex = 0
          break
        case 'prev':
          newIndex = Math.max(0, newIndex - 1)
          break
        case 'next':
          newIndex = Math.min(totalMoves - 1, newIndex + 1)
          break
        case 'last':
          newIndex = totalMoves - 1
          break
      }
      handleMoveChange(newIndex)
    },
    [currentMoveIndex, handleMoveChange, manager]
  )

  useEffect(() => {
    const firstMove = manager.getMainlineMove(0)
    if (firstMove && !firstMove.isAnalyzed) {
      manager.requestMoveAnalysis(firstMove)
    }
  }, [displayedMoves, manager])

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

  // Prevent horizontal scrolling on left/right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handlePvClick = (pvIdx: number, pvMoveIdx: number) => {
    const startIdx = currentMoveIndex
    // Mainline up to current index
    const currentMoves = moves.slice(0, startIdx + 1).map(m => [...m])
    // PV moves up to and including clicked
    const pvMoves = getCurrentPvs()[pvIdx].slice(0, pvMoveIdx + 1)
    const pvMoveList = pvMoves.map(m => [m])
    // Combine
    const previewMoves = [...currentMoves, ...pvMoveList]
    manager.setPreviewMoves(previewMoves, previewMoves.length - 1)
    manager.enterPreviewMode()
  }

  const exitPreviewMode = () => {
    manager.exitPreviewMode()
    manager.goToMove(currentMoveIndex || 0)
  }

  const handleShowMoveTree = () => {
    setShowMoveTree(true)
  }

  const stm = previewMode
    ? previewMoveIndex % 2 === 1
    : (currentMoveIndex || 0) % 2 === 1
  const pvs = getCurrentPvs()

  const displayedPvs = (() => {
    const sortedPvs = [...pvs].sort((pvA, pvB) => {
      const scoreA = getFirstMoveFromPv(pvA)?.score ?? 0
      const scoreB = getFirstMoveFromPv(pvB)?.score ?? 0
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
    manager.disconnectSession()
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
                <strong>Previewing:</strong> {mainlineMove?.move || 'N/A'}
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
              {(() => {
                const firstMove = getFirstMoveFromPv(pv)
                return firstMove && firstMove.score !== undefined 
                  ? (firstMove.score / 100).toFixed(2) 
                  : ''
              })()}
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
              onClick={() => manager.requestFullGameAnalysis()}
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
