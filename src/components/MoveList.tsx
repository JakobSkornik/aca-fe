import React, { useRef, useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import { useGameState } from '@/contexts/GameStateContext'
import { UIHelpers } from '@/helpers/uiHelpers'
import { createMoveList } from '@/helpers/moveListUtils'

const MoveList = () => {
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLDivElement>(null)
  const { state, manager } = useGameState()
  const { moves, currentMoveIndex, previewMode } = state

  // --- PV Preview State ---
  const [pvPreviewMode, setPvPreviewMode] = useState(false)
  const [pvLockedIndex, setPvLockedIndex] = useState<number | null>(null)
  const [pvSelectedPv, setPvSelectedPv] = useState<number>(0)
  const [pvMoveIndex, setPvMoveIndex] = useState<number>(0)

  // Always derive displayedMoves from manager
  const displayedMoves = manager.getMainlineMovesList()
  // PV moves for preview mode
  const pvMoves = (pvLockedIndex !== null && pvPreviewMode)
    ? manager.getPvMoves(pvLockedIndex)
    : []

  // Navigation using helpers
  const navigateToMove = useCallback((moveIndex: number) => {
    if (moveIndex >= 0 && moveIndex < displayedMoves.length) {
      const move = manager.getMainlineMove(moveIndex)
      if (move && !move.isAnalyzed) {
        manager.requestMoveAnalysis(move)
      }
      manager.goToMove(moveIndex)
    }
  }, [displayedMoves.length, manager])

  const handleMoveNavigation = useCallback(
    (action: 'first' | 'prev' | 'next' | 'last') => {
      if (!displayedMoves.length) return
      let newMoveIndex = currentMoveIndex
      switch (action) {
        case 'first':
          newMoveIndex = 0
          break
        case 'prev':
          newMoveIndex = Math.max(0, currentMoveIndex - 1)
          break
        case 'next':
          newMoveIndex = Math.min(displayedMoves.length - 1, currentMoveIndex + 1)
          break
        case 'last':
          newMoveIndex = displayedMoves.length - 1
          break
        default:
          break
      }
      navigateToMove(newMoveIndex)
    },
    [currentMoveIndex, displayedMoves.length, navigateToMove]
  )

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pvPreviewMode) {
        if (e.key === 'ArrowLeft') {
          setPvMoveIndex(idx => {
            const newIdx = Math.max(idx - 1, 0)
            const pvMove = pvMoves[newIdx]
            if (pvMove && !pvMove.isAnalyzed) {
              manager.requestMoveAnalysis(pvMove)
            }
            return newIdx
          })
        } else if (e.key === 'ArrowRight') {
          setPvMoveIndex(idx => {
            const newIdx = pvMoves.length ? Math.min(idx + 1, pvMoves.length - 1) : 0
            const pvMove = pvMoves[newIdx]
            if (pvMove && !pvMove.isAnalyzed) {
              manager.requestMoveAnalysis(pvMove)
            }
            return newIdx
          })
        } else if (e.key === 'ArrowUp') {
          setPvPreviewMode(false)
          setPvLockedIndex(null)
          setPvSelectedPv(0)
          setPvMoveIndex(0)
          manager.setPreviewMoves(createMoveList(), 0)
          manager.exitPreviewMode()
        }
      } else {
        if (e.key === 'ArrowLeft') {
          handleMoveNavigation('prev')
        } else if (e.key === 'ArrowRight') {
          handleMoveNavigation('next')
        } else if (e.key === 'Home') {
          handleMoveNavigation('first')
        } else if (e.key === 'End') {
          handleMoveNavigation('last')
        } else if (e.key === 'ArrowDown') {
          // Enter PV preview mode if PV exists for the previous move
          const prevMoveIndex = currentMoveIndex - 1
          if (prevMoveIndex >= 0) {
            const pvs = manager.getPvMoves(prevMoveIndex)
            if (pvs && pvs.length) {
              setPvPreviewMode(true)
              setPvLockedIndex(prevMoveIndex)
              setPvSelectedPv(0)
              setPvMoveIndex(0)
              manager.enterPvPreviewMode(prevMoveIndex)
            }
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleMoveNavigation, pvPreviewMode, pvMoves.length, currentMoveIndex, manager])

  const handleRowClick = (index: number) => {
    navigateToMove(index)
  }

  const getPieceImg = (piece: string | undefined | null) => {
    if (!piece) return ''
    else return `/icons/pieces/${piece.toLowerCase()}.svg`
  }

  useEffect(() => {
    if (listRef.current && displayedMoves?.length) {
      const activeItem = listRef.current.querySelector(
        `.move-item-${currentMoveIndex}`
      ) as HTMLElement
      if (activeItem) {
        UIHelpers.scrollIntoView(activeItem, listRef.current)
      }
    }
  }, [currentMoveIndex, displayedMoves?.length])

  useEffect(() => {
    if (activeItemRef.current && listRef.current) {
      UIHelpers.scrollIntoView(activeItemRef.current, listRef.current)
    }
  }, [currentMoveIndex, displayedMoves?.length])

  // Update previewMoves when PV preview state changes
  useEffect(() => {
    if (pvPreviewMode && pvLockedIndex !== null) {
      // Mainline up to and including pvLockedIndex
      const mainlineMoves = manager.getMainlineMovesList().slice(0, pvLockedIndex + 1)
      // PV moves up to and including pvMoveIndex
      const pvMovesArr = manager.getPvMoves(pvLockedIndex).slice(0, pvMoveIndex + 1)
      const newPreviewMoves = createMoveList()
      mainlineMoves.forEach((move: any) => {
        newPreviewMoves.push([move])
      })
      pvMovesArr.forEach((move: any) => {
        newPreviewMoves.push([move])
      })
      manager.setPreviewMoves(newPreviewMoves, newPreviewMoves.length - 1)
    }
  }, [pvPreviewMode, pvLockedIndex, pvMoveIndex, pvSelectedPv, manager])

  return (
    <div ref={listRef} className={`${UIHelpers.getMoveListContainerClasses()} w-full h-full`}>
      <div className="grid" style={{ gridTemplateColumns: `80px repeat(${displayedMoves.length}, 100px)`, gridTemplateRows: 'repeat(4, 4vh)', columnGap: '4px', rowGap: '4px' }}>
        {/* Row 1: Move numbers + label */}
        <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 1, gridColumn: 1 }}>
          {/* Empty for alignment */}
        </div>
        {Array.from({ length: displayedMoves.length }).map((_: any, colIndex: number) => {
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
        {/* Row 2: Invisible */}
        <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 2, gridColumn: 1 }}>
          {/* Empty for alignment */}
        </div>
        {Array.from({ length: displayedMoves.length }).map((_: any, colIndex: number) => (
          <div
            key={`row2-col${colIndex}`}
            className="w-[100px] h-[4vh] invisible"
            style={{ gridRow: 2, gridColumn: colIndex + 2 }}
          />
        ))}
        {/* Row 3: Mainline moves */}
        <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 3, gridColumn: 1 }}>
          Mainline:
        </div>
        {displayedMoves.map((move: any, colIndex: number) => {
          const isWhite = colIndex % 2 === 0
          const isCurrent = colIndex === currentMoveIndex
          const moveRef = isCurrent ? activeItemRef : undefined
          const moveCellClass = isWhite
            ? 'bg-lightest-gray text-darkest-gray'
            : 'bg-darkest-gray text-lightest-gray'
          // Hide mainline moves after current index in preview mode
          if (previewMode && colIndex > currentMoveIndex) {
            return (
              <div
                key={`row3-col${colIndex}`}
                className="w-[100px] h-[4vh] invisible"
                style={{ gridRow: 3, gridColumn: colIndex + 2 }}
              />
            )
          }
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
        {/* Row 4: PVs */}
        <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 4, gridColumn: 1 }}>
          Preview:
        </div>
        {Array.from({ length: displayedMoves.length }).map((_: any, colIndex: number) => {
          if (pvPreviewMode) {
            if (pvLockedIndex !== null) {
              if (colIndex < pvLockedIndex + 1 || colIndex >= pvLockedIndex + 1 + pvMoves.length) {
                return (
                  <div
                    key={`row4-col${colIndex}`}
                    className="w-[100px] h-[4vh] invisible"
                    style={{ gridRow: 4, gridColumn: colIndex + 2 }}
                  />
                )
              } else {
                const pvIdx = colIndex - (pvLockedIndex + 1)
                const pvMove = pvMoves[pvIdx]
                const isWhite = (colIndex) % 2 === 0
                const isSelected = pvIdx === pvMoveIndex
                const moveCellClass = isWhite
                  ? 'bg-lightest-gray text-darkest-gray'
                  : 'bg-darkest-gray text-lightest-gray'
                const selectedStyle = isSelected ? 'hvr-shadow text-base font-bold z-10 ring-2 selected-shadow' : ''
                return (
                  <div
                    key={`row4-col${colIndex}-pv${pvIdx}`}
                    className={`w-[100px] h-[4vh] rounded-[8px] flex items-center justify-between px-2 text-xs ${moveCellClass} ${selectedStyle}`}
                    style={isSelected ? { fontSize: '1.15rem', gridRow: 4, gridColumn: colIndex + 2 } : { gridRow: 4, gridColumn: colIndex + 2 }}
                  >
                    <div className='flex items-center'>
                      <Image
                        alt={pvMove.piece ?? ''}
                        width={20}
                        height={20}
                        src={getPieceImg(pvMove.piece)}
                      />
                      <span className="font-semibold text-sm">{pvMove.move.slice(2)}</span>
                    </div>
                    {pvMove.score !== undefined && (
                      <span className="text-xs ml-2">{(pvMove.score / 100).toFixed(2)}</span>
                    )}
                  </div>
                )
              }
            } else {
              return (
                <div
                  key={`row4-col${colIndex}`}
                  className="w-[100px] h-[4vh] invisible"
                  style={{ gridRow: 4, gridColumn: colIndex + 2 }}
                />
              )
            }
          }
          // Robust PV row logic: for colIndex > 0, show PV for mainline move at colIndex-1
          if (colIndex === 0) {
            return (
              <div
                key={`row4-col${colIndex}`}
                className="w-[100px] h-[4vh] invisible"
                style={{ gridRow: 4, gridColumn: colIndex + 2 }}
              />
            )
          }
          const pvMovesLocal = manager.getPvMoves(colIndex - 1)
          const pvMove = pvMovesLocal?.[0]
          if (!pvMove) {
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
          return (
            <div
              key={`row4-col${colIndex}`}
              className={`w-[100px] h-[4vh] rounded-[8px] flex items-center justify-between px-2 text-xs ${moveCellClass}`}
              style={{ gridRow: 4, gridColumn: colIndex + 2 }}
            >
              <div className='flex items-center'>
                <Image
                  alt={pvMove.piece ?? ''}
                  width={20}
                  height={20}
                  src={getPieceImg(pvMove.piece)}
                />
                <span className="font-semibold text-sm">{pvMove.move.slice(2)}</span>
              </div>
              {pvMove.score !== undefined && (
                <span className="text-xs ml-2">{(pvMove.score / 100).toFixed(2)}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MoveList