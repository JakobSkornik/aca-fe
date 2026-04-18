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
    <div className="flex flex-col h-full bg-lightest-gray min-h-0">
      <div className="p-2 bg-light-gray border-b border-gray-300 shadow-sm z-10 flex-shrink-0 space-y-1.5">
        <div className="font-semibold text-darkest-gray flex justify-between items-center">
          <span>Analysis Commentary</span>
          <span className="text-xs font-normal text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
            {displayedComments.length} comments
          </span>
        </div>
        {commentaryGenerating && (
          <div className="flex items-center gap-2 text-xs font-medium text-amber-900 bg-amber-100/90 border border-amber-200/80 rounded px-2 py-1.5">
            <span
              className="inline-block h-3.5 w-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0"
              aria-hidden
            />
            <span>Commentary generating…</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0 flex-row">
        <div className="flex-1 min-w-0 overflow-y-auto p-4 scroll-smooth">
          {displayedComments.length === 0 ? (
            <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-gray-400 italic">
              <span className="text-4xl mb-2">💬</span>
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
            <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-gray-500 text-center px-4">
              <p className="font-medium text-darkest-gray mb-1">No commentary for this move</p>
              <p className="text-sm text-gray-500">
                Select a move in the list on the right that has commentary, or use the movelist below.
              </p>
            </div>
          )}
        </div>

        <div className="w-[220px] xl:w-[260px] flex-shrink-0 border-l border-gray-200 flex flex-col min-h-0 bg-light-gray/40">
          <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 flex-shrink-0">
            All comments
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sortedForNav.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-4 text-center">—</p>
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
                    className={`w-full text-left rounded-md px-2 py-2 text-xs transition-colors border border-transparent ${
                      isNavActive
                        ? 'bg-light-gray shadow-sm border-gray-300 ring-1 ring-blue-200/80'
                        : 'hover:bg-lightest-gray border-gray-100'
                    }`}
                  >
                    <div className="font-semibold text-darkest-gray leading-tight">{title}</div>
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
