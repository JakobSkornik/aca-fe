import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { useVariationPlayer } from '@/contexts/VariationPlayerContext'
import type { MainlineComment } from '@/contexts/GameStateManager'
import type { CommentaryLevel } from '@/types/GameJson'
import type { PlayerLine } from '@/types/Line'
import CommentItem from './CommentItem'
import FeatureChartsPanel from './FeatureChartsPanel'
import StructuredComment from './StructuredComment'
import VariationPlayer from './VariationPlayer'

function formatCommentTitle(item: MainlineComment, moveNotation: string): string {
  return `Move ${Math.floor(item.moveIndex / 2) + 1}${item.moveIndex % 2 === 0 ? '.' : '...'} ${moveNotation}`
}

const LEVELS: { value: CommentaryLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
]

const LEVEL_STORAGE_KEY = 'aca_commentary_level'

function loadStoredLevel(): CommentaryLevel {
  if (typeof window === 'undefined') return 'intermediate'
  const v = window.localStorage.getItem(LEVEL_STORAGE_KEY)
  return v === 'beginner' || v === 'expert' || v === 'intermediate' ? v : 'intermediate'
}

const Comments: React.FC = () => {
  const { state, manager } = useGameState()
  const player = useVariationPlayer()
  const { commentsMainline, currentMoveIndex, commentaryComplete, aiGeneration } = state
  const [level, setLevel] = useState<CommentaryLevel>(loadStoredLevel)

  const changeLevel = useCallback((next: CommentaryLevel) => {
    setLevel(next)
    try {
      window.localStorage.setItem(LEVEL_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const commentaryGenerating = useMemo(
    () => !commentaryComplete || Object.keys(aiGeneration).length > 0,
    [commentaryComplete, aiGeneration]
  )

  const currentMove = manager.getMainlineMove(currentMoveIndex)
  const currentMoveId = currentMove?.id

  const displayedComments = commentsMainline
  const sortedForNav = useMemo(
    () => [...displayedComments].sort((a, b) => a.moveIndex - b.moveIndex),
    [displayedComments]
  )

  const activeComment = useMemo(() => {
    if (currentMoveId == null) return null
    return displayedComments.find((c) => c.moveId === currentMoveId) ?? null
  }, [displayedComments, currentMoveId])

  const activeKeyMomentType = useMemo(() => {
    if (!activeComment) return undefined
    const moveIdx = manager.findMoveIndexById(activeComment.moveId)
    if (moveIdx === -1) return undefined
    const moveData = state.moves.getMoveAtIndex(moveIdx)
    if (!moveData?.hiddenFeatures) return undefined
    const km = (moveData.hiddenFeatures as Record<string, unknown>)['keyMomentType']
    return typeof km === 'string' ? km : undefined
  }, [activeComment, manager, state.moves])

  const activeMainTitle = useMemo(() => {
    if (!activeComment) return ''
    const moveIdx = manager.findMoveIndexById(activeComment.moveId)
    const move = manager.getMainlineMove(moveIdx)
    return formatCommentTitle(activeComment, move?.move || '')
  }, [activeComment, manager])

  // Prev/next within the commented moves (the old sidebar rail, slimmed down).
  const { prevComment, nextComment, navPos } = useMemo(() => {
    let prev: MainlineComment | null = null
    let next: MainlineComment | null = null
    let pos = 0
    for (let i = 0; i < sortedForNav.length; i++) {
      const c = sortedForNav[i]
      if (c.moveIndex < currentMoveIndex) {
        prev = c
        pos = i + 1
      } else if (c.moveIndex === currentMoveIndex) {
        pos = i + 1
      } else if (c.moveIndex > currentMoveIndex && next == null) {
        next = c
      }
    }
    return { prevComment: prev, nextComment: next, navPos: pos }
  }, [sortedForNav, currentMoveIndex])

  const goToComment = useCallback(
    (item: MainlineComment | null) => {
      if (!item) return
      const idx = manager.findMoveIndexById(item.moveId)
      if (idx !== -1) manager.goToMove(idx)
    },
    [manager]
  )

  // Player follows navigation: commented line -> engine PV1 -> mainline continuation.
  useEffect(() => {
    if (!player) return
    const gm = state.gameJson?.moves?.[currentMoveIndex]
    if (!gm) return
    let line: PlayerLine | null = null
    const cf = gm.comment_facts
    if (cf?.display_line?.san?.length) {
      line = {
        steps: cf.display_line.san.map((san, i) => ({ san, fen: cf.display_line!.fens[i] ?? '' })),
        startFen: cf.display_line.start_fen,
        evalCp: cf.eval_cp,
        evalMate: cf.eval_mate,
        depth: cf.depth,
        title: 'Commented line',
      }
    } else if (gm.variations?.[0]?.line?.length) {
      const v = gm.variations[0]
      line = {
        steps: v.line.map((san, i) => ({ san, fen: v.fens?.[i] ?? '' })),
        startFen: manager.getPositionForIndex(currentMoveIndex - 1),
        evalCp: v.score?.cp ?? null,
        evalMate: v.score?.mate ?? null,
        depth: v.depth ?? null,
        title: 'Engine line 1',
      }
    } else {
      // Book moves: play the theory continuation from the mainline.
      const moves = state.gameJson?.moves ?? []
      const cont = moves.slice(currentMoveIndex, currentMoveIndex + 8)
      if (cont.length) {
        line = {
          steps: cont.map((m) => ({ san: m.san, fen: m.fen })),
          startFen: manager.getPositionForIndex(currentMoveIndex - 1),
          title: 'Game continuation (theory)',
        }
      }
    }
    if (line) player.loadLine(line, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMoveIndex, state.gameJson])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-primary">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-tertiary px-2 py-1">
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border-secondary" role="group" aria-label="Commentary language level">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => changeLevel(l.value)}
                className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  level === l.value
                    ? 'bg-accent-progress/25 text-text-primary'
                    : 'bg-background-primary text-text-tertiary hover:bg-background-secondary'
                }`}
                aria-pressed={level === l.value}
              >
                {l.label}
              </button>
            ))}
          </div>
          {commentaryGenerating ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-text-warning">
              <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-text-warning border-t-transparent" />
              generating…
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
          <button
            type="button"
            disabled={!prevComment}
            onClick={() => goToComment(prevComment)}
            className="rounded border border-border-secondary px-1.5 py-0.5 font-medium text-text-secondary hover:bg-background-secondary disabled:opacity-40"
            title="Previous comment"
          >
            ‹
          </button>
          <span className="tabular-nums">
            {navPos > 0 ? navPos : '–'}/{sortedForNav.length}
          </span>
          <button
            type="button"
            disabled={!nextComment}
            onClick={() => goToComment(nextComment)}
            className="rounded border border-border-secondary px-1.5 py-0.5 font-medium text-text-secondary hover:bg-background-secondary disabled:opacity-40"
            title="Next comment"
          >
            ›
          </button>
        </div>
      </div>

      {/* Zone 1: the comment (flexible, scrolls) */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-2 py-1.5">
        {displayedComments.length === 0 ? (
          <div className="flex h-full min-h-[60px] flex-col items-center justify-center text-[11px] italic text-text-tertiary">
            <p>No commentary available for this game.</p>
          </div>
        ) : activeComment ? (
          <>
            <CommentItem
              id={`comment-main-${activeComment.moveId}`}
              title={activeMainTitle}
              text={activeComment.texts?.[level] ?? activeComment.text}
              isActive
              keyMomentType={activeKeyMomentType}
              pvLine={activeComment.pvLine}
              resolvedTokens={
                activeComment.resolvedTokensByLevel?.[level] ?? activeComment.resolvedTokens
              }
              ragRefs={activeComment.ragRefs}
              llmDebug={activeComment.llmDebug}
            />
            {(() => {
              const gm = state.gameJson?.moves?.[activeComment.moveIndex]
              return gm?.comment_facts ? (
                <StructuredComment facts={gm.comment_facts} debug={gm.debug} />
              ) : null
            })()}
          </>
        ) : (
          <div className="flex h-full min-h-[60px] flex-col items-center justify-center px-2 text-center text-text-secondary">
            <p className="mb-0.5 text-[11px] font-medium text-text-primary">No commentary for this move</p>
            <p className="text-[10px] text-text-tertiary">
              Use ‹ › above to jump between commented moves.
            </p>
          </div>
        )}
      </div>

      {/* Zone 2: embedded variation player (fixed height) */}
      <VariationPlayer />

      {/* Zone 3: feature charts, fixed at 50% of the column */}
      <div className="h-1/2 shrink-0 grow-0 border-t border-border-tertiary">
        <FeatureChartsPanel embedded />
      </div>
    </div>
  )
}

export default Comments
