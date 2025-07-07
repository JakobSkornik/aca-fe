import React, { useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useGameState } from '@/contexts/GameStateContext'
import { UIHelpers } from '@/helpers/uiHelpers'
import { Move } from '@/types/chess/Move'
import Tooltip from './ui/Tooltip'

const MoveList = () => {
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLDivElement>(null)
  const { state, manager } = useGameState()
  const {
    currentMoveIndex,
    previewMode,
    previewMoves,
    previewMoveIndex,
    isAnalysisInProgress,
    analysisProgress,
    isFullyAnalyzed
  } = state

  // Get displayed moves from manager
  const displayedMoves = manager.getDisplayedMovesList()
  const displayedPreviewMoves = manager.getDisplayedPreviewMovesList()
  const displayLength = 300

  // Get the index to follow for scrolling (previewMoveIndex in preview mode, currentMoveIndex otherwise)
  const scrollFollowIndex = previewMode ? (currentMoveIndex + previewMoveIndex) : currentMoveIndex

  // Navigation handlers
  const handleMoveNavigation = useCallback(
    (action: 'first' | 'prev' | 'next' | 'last') => {
      switch (action) {
        case 'first':
          manager.goToFirst()
          break
        case 'prev':
          manager.movePrev()
          break
        case 'next':
          manager.moveNext()
          break
        case 'last':
          manager.goToLast()
          break
      }
    },
    [manager]
  )

  const handlePvButton = () => {
    if (previewMode) {
      manager.exitPreviewMode()
    } else {
      manager.enterPreviewMode()
    }
  }

  const exitPreviewMode = () => {
    manager.exitPreviewMode()
    manager.goToMove(currentMoveIndex || 0)
  }

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        manager.exitPreviewMode()
      } else if (e.key === 'ArrowDown') {
        manager.enterPreviewMode()
      } else if (e.key === 'ArrowLeft') {
        manager.movePrev()
      } else if (e.key === 'ArrowRight') {
        manager.moveNext()
      } else if (e.key === 'Home') {
        manager.goToFirst()
      } else if (e.key === 'End') {
        manager.goToLast()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewMode, previewMoveIndex, currentMoveIndex, manager, displayedMoves.length, previewMoves])

  const handleRowClick = (index: number) => {
    if (previewMode) {
      // In preview mode, convert grid index to preview move index
      const previewIndex = index - currentMoveIndex
      if (previewIndex >= 0 && previewIndex < displayedPreviewMoves.length) {
        manager.setPreviewMoveIndex(previewIndex)
      }
    } else {
      manager.goToMove(index)
    }
  }

  const handlePvClick = (index: number, pvType: 'pv1' | 'pv2') => {
    if (!previewMode) {
      // Not in preview mode - enter preview mode with PV sequence
      const pvMoves = pvType === 'pv1' ? manager.getPv1(index) : manager.getPv2(index)
      if (pvMoves && pvMoves.length > 0) {
        manager.enterPreviewModeWithPvSequence(pvMoves, index)
      }
    } else {
      // Already in preview mode - add PV sequence to current preview
      const pvMoves = pvType === 'pv1' ? manager.getPv1(index) : manager.getPv2(index)
      if (pvMoves && pvMoves.length > 0) {
        manager.addPvSequenceToPreview(pvMoves, index)
      }
    }
  }

  const getPieceImg = (piece: string | undefined | null) => {
    if (!piece) return ''
    else return `/icons/pieces/${piece.toLowerCase()}.svg`
  }

  // Get annotation for a move
  const getMoveAnnotation = (index: number): string | undefined => {
    if (previewMode) {
      // In preview mode, get annotation from preview moves
      if (index >= currentMoveIndex && index < currentMoveIndex + displayedPreviewMoves.length) {
        const previewIndex = index - currentMoveIndex
        return displayedPreviewMoves[previewIndex]?.annotation
      }
    } else {
      // In normal mode, get annotation from mainline moves
      return displayedMoves[index]?.annotation
    }
    return undefined
  }

  useEffect(() => {
    if (listRef.current && displayedMoves?.length) {
      let activeItem: HTMLElement | null = null

      if (previewMode) {
        // In preview mode, look for the selected preview move in Row 4
        activeItem = listRef.current.querySelector(
          `.preview-item-${scrollFollowIndex}`
        ) as HTMLElement
      } else {
        // In normal mode, look for the selected mainline move in Row 3
        activeItem = listRef.current.querySelector(
          `.move-item-${scrollFollowIndex}`
        ) as HTMLElement
      }

      if (activeItem) {
        UIHelpers.scrollIntoView(activeItem, listRef.current)
      }
    }
  }, [scrollFollowIndex, displayedMoves?.length, previewMode])

  useEffect(() => {
    const firstMove = manager.getMainlineMove(0)
    if (firstMove && !firstMove.isAnalyzed) {
      manager.requestMoveAnalysis(firstMove)
    }
  }, [displayedMoves, manager])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Navigation Controls */}
      <div className="p-2 border-b">
        {/* First Row: Navigation buttons */}
        <div className="flex justify-end items-center space-x-2 mb-2">
          <Tooltip content="Go to first move">
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
          </Tooltip>
          <Tooltip content="Previous move">
            <button
              onClick={() => handleMoveNavigation('prev')}
              className={UIHelpers.getButtonClasses()}
            >
              <img src="/icons/back.svg" alt="Previous" className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Next move">
            <button
              onClick={() => handleMoveNavigation('next')}
              className={UIHelpers.getButtonClasses()}
            >
              <img src="/icons/forward.svg" alt="Next" className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Go to last move">
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
          </Tooltip>
          <Tooltip content={previewMode ? "Exit preview mode" : "Enter preview mode"}>
            <button
              onClick={handlePvButton}
              className={UIHelpers.getButtonClasses()}
            >
              <img
                src={previewMode ? "/icons/up.svg" : "/icons/down.svg"}
                alt={previewMode ? "Exit Preview" : "Enter Preview"}
                className="w-4 h-4"
              />
            </button>
          </Tooltip>
          {previewMode && (
            <Tooltip content="Exit preview mode">
              <button
                onClick={exitPreviewMode}
                className={UIHelpers.getButtonClasses()}
              >
                <img
                  src="/icons/close.svg"
                  alt="Close"
                  className="w-4 h-4"
                />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Close analysis session">
            <button
              onClick={() => manager.disconnectSession()}
              className={UIHelpers.getIconButtonClasses()}
            >
              <img src="/icons/close.svg" alt="Close" className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        {/* Second Row: Analysis button */}
        <div className="flex justify-end">
          {!isFullyAnalyzed && (
            <div className="text-center">
              {isAnalysisInProgress ? (
                <Tooltip content="Analysis in progress">
                  <div>
                    <p className="text-sm text-gray-600">
                      Analyzing...
                    </p>
                    <div className="relative h-4 bg-darkest-gray rounded-full" style={{ width: '400px' }}>
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
                </Tooltip>
              ) : (
                <Tooltip content="Run full game analysis">
                  <button
                    onClick={() => manager.requestFullGameAnalysis()}
                    className={UIHelpers.getPrimaryButtonClasses(isAnalysisInProgress)}
                    disabled={isAnalysisInProgress}
                  >
                    Run Full Analysis
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Move List Grid */}
      <div ref={listRef} className={`${UIHelpers.getMoveListContainerClasses()} w-full flex-1`}>
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${displayLength}, 100px)`, gridTemplateRows: 'repeat(4, 4vh)', columnGap: '8px', rowGap: '8px' }}>
          {/* Row 1: Move numbers + label */}
          <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 1, gridColumn: 1 }}>
            {/* Empty for alignment */}
          </div>
          {Array.from({ length: displayLength }).map((_: unknown, colIndex: number) => {
            const moveNum = Math.floor(colIndex / 2) + 1
            const isWhite = colIndex % 2 === 0
            return (
              <div
                key={`row1-col${colIndex}`}
                className="w-[100px] h-[4vh] flex items-center justify-center text-xs font-semibold"
                style={{ gridRow: 1, gridColumn: colIndex + 2 }}
              >
                {isWhite ? `${moveNum}.` : `${moveNum}...`}
              </div>
            )
          })}

          {/* Row 2: Annotations */}
          <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 2, gridColumn: 1 }}>
            Tags:
          </div>
          {Array.from({ length: displayLength }).map((_: unknown, colIndex: number) => {
            const annotation = getMoveAnnotation(colIndex)
            return (
              <div
                key={`row2-col${colIndex}`}
                className="w-[100px] h-[4vh] flex items-center justify-center text-xs font-bold text-red-600"
                style={{ gridRow: 2, gridColumn: colIndex + 2 }}
              >
                {annotation || ''}
              </div>
            )
          })}

          {/* Row 3: Mainline moves */}
          <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 3, gridColumn: 1 }}>
            Mainline:
          </div>
          {displayedMoves.map((move: Move, colIndex: number) => {
            if (colIndex >= displayLength || !move.move) {
              return (
                <div
                  key={`row3-col${colIndex}`}
                  className="w-[100px] h-[4vh] invisible"
                  style={{ gridRow: 3, gridColumn: colIndex + 2 }}
                />
              )
            }

            const isWhite = colIndex % 2 === 0
            const isCurrent = colIndex === currentMoveIndex
            const moveRef = isCurrent ? activeItemRef : undefined
            const moveCellClass = isWhite
              ? 'bg-lightest-gray text-darkest-gray'
              : 'bg-darkest-gray text-lightest-gray'
            return (
              <div
                ref={moveRef}
                key={`row3-col${colIndex}`}
                className={`w-[100px] h-[4vh] rounded-[8px] flex items-center hvr-shadow justify-between px-2 text-xs ${moveCellClass} ${isCurrent ? 'selected-shadow text-l z-10' : ''} move-item-${colIndex}`}
                style={isCurrent ? { fontSize: '1.15rem', gridRow: 3, gridColumn: colIndex + 2 } : { gridRow: 3, gridColumn: colIndex + 2 }}
                onClick={() => handleRowClick(colIndex)}
              >
                <div className='flex items-center'>
                  <Image alt={move.piece ?? ''}
                    width={20}
                    height={20}
                    src={getPieceImg(move.piece)} />
                  <span className="font-semibold text-sm">{move.move.slice(2)}</span>
                </div>
                {move.score !== undefined && (
                  <span className="text-xs ml-2">{(move.score / 100).toFixed(2)}</span>
                )}
              </div>
            )
          })}

          {/* Row 4: Preview moves (PVs in normal mode, preview moves in preview mode) */}
          <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 4, gridColumn: 1 }}>
            Preview:
          </div>
          {Array.from({ length: displayLength }).map((_: unknown, colIndex: number) => {
            let move = null
            let isSelected = false
            let pvType: 'pv1' | 'pv2' | null = null

            if (previewMode) {
              // In preview mode, show preview moves starting at currentMoveIndex
              if (colIndex >= currentMoveIndex && colIndex < currentMoveIndex + displayedPreviewMoves.length) {
                const previewIndex = colIndex - currentMoveIndex
                move = displayedPreviewMoves[previewIndex] || null
                isSelected = colIndex === (currentMoveIndex + previewMoveIndex)
              }
            } else {
              // In normal mode, show PV moves (first PV1, then PV2 if available)
              const pv1Moves = manager.getPv1(colIndex)
              const pv2Moves = manager.getPv2(colIndex)

              if (pv1Moves && pv1Moves.length > 0) {
                move = pv1Moves[0]
                pvType = 'pv1'
              } else if (pv2Moves && pv2Moves.length > 0) {
                move = pv2Moves[0]
                pvType = 'pv2'
              }
            }

            if (!move || !move.move) {
              return (
                <div
                  key={`row4-col${colIndex}`}
                  className="w-[100px] h-[4vh] invisible"
                  style={{ gridRow: 4, gridColumn: colIndex + 2 }}
                />
              )
            }

            const isWhite = colIndex % 2 === 0
            const moveCellClass = isWhite
              ? 'bg-lightest-gray text-darkest-gray'
              : 'bg-darkest-gray text-lightest-gray'
            const selectedStyle = isSelected ? 'hvr-shadow text-base font-bold z-10 ring-2 selected-shadow' : ''

            return (
              <div
                key={`row4-col${colIndex}`}
                className={`w-[100px] h-[4vh] rounded-[8px] flex items-center hvr-shadow justify-between px-2 text-xs ${moveCellClass} ${selectedStyle} ${isSelected ? `preview-item-${colIndex}` : ''}`}
                style={isSelected ? { fontSize: '1.15rem', gridRow: 4, gridColumn: colIndex + 2 } : { gridRow: 4, gridColumn: colIndex + 2 }}
                onClick={() => {
                  if (previewMode) {
                    handleRowClick(colIndex)
                  } else if (pvType) {
                    handlePvClick(colIndex, pvType)
                  }
                }}
              >
                <div className='flex items-center'>
                  <Image
                    alt={move.piece ?? ''}
                    width={20}
                    height={20}
                    src={getPieceImg(move.piece)}
                  />
                  <span className="font-semibold text-sm">{move.move.slice(2)}</span>
                </div>
                {move.score !== undefined && (
                  <span className="text-xs ml-2">{(move.score / 100).toFixed(2)}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MoveList