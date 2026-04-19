import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useGameState } from '@/contexts/GameStateContext'
import { UIHelpers } from '@/helpers/uiHelpers'
import { Move } from '@/types/chess/Move'
import Tooltip from './ui/Tooltip'
import HiddenFeaturesDebug from './HiddenFeaturesDebug'
import MoveNavButtons from '@/components/game/MoveNavButtons'

const VALID_ANNOTATIONS = new Set(['??', '?', '?!', '!?', '!', '!!'])
const BAD_ANNOTATIONS = new Set(['??', '?', '?!'])
const GOOD_ANNOTATIONS = new Set(['!?', '!', '!!'])

const selectedGlow =
  'z-10 ring-[3px] ring-accent-progress shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent-progress)_55%,transparent),0_0_12px_color-mix(in_srgb,var(--accent-progress)_50%,transparent),0_0_26px_color-mix(in_srgb,var(--accent-progress)_28%,transparent)]'

function getMoveAnnotation(move: Move | undefined): string | undefined {
  const raw = move?.annotation
  return raw && VALID_ANNOTATIONS.has(raw) ? raw : undefined
}

function annotationClass(annot: string | undefined): string {
  if (!annot) return ''
  if (BAD_ANNOTATIONS.has(annot)) return 'text-text-danger'
  if (GOOD_ANNOTATIONS.has(annot)) return 'text-text-success'
  return ''
}

function formatScore(move: Move | undefined): string | null {
  if (!move) return null
  if (move.mateIn != null) return `M${move.mateIn}`
  if (move.score !== undefined) return (move.score / 100).toFixed(2)
  return null
}

function isBlackPiece(piece: string | null | undefined): boolean {
  const p = piece?.toLowerCase() ?? ''
  return p.startsWith('b')
}

/** White disc + glow so black piece glyphs stay visible on any row background. */
function PieceIcon({ piece, src }: { piece: string; src: string }) {
  const img = <Image alt={piece} width={14} height={14} src={src} className="shrink-0" />
  if (!isBlackPiece(piece)) return img
  return (
    <span
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white shadow-[0_0_1px_rgba(255,255,255,1),0_0_4px_rgba(255,255,255,0.45),0_0_8px_rgba(255,255,255,0.15)]"
      aria-hidden
    >
      {img}
    </span>
  )
}

const MoveList = () => {
  const listRef = useRef<HTMLDivElement>(null)
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

  const displayedMoves = manager.getDisplayedMovesList()
  const scrollFollowIndex = currentMoveIndex
  const pairCount = Math.ceil(displayedMoves.length / 2)

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

  const renderHalfMoveCell = useCallback(
    (move: Move | undefined, colIndex: number, isWhiteCell: boolean) => {
      const empty = !move?.move
      const baseBg = isWhiteCell ? 'bg-background-secondary' : 'bg-background-primary'
      const hoverTint = isWhiteCell
        ? 'hover:bg-[color-mix(in_srgb,var(--color-background-secondary)_88%,var(--color-text-primary)_10%)]'
        : 'hover:bg-[color-mix(in_srgb,var(--color-background-primary)_90%,var(--color-text-primary)_8%)]'
      const borderR = isWhiteCell ? 'border-r border-border-tertiary/60' : ''
      const isCurrent = colIndex === currentMoveIndex

      if (empty) {
        return (
          <div
            key={`empty-${colIndex}`}
            className={`move-item-${colIndex} box-border min-h-[24px] ${baseBg} ${borderR}`}
          />
        )
      }

      const moveId = move!.id
      const hasAiComment = moveIdsWithAiComment.has(moveId)
      const isGeneratingAi = aiGeneration[moveId] != null
      const annot = getMoveAnnotation(move)
      const annotCls = annotationClass(annot)
      const scoreStr = formatScore(move)
      const pieceSrc = getPieceImg(move!.piece)

      return (
        <button
          type="button"
          key={`move-${colIndex}`}
          className={`move-item-${colIndex} box-border flex min-h-[24px] w-full cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-left text-[11px] text-text-primary transition-colors duration-100 ${baseBg} ${hoverTint} ${borderR} ${isCurrent ? selectedGlow : ''}`}
          onClick={() => manager.goToMove(colIndex)}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {hasAiComment ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-progress" aria-hidden title="Has commentary" />
            ) : (
              <span className="w-1.5 shrink-0" aria-hidden />
            )}
            {isGeneratingAi ? (
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 animate-spin rounded-full border-2 border-text-warning border-t-transparent"
                aria-label="Commentary generating"
              />
            ) : null}
            {pieceSrc ? (
              <PieceIcon piece={move!.piece ?? ''} src={pieceSrc} />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className="min-w-0 truncate font-semibold">
              {move!.move}
              {annot ? <span className={annotCls}>{annot}</span> : null}
            </span>
          </div>
          {scoreStr != null ? (
            <span className="shrink-0 font-mono tabular-nums text-text-secondary">{scoreStr}</span>
          ) : null}
        </button>
      )
    },
    [aiGeneration, currentMoveIndex, manager, moveIdsWithAiComment]
  )

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-border-tertiary bg-background-primary">
        {!isFullyAnalyzed && isAnalysisInProgress ? (
          <div className="shrink-0 border-b border-border-tertiary px-2 py-1">
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
          </div>
        ) : null}
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="py-1" style={{ display: showDebug ? 'block' : 'none' }}>
            <HiddenFeaturesDebug visible={showDebug} />
          </div>
          <div className="flex flex-col">
            {Array.from({ length: pairCount }).map((_, pairIndex) => {
              const whiteIdx = pairIndex * 2
              const blackIdx = pairIndex * 2 + 1
              const whiteMove = displayedMoves[whiteIdx]
              const blackMove = displayedMoves[blackIdx]

              return (
                <div
                  key={`pair-${pairIndex}`}
                  className="grid grid-cols-[36px_1fr_1fr] border-b border-border-tertiary/60 last:border-b-0"
                >
                  <div className="flex items-center justify-center border-r border-border-tertiary/60 bg-background-primary px-1 py-1 text-center text-[11px] font-medium tabular-nums text-text-secondary">
                    {pairIndex + 1}.
                  </div>
                  {renderHalfMoveCell(whiteMove, whiteIdx, true)}
                  {renderHalfMoveCell(blackMove, blackIdx, false)}
                </div>
              )
            })}
          </div>
        </div>
        <div className="shrink-0 border-t border-border-tertiary bg-background-primary py-1.5">
          <MoveNavButtons />
        </div>
      </div>
    </div>
  )
}

export default MoveList
