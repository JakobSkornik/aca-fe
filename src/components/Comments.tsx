import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import type { MainlineComment } from '@/contexts/GameStateManager'
import CommentItem from './CommentItem'

function formatCommentTitle(item: MainlineComment, moveNotation: string): string {
  return `Move ${Math.floor(item.moveIndex / 2) + 1}${item.moveIndex % 2 === 0 ? '.' : '...'} ${moveNotation}`
}

const Comments: React.FC = () => {
  const { state, manager } = useGameState()
  const { commentsMainline, currentMoveIndex, commentaryComplete, aiGeneration } = state
  const activeNavRef = useRef<HTMLButtonElement>(null)

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

  useEffect(() => {
    activeNavRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentMoveId])

  const handleNavClick = useCallback(
    (item: MainlineComment) => {
      const idx = manager.findMoveIndexById(item.moveId)
      if (idx !== -1) manager.goToMove(idx)
    },
    [manager]
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-background-primary">
      <div className="flex min-h-0 flex-1 flex-row">
        <div className="min-w-0 flex-1 overflow-y-auto scroll-smooth px-2 py-1.5">
          {displayedComments.length === 0 ? (
            <div className="flex h-full min-h-[100px] flex-col items-center justify-center text-[11px] italic text-text-tertiary">
              <p>No commentary available for this game.</p>
            </div>
          ) : activeComment ? (
            <CommentItem
              id={`comment-main-${activeComment.moveId}`}
              title={activeMainTitle}
              text={activeComment.text}
              isActive
              keyMomentType={activeKeyMomentType}
              pvLine={activeComment.pvLine}
              resolvedTokens={activeComment.resolvedTokens}
              ragRefs={activeComment.ragRefs}
              llmDebug={activeComment.llmDebug}
            />
          ) : (
            <div className="flex h-full min-h-[100px] flex-col items-center justify-center px-2 text-center text-text-secondary">
              <p className="mb-0.5 text-[11px] font-medium text-text-primary">No commentary for this move</p>
              <p className="text-[10px] text-text-tertiary">
                Select a move in the move list that has commentary, or pick one from the commentary sidebar.
              </p>
            </div>
          )}
        </div>

        <div className="flex w-[168px] shrink-0 flex-col border-l border-border-tertiary bg-background-secondary xl:w-[188px]">
          <div className="shrink-0 space-y-1 border-b border-border-tertiary px-2 py-1">
            <div className="text-[11px] font-semibold tabular-nums text-text-primary">
              {displayedComments.length} {displayedComments.length === 1 ? 'comment' : 'comments'}
            </div>
            {commentaryGenerating ? (
              <div className="flex items-center gap-1.5 rounded border border-border-secondary bg-background-warning px-1.5 py-1 text-[10px] font-medium text-text-warning">
                <span
                  className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-text-warning border-t-transparent"
                  aria-hidden
                />
                <span>Commentary generating…</span>
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1">
            {sortedForNav.length === 0 ? (
              <p className="px-1 py-2 text-center text-[10px] text-text-tertiary">—</p>
            ) : (
              sortedForNav.map((item, navIndex) => {
                const moveIdx = manager.findMoveIndexById(item.moveId)
                const move = manager.getMainlineMove(moveIdx)
                const moveNotation = move?.move || ''
                const title = formatCommentTitle(item, moveNotation)
                const isNavActive = item.moveId === currentMoveId

                return (
                  <button
                    key={`nav-${navIndex}-${item.moveId}-${item.moveIndex}`}
                    type="button"
                    ref={isNavActive ? activeNavRef : undefined}
                    onClick={() => handleNavClick(item)}
                    className={`w-full rounded border px-1.5 py-1 text-left text-[10px] transition-colors ${
                      isNavActive
                        ? 'border-border-secondary bg-background-primary shadow-sm ring-1 ring-accent-progress/40'
                        : 'border-transparent hover:border-border-tertiary hover:bg-background-primary'
                    }`}
                  >
                    <div className="leading-snug font-semibold text-text-primary">{title}</div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Comments
