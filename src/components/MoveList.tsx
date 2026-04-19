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
  const colWidthPx = 64
  const labelColPx = 52
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
      let body: string
      if (id === 'offline') {
        body = sessionStorage.getItem('aca_offline_export') ?? ''
        if (!body) {
          window.alert('Nothing to export.')
          return
        }
      } else {
        const gameJson = await jobService.getGameJson(id)
        body = JSON.stringify(gameJson, null, 2)
      }
      const blob = new Blob([body], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = id === 'offline' ? 'game_offline.json' : `game_${id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to download game JSON', e)
      window.alert('Failed to download game JSON')
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
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-border-tertiary px-2 py-1">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center justify-start gap-1">
            <Tooltip content="Go to first move">
              <button
                type="button"
                onClick={() => handleMoveNavigation('first')}
                className={`${UIHelpers.getButtonClasses()} !px-1.5 !py-1`}
              >
                <Image src="/icons/fast_back.svg" alt="First" width={14} height={14} className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Previous move">
              <button
                type="button"
                onClick={() => handleMoveNavigation('prev')}
                className={`${UIHelpers.getButtonClasses()} !px-1.5 !py-1`}
              >
                <Image src="/icons/back.svg" alt="Previous" width={14} height={14} className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Next move">
              <button
                type="button"
                onClick={() => handleMoveNavigation('next')}
                className={`${UIHelpers.getButtonClasses()} !px-1.5 !py-1`}
              >
                <Image src="/icons/forward.svg" alt="Next" width={14} height={14} className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Go to last move">
              <button
                type="button"
                onClick={() => handleMoveNavigation('last')}
                className={`${UIHelpers.getButtonClasses()} !px-1.5 !py-1`}
              >
                <Image src="/icons/fast_forward.svg" alt="Last" width={14} height={14} className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Close analysis session">
              <button
                type="button"
                onClick={() => router.push('/')}
                className={`${UIHelpers.getIconButtonClasses()} !p-1`}
              >
                <Image src="/icons/close.svg" alt="Close" width={14} height={14} className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>

          {id && typeof id === 'string' && (
            <Tooltip content="Download Analysis JSON">
              <button
                type="button"
                onClick={() => void handleDownload()}
                className={`${UIHelpers.getButtonClasses()} !px-1.5 !py-1`}
              >
                <Image
                  src="/icons/upload.svg"
                  alt="Download"
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 rotate-180 transform"
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
                    <p className="text-[11px] text-text-secondary">Analyzing…</p>
                    <div className="relative h-3 w-full max-w-[320px] rounded-full bg-background-secondary">
                      <div
                        className="absolute h-full rounded-full bg-accent-engine transition-[width] duration-500"
                        style={{ width: `${analysisProgress}%`, left: 0 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-text-primary drop-shadow-[0_0_1px_var(--color-background-primary)]">
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
        <div className="p-1" style={{ display: showDebug ? 'block' : 'none' }}>
          <HiddenFeaturesDebug visible={showDebug} />
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${labelColPx}px repeat(${displayLength}, ${colWidthPx}px)`,
            gridTemplateRows: 'minmax(20px, 3vh) minmax(20px, 3vh) minmax(40px, 4.8vh)',
            columnGap: '6px',
            rowGap: '4px',
          }}
        >
          <div
            className="flex items-center justify-end pr-1 text-[10px] font-bold"
            style={{ gridRow: 1, gridColumn: 1 }}
          />
          {Array.from({ length: displayLength }).map((_: unknown, colIndex: number) => {
            const moveNum = Math.floor(colIndex / 2) + 1
            const isWhite = colIndex % 2 === 0
            return (
              <div
                key={`row1-col${colIndex}`}
                className="flex items-center justify-center text-[10px] font-semibold"
                style={{ gridRow: 1, gridColumn: colIndex + 2, width: colWidthPx }}
              >
                {isWhite ? `${moveNum}.` : `${moveNum}...`}
              </div>
            )
          })}

          <div className="flex items-center justify-end pr-1 text-[10px] font-bold" style={{ gridRow: 2, gridColumn: 1 }}>
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
                className="flex items-center justify-center gap-0.5 text-[10px] font-bold text-text-danger"
                style={{ gridRow: 2, gridColumn: colIndex + 2, width: colWidthPx }}
              >
                {annotation ? <span>{annotation}</span> : null}
                {hasAiComment ? <span className="font-semibold text-accent-engine">*</span> : null}
                {isGeneratingAi ? (
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 animate-spin rounded-full border-2 border-text-danger border-t-transparent"
                    aria-label="Commentary generating"
                  />
                ) : null}
              </div>
            )
          })}

          <div className="flex items-center justify-end pr-1 text-[9px] font-bold leading-tight" style={{ gridRow: 3, gridColumn: 1 }}>
            Mainline:
          </div>
          {displayedMoves.map((move: Move, colIndex: number) => {
            if (colIndex >= displayLength || !move.move) {
              return (
                <div
                  key={`row3-col${colIndex}`}
                  className="invisible min-h-[40px]"
                  style={{ gridRow: 3, gridColumn: colIndex + 2, width: colWidthPx }}
                />
              )
            }

            const isWhite = colIndex % 2 === 0
            const isCurrent = colIndex === currentMoveIndex
            const moveRef = isCurrent ? activeItemRef : undefined
            const moveCellClass = isWhite
              ? 'bg-background-primary text-text-primary shadow-[0_0_0_1px_var(--color-border-secondary)]'
              : 'bg-text-primary text-background-primary'
            return (
              <div
                ref={moveRef}
                key={`row3-col${colIndex}`}
                className={`move-item-${colIndex} box-border flex min-h-[40px] cursor-pointer flex-col items-center justify-center gap-px rounded border-2 border-white px-0.5 py-0.5 text-[10px] shadow-sm ${moveCellClass} ${isCurrent ? 'z-10 ring-2 ring-accent-engine ring-offset-0' : ''}`}
                style={{ gridRow: 3, gridColumn: colIndex + 2, width: colWidthPx }}
                onClick={() => handleRowClick(colIndex)}
              >
                <div className={`flex items-center justify-center gap-px ${isCurrent ? 'text-sm' : ''}`}>
                  <Image alt={move.piece ?? ''} width={14} height={14} src={getPieceImg(move.piece)} />
                  <span className="font-semibold leading-none">{move.move}</span>
                </div>
                {move.score !== undefined ? (
                  <span className="font-mono text-[9px] leading-none text-current/85">
                    {(move.score / 100).toFixed(2)}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MoveList
