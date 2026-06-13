import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import type { MainlineComment } from '@/contexts/GameStateManager'
import type { PlayerLine } from '@/types/Line'
import CommentItem from './CommentItem'
import StructuredComment, { type CommentPart } from './StructuredComment'
import VariationPlayer from './VariationPlayer'
import Icon from '@/components/ui/Icon'

function evalChipLabel(cp: number | null | undefined, mate: number | null | undefined, depth: number | null | undefined): string {
  let head: string
  if (mate != null && mate !== 0) head = `#${Math.abs(mate)}`
  else if (cp != null) head = `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`
  else return ''
  return depth != null ? `${head} · depth ${depth}` : head
}

function formatCommentTitle(item: MainlineComment, moveNotation: string): string {
  return `Move ${Math.floor(item.moveIndex / 2) + 1}${item.moveIndex % 2 === 0 ? '.' : '...'} ${moveNotation}`
}

const Comments: React.FC = () => {
  const { state, manager } = useGameState()
  const { commentsMainline, currentMoveIndex, commentaryComplete, aiGeneration } = state
  const [selectedPart, setSelectedPart] = useState<CommentPart>('main')

  // Navigation resets the focus to the move's main line.
  useEffect(() => {
    setSelectedPart('main')
  }, [currentMoveIndex])

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

  const gm = state.gameJson?.moves?.[currentMoveIndex]
  const facts = gm?.comment_facts ?? null

  // The pinned player shows the selected part's line; for moves without facts
  // it falls back to engine PV1, then the game continuation (book theory).
  const playerLine = useMemo<PlayerLine | null>(() => {
    if (facts) {
      const useAlt = selectedPart === 'alt' && !!facts.better_alternative?.display_line?.san?.length
      const src = useAlt
        ? {
            line: facts.better_alternative!.display_line!,
            claims: facts.better_alternative!.claims,
            evalCp: facts.better_alternative!.eval_cp,
            evalMate: null as number | null,
            title: `Better was ${facts.better_alternative!.san}`,
          }
        : facts.display_line?.san?.length
          ? {
              line: facts.display_line,
              claims: facts.claims,
              evalCp: facts.eval_cp,
              evalMate: facts.eval_mate,
              title: 'Main line',
            }
          : null
      if (src) {
        const chartFeatures = Array.from(
          new Set((src.claims ?? []).flatMap((c) => c.features ?? []))
        ).slice(0, 4)
        return {
          steps: src.line.san.map((san, i) => ({ san, fen: src.line.fens[i] ?? '' })),
          startFen: src.line.start_fen,
          evalCp: src.evalCp,
          evalMate: src.evalMate,
          depth: facts.depth,
          title: src.title,
          featureSeries: src.line.feature_series ?? {},
          chartFeatures,
        }
      }
    }
    if (gm?.variations?.[0]?.line?.length) {
      const v = gm.variations[0]
      return {
        steps: v.line.map((san, i) => ({ san, fen: v.fens?.[i] ?? '' })),
        startFen: manager.getPositionForIndex(currentMoveIndex - 1),
        evalCp: v.score?.cp ?? null,
        evalMate: v.score?.mate ?? null,
        depth: v.depth ?? null,
        title: 'Engine line 1',
      }
    }
    const moves = state.gameJson?.moves ?? []
    const cont = moves.slice(currentMoveIndex, currentMoveIndex + 8)
    if (cont.length) {
      return {
        steps: cont.map((m) => ({ san: m.san, fen: m.fen })),
        startFen: manager.getPositionForIndex(currentMoveIndex - 1),
        title: 'Game continuation',
      }
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, selectedPart, gm, currentMoveIndex, state.gameJson])

  const evalChip = evalChipLabel(
    facts?.eval_cp ?? currentMove?.score ?? null,
    facts?.eval_mate ?? currentMove?.mateIn,
    facts?.depth ?? state.gameJson?.analysis_info?.depth ?? null
  )

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <div className="panel-head">
        <Icon name="msg" size={15} />
        <h3>Commentary</h3>
        <div className="grow" />
        {commentaryGenerating ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-text-warning">
            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-text-warning border-t-transparent" />
            generating…
          </span>
        ) : null}
        {evalChip ? (
          <span className="chip adv">
            <Icon name="cpu" size={12} />
            {evalChip}
          </span>
        ) : null}
        <div className="ml-1 flex items-center gap-1 text-[10px] text-text-tertiary">
          <button type="button" className="btn icon-btn" style={{ width: 26, height: 26 }} disabled={!prevComment} onClick={() => goToComment(prevComment)} title="Previous comment">
            <Icon name="prev" size={14} />
          </button>
          <span className="mono tabular-nums">
            {navPos > 0 ? navPos : '–'}/{sortedForNav.length}
          </span>
          <button type="button" className="btn icon-btn" style={{ width: 26, height: 26 }} disabled={!nextComment} onClick={() => goToComment(nextComment)} title="Next comment">
            <Icon name="next" size={14} />
          </button>
        </div>
      </div>

      {/* Comment + part cards (flexible, scrolls) */}
      <div className="scroll-y min-h-0 flex-1">
        {displayedComments.length === 0 ? (
          <div className="flex h-full min-h-[60px] flex-col items-center justify-center p-4 text-[12px] italic text-text-tertiary">
            <p>No commentary available for this game.</p>
          </div>
        ) : activeComment ? (
          <div className="comment-body">
            <h2 className="comment-title">{activeMainTitle}</h2>
            <CommentItem
              id={`comment-main-${activeComment.moveId}`}
              title=""
              text={activeComment.text}
              isActive
              keyMomentType={activeKeyMomentType}
              resolvedTokens={activeComment.resolvedTokens}
              ragRefs={activeComment.ragRefs}
              llmDebug={activeComment.llmDebug}
            />
            {facts ? (
              <StructuredComment
                facts={facts}
                debug={gm?.debug}
                selectedPart={selectedPart}
                onSelectPart={setSelectedPart}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex h-full min-h-[60px] flex-col items-center justify-center p-4 text-center text-text-secondary">
            <p className="mb-0.5 text-[12px] font-medium text-text-primary">No commentary for this move</p>
            <p className="text-[11px] text-text-tertiary">Use ‹ › above to jump between commented moves.</p>
          </div>
        )}
      </div>

      {/* PV player pinned directly under the comment it belongs to */}
      <div className="shrink-0 border-t border-border-tertiary p-3">
        <VariationPlayer
          line={playerLine}
          loadKey={`${currentMoveIndex}:${selectedPart}:${playerLine?.title ?? ''}`}
          mainlineSeries={state.gameJson?.feature_series?.features ?? {}}
          mainlinePlies={state.gameJson?.feature_series?.plies?.length ?? 0}
          mainlinePly={currentMoveIndex}
        />
      </div>
    </div>
  )
}

export default Comments
