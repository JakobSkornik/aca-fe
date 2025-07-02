import React, { useRef, useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import { useGameState } from '@/contexts/GameStateContext'
import { UIHelpers } from '@/helpers/uiHelpers'

const MoveList = () => {
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLDivElement>(null);
  const { gameState, setCurrentMoveIndex, requestMoveAnalysis, setPreviewMoves, setPreviewMoveIndex } = useGameState()
  const { moves, currentMoveIndex, previewMode, previewMoves } = gameState

  const displayedMoves = moves // Always show mainline in row 3

  // --- PV Preview State ---
  const [pvPreviewMode, setPvPreviewMode] = useState(false)
  const [pvLockedIndex, setPvLockedIndex] = useState<number | null>(null)
  const [pvSelectedPv, setPvSelectedPv] = useState<number>(0)
  const [pvMoveIndex, setPvMoveIndex] = useState<number>(0)
  const [pvMoves, setPvMoves] = useState<any[]>([])

  // Navigation logic copied from GameViewer
  const handleMoveChange = useCallback(
    (newMoveIndex: number) => {
      if (!moves[newMoveIndex]) {
        return
      }
      if (!moves[newMoveIndex].isAnalyzed) {
        requestMoveAnalysis(moves[newMoveIndex])
      }
      setCurrentMoveIndex(newMoveIndex)
    },
    [moves, requestMoveAnalysis, setCurrentMoveIndex]
  )

  const handleMoveNavigation = useCallback(
    (action: 'first' | 'prev' | 'next' | 'last' | 'click') => {
      if (!moves.length) return
      let newMoveIndex = currentMoveIndex
      switch (action) {
        case 'first':
          newMoveIndex = 0
          break
        case 'prev':
          newMoveIndex = Math.max(0, currentMoveIndex - 1)
          break
        case 'next':
          newMoveIndex = Math.min(moves.length - 1, currentMoveIndex + 1)
          break
        case 'last':
          newMoveIndex = moves.length - 1
          break
        default:
          break
      }
      handleMoveChange(newMoveIndex)
    },
    [currentMoveIndex, moves.length, handleMoveChange]
  )

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pvPreviewMode) {
        if (e.key === 'ArrowLeft') {
          setPvMoveIndex(idx => Math.max(idx - 1, 0))
        } else if (e.key === 'ArrowRight') {
          setPvMoveIndex(idx => pvMoves.length ? Math.min(idx + 1, pvMoves.length - 1) : 0)
        } else if (e.key === 'ArrowUp') {
          setPvPreviewMode(false)
          setPvLockedIndex(null)
          setPvSelectedPv(0)
          setPvMoveIndex(0)
          setPvMoves([])
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
          // Enter PV preview mode if PV exists for the previous move (the PV row is below the previous mainline move)
          const prevMoveIndex = currentMoveIndex - 1;
          if (prevMoveIndex >= 0) {
            const pvs = gameState.movePvs?.[prevMoveIndex]?.[pvSelectedPv];
            if (pvs && pvs.length) {
              setPvPreviewMode(true);
              setPvLockedIndex(prevMoveIndex);
              setPvSelectedPv(0);
              setPvMoveIndex(0);
              setPvMoves([...pvs]);
              // Set previewMoves and previewMoveIndex for the preview board
              const mainlineMoves = moves.slice(0, prevMoveIndex + 1);
              const pv = pvs.slice(0, 1);
              setPreviewMoves([...mainlineMoves, ...pv]);
              setPreviewMoveIndex(mainlineMoves.length);
            }
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleMoveNavigation, pvPreviewMode, pvMoves.length, currentMoveIndex, gameState.movePvs, pvSelectedPv, moves, setPreviewMoves, setPreviewMoveIndex])

  // Fetch score for selected PV move if missing
  useEffect(() => {
    if (pvPreviewMode && pvLockedIndex !== null && pvMoves.length) {
      const pvMove = pvMoves[pvMoveIndex];
      if (pvMove && pvMove.score === undefined && typeof requestMoveAnalysis === 'function') {
        // Build the move sequence up to this PV move
        const mainlineMoves = moves.slice(0, pvLockedIndex + 1);
        const pvSoFar = pvMoves.slice(0, pvMoveIndex + 1);
        // The backend should analyze the position after these moves
        // We'll call requestMoveAnalysis with a synthetic move object
        // (Assume requestMoveAnalysis triggers backend analysis and updates movePvs in context)
        const allMoves = [...mainlineMoves, ...pvSoFar];
        // Use the last move as the target for analysis
        const lastMove = allMoves[allMoves.length - 1];
        if (lastMove) {
          requestMoveAnalysis(lastMove);
        }
      }
    }
  }, [pvPreviewMode, pvLockedIndex, pvMoves, pvMoveIndex, moves, requestMoveAnalysis]);

  const handleRowClick = (index: number) => {
    handleMoveChange(index)
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
      UIHelpers.scrollIntoView(activeItemRef.current, listRef.current);
    }
  }, [currentMoveIndex, displayedMoves?.length]);

  // When entering PV preview mode or navigating within PV, set the preview board to the correct PV move sequence
  useEffect(() => {
    // Always update previewMoves/previewMoveIndex to reflect the selected PV move in preview mode
    if (pvPreviewMode && pvLockedIndex !== null) {
      const pvs = gameState.movePvs?.[pvLockedIndex]?.[pvSelectedPv];
      if (pvs && pvs.length && pvMoves.length && pvMoves[0].move === pvs[0].move) {
        // Show the position after the selected PV move
        const mainlineMoves = moves.slice(0, pvLockedIndex + 1);
        const pv = pvMoves.slice(0, pvMoveIndex + 1);
        const previewSequence = [...mainlineMoves, ...pv];
        // If pvMoveIndex >= 0, show after that PV move; if -1, show mainline
        setPreviewMoves(previewSequence);
        setPreviewMoveIndex(previewSequence.length - 1);

        // Fetch score for the selected PV move if missing
        const selectedPvMove = pvMoves[pvMoveIndex];
        if (selectedPvMove && selectedPvMove.score === undefined) {
          requestMoveAnalysis(selectedPvMove);
        }
      }
    } else if (!pvPreviewMode) {
      // If not in PV preview, mirror the mainline
      setPreviewMoves(moves.slice(0, currentMoveIndex + 1));
      setPreviewMoveIndex(currentMoveIndex);
    }
  }, [pvPreviewMode, pvLockedIndex, pvMoves, pvMoveIndex, moves, setPreviewMoves, setPreviewMoveIndex, gameState.movePvs, pvSelectedPv, currentMoveIndex, requestMoveAnalysis]);

  return (
    <div ref={listRef} className={`${UIHelpers.getMoveListContainerClasses()} w-full h-full`}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${displayedMoves.length}, 100px)`, gridTemplateRows: 'repeat(4, 4vh)', columnGap: '4px', rowGap: '4px' }}>
        {/* Row 1: Move numbers */}
        {Array.from({ length: displayedMoves.length }).map((_, colIndex) => {
          const moveNum = Math.floor(colIndex / 2) + 1;
          const isWhite = colIndex % 2 === 0;
          return (
            <div
              key={`row1-col${colIndex}`}
              className="w-[100px] h-[4vh] flex items-center justify-center text-xs font-semibold"
            >
              {isWhite ? `${moveNum}.` : `${moveNum}...`}
            </div>
          );
        })}
        {/* Row 2: Invisible */}
        {Array.from({ length: displayedMoves.length }).map((_, colIndex) => (
          <div
            key={`row2-col${colIndex}`}
            className="w-[100px] h-[4vh] invisible"
          />
        ))}
        {/* Row 3: Mainline moves */}
        {displayedMoves.map((move, colIndex) => {
          const isWhite = colIndex % 2 === 0;
          const isCurrent = colIndex === currentMoveIndex;
          const isLocked = pvPreviewMode && pvLockedIndex === colIndex;
          const moveRef = isCurrent ? activeItemRef : undefined;
          const moveCellClass = isWhite
            ? 'bg-lightest-gray text-darkest-gray'
            : 'bg-darkest-gray text-lightest-gray';
          return (
            <div
              ref={moveRef}
              key={`row3-col${colIndex}`}
              className={`w-[100px] h-[4vh] rounded-[8px] flex items-center hvr-shadow justify-between px-2 text-xs ${moveCellClass} ${isCurrent ? 'selected-shadow text-l z-10' : ''}`}
              style={isCurrent ? { fontSize: '1.15rem' } : {}}
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
          );
        })}
        {/* Row 4: PVs */}
        {Array.from({ length: displayedMoves.length }).map((_, colIndex) => {
          // If in preview mode, render the full PV starting at the cell to the right of the locked mainline move
          if (pvPreviewMode) {
            // Render empty cells up to the PV start
            if (pvLockedIndex !== null) {
              // PV starts at colIndex === pvLockedIndex + 1
              if (colIndex < pvLockedIndex + 1 || colIndex >= pvLockedIndex + 1 + pvMoves.length) {
                // Not a PV cell: render invisible
                return (
                  <div
                    key={`row4-col${colIndex}`}
                    className="w-[100px] h-[4vh] invisible"
                  />
                );
              } else {
                // This is a PV cell
                const pvIdx = colIndex - (pvLockedIndex + 1);
                const pvMove = pvMoves[pvIdx];
                const isWhite = (colIndex) % 2 === 0;
                const isSelected = pvIdx === pvMoveIndex;
                const moveCellClass = isWhite
                  ? 'bg-lightest-gray text-darkest-gray'
                  : 'bg-darkest-gray text-lightest-gray';
                const selectedStyle = isSelected ? 'hvr-shadow text-base font-bold z-10 ring-2 selected-shadow' : '';
                return (
                  <div
                    key={`row4-col${colIndex}-pv${pvIdx}`}
                    className={`w-[100px] h-[4vh] rounded-[8px] flex items-center justify-between px-2 text-xs ${moveCellClass} ${selectedStyle}`}
                    style={isSelected ? { fontSize: '1.15rem' } : {}}
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
                );
              }
            } else {
              // Defensive: if no locked index, render invisible
              return (
                <div
                  key={`row4-col${colIndex}`}
                  className="w-[100px] h-[4vh] invisible"
                />
              );
            }
          }
          // Otherwise, show the first element of the PV for the previous move (as before), but in the cell to the right of the mainline move
          const pvMovesLocal = gameState.movePvs?.[colIndex - 1]?.[0]; // first PV for previous move
          const pvMove = pvMovesLocal?.[0];
          if (!pvMove) {
            return (
              <div
                key={`row4-col${colIndex}`}
                className="w-[100px] h-[4vh] invisible"
              />
            );
          }
          // Only render the PV move in the cell to the right of the mainline move
          if (colIndex === 0) {
            // No PV for first cell
            return (
              <div
                key={`row4-col${colIndex}`}
                className="w-[100px] h-[4vh] invisible"
              />
            );
          }
          const isWhite = colIndex % 2 === 0;
          const moveCellClass = isWhite
            ? 'bg-lightest-gray text-darkest-gray'
            : 'bg-darkest-gray text-lightest-gray';
          return (
            <div
              key={`row4-col${colIndex}`}
              className={`w-[100px] h-[4vh] rounded-[8px] flex items-center justify-between px-2 text-xs ${moveCellClass}`}
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
          );
        })}
      </div>
    </div>
  )
}

export default MoveList