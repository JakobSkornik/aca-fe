import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useGameState } from '@/contexts/GameStateContext'
import { UIHelpers } from '@/helpers/uiHelpers'
import { Move } from '@/types/chess/Move'
import Tooltip from './ui/Tooltip'
import HiddenFeaturesDebug from './HiddenFeaturesDebug'
import { jobService } from '@/services/JobService'
import { useRouter } from 'next/router'

const MoveList = () => {
  const listRef = useRef<HTMLDivElement>(null)
  const activeItemRef = useRef<HTMLDivElement>(null)
  const { state, manager } = useGameState()
  const { currentMoveIndex, isAnalysisInProgress, analysisProgress, isFullyAnalyzed, commentsMainline, aiGeneration } =
    state

  const moveIdsWithAiComment = useMemo(() => {
    const s = new Set<number>()
    for (const c of commentsMainline) {
      s.add(c.moveId)
    }
    return s
  }, [commentsMainline])
  const router = useRouter()
  const { id } = router.query

  const displayedMoves = manager.getDisplayedMovesList()
  const displayLength = 300
  const scrollFollowIndex = currentMoveIndex

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

  const handleDownload = async () => {
    if (!id || typeof id !== 'string') return
    try {
      const gameJson = await jobService.getGameJson(id)
      const blob = new Blob([JSON.stringify(gameJson, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `game_${id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to download game JSON', e)
      alert('Failed to download game JSON')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
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
  }, [manager, displayedMoves.length])

  const handleRowClick = (index: number) => {
    manager.goToMove(index)
  }

  const VALID_ANNOTATIONS = new Set(['??', '?', '?!', '!?', '!', '!!'])

  const getMoveAnnotation = (index: number): string | undefined => {
    const raw = displayedMoves[index]?.annotation
    return raw && VALID_ANNOTATIONS.has(raw) ? raw : undefined
  }

  useEffect(() => {
    if (listRef.current && displayedMoves?.length) {
      const activeItem = listRef.current.querySelector(`.move-item-${scrollFollowIndex}`) as HTMLElement
      if (activeItem) {
        UIHelpers.scrollIntoView(activeItem, listRef.current)
      }
    }
  }, [scrollFollowIndex, displayedMoves?.length])

  useEffect(() => {
    const firstMove = manager.getMainlineMove(0)
    if (firstMove && !firstMove.isAnalyzed) {
      manager.requestMoveAnalysis(firstMove)
    }
  }, [displayedMoves, manager])

  const [showDebug] = React.useState<boolean>(false)

  const getPieceImg = (piece: string | undefined | null) => {
    if (!piece) return ''
    return `/icons/pieces/${piece.toLowerCase()}.svg`
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-2 border-b">
        <div className="flex justify-between items-center mb-2">
          <div className="flex justify-start items-center space-x-2">
            <Tooltip content="Go to first move">
              <button onClick={() => handleMoveNavigation('first')} className={UIHelpers.getButtonClasses()}>
                <Image src="/icons/fast_back.svg" alt="First" width={16} height={16} className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Previous move">
              <button onClick={() => handleMoveNavigation('prev')} className={UIHelpers.getButtonClasses()}>
                <Image src="/icons/back.svg" alt="Previous" width={16} height={16} className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Next move">
              <button onClick={() => handleMoveNavigation('next')} className={UIHelpers.getButtonClasses()}>
                <Image src="/icons/forward.svg" alt="Next" width={16} height={16} className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Go to last move">
              <button onClick={() => handleMoveNavigation('last')} className={UIHelpers.getButtonClasses()}>
                <Image src="/icons/fast_forward.svg" alt="Last" width={16} height={16} className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Close analysis session">
              <button onClick={() => router.push('/')} className={UIHelpers.getIconButtonClasses()}>
                <Image src="/icons/close.svg" alt="Close" width={16} height={16} className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          {id && typeof id === 'string' && (
            <Tooltip content="Download Analysis JSON">
              <button onClick={handleDownload} className={UIHelpers.getButtonClasses()}>
                <Image
                  src="/icons/upload.svg"
                  alt="Download"
                  width={16}
                  height={16}
                  className="w-4 h-4 transform rotate-180"
                />
              </button>
            </Tooltip>
          )}
        </div>

        <div className="flex justify-start">
          {!isFullyAnalyzed && (
            <div className="text-center">
              {isAnalysisInProgress ? (
                <Tooltip content="Analysis in progress">
                  <div>
                    <p className="text-sm text-gray-600">Analyzing...</p>
                    <div className="relative h-4 bg-darkest-gray rounded-full" style={{ width: '400px' }}>
                      <div
                        className="absolute h-full bg-light-gray transition-[width] duration-500 rounded-full"
                        style={{ width: `${analysisProgress}%`, left: 0 }}
                      />
                      <div
                        className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                        style={{
                          color: analysisProgress < 50 ? 'var(--lightest-gray)' : 'var(--darkest-gray)',
                        }}
                      >
                        {analysisProgress.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </Tooltip>
              ) : (
                <div className="flex items-center space-x-2" />
              )}
            </div>
          )}
        </div>
      </div>

      <div ref={listRef} className={`${UIHelpers.getMoveListContainerClasses()} w-full flex-1`}>
        <div className="p-2" style={{ display: showDebug ? 'block' : 'none' }}>
          <HiddenFeaturesDebug visible={showDebug} />
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `80px repeat(${displayLength}, 100px)`,
            gridTemplateRows: 'repeat(3, 4vh)',
            columnGap: '8px',
            rowGap: '8px',
          }}
        >
          <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 1, gridColumn: 1 }} />
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

          <div className="flex items-center justify-end pr-2 font-bold text-xs" style={{ gridRow: 2, gridColumn: 1 }}>
            Tags:
          </div>
          {Array.from({ length: displayLength }).map((_: unknown, colIndex: number) => {
            const annotation = getMoveAnnotation(colIndex)
            const move = displayedMoves[colIndex]
            const moveId = move?.id
            const hasAiComment = moveId != null && moveIdsWithAiComment.has(moveId)
            const isGeneratingAi = moveId != null && aiGeneration[moveId] != null
            return (
              <div
                key={`row2-col${colIndex}`}
                className="w-[100px] h-[4vh] flex items-center justify-center gap-0.5 text-xs font-bold text-red-600"
                style={{ gridRow: 2, gridColumn: colIndex + 2 }}
              >
                {annotation ? <span>{annotation}</span> : null}
                {hasAiComment ? <span className="text-blue-700 font-semibold">*</span> : null}
                {isGeneratingAi ? (
                  <span
                    className="inline-block h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin shrink-0"
                    aria-label="Commentary generating"
                  />
                ) : null}
              </div>
            )
          })}

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
            const moveCellClass = isWhite ? 'bg-lightest-gray text-darkest-gray' : 'bg-darkest-gray text-lightest-gray'
            return (
              <div
                ref={moveRef}
                key={`row3-col${colIndex}`}
                className={`w-[100px] h-[4vh] rounded-[8px] flex items-center hvr-shadow justify-between px-2 text-xs ${moveCellClass} ${isCurrent ? 'selected-shadow text-l z-10' : ''} move-item-${colIndex}`}
                style={isCurrent ? { fontSize: '1.15rem', gridRow: 3, gridColumn: colIndex + 2 } : { gridRow: 3, gridColumn: colIndex + 2 }}
                onClick={() => handleRowClick(colIndex)}
              >
                <div className="flex items-center">
                  <Image alt={move.piece ?? ''} width={20} height={20} src={getPieceImg(move.piece)} />
                  <span className="font-semibold text-sm">{move.move}</span>
                </div>
                {move.score !== undefined && <span className="text-xs ml-2">{(move.score / 100).toFixed(2)}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MoveList
