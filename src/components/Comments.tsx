import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import type { MainlineComment } from '@/contexts/GameStateManager'
import type { PlayerLine, LineStep } from '@/types/Line'
import type { GameMove, CommentFactsLine, CommentFactsClaim } from '@/types/GameJson'
import CommentItem from './CommentItem'
import StructuredComment, { type CommentPart } from './StructuredComment'
import PvBoard from './PvBoard'
import FeatureCharts from './FeatureCharts'
import Icon from '@/components/ui/Icon'

/** Build a player line (steps + chart series) from a CommentFacts line, with a
 * gray lead-in step (the position before the move) prepended. */
function factsLineToPlayer(
  line: CommentFactsLine,
  claims: CommentFactsClaim[] | undefined,
  evalCp: number | null | undefined,
  evalMate: number | null | undefined,
  depth: number | null | undefined,
  title: string,
  tone: 'main' | 'alt',
  prevMove: GameMove | null | undefined,
): PlayerLine {
  const chartFeatures = Array.from(
    new Set((claims ?? []).flatMap((c) => c.features ?? [])),
  ).slice(0, 4)
  const baseSteps = line.san.map((san, i) => ({ san, fen: line.fens[i] ?? '' }))
  const lead = leadInStep(line.start_fen, prevMove)
  return {
    steps: lead ? [lead, ...baseSteps] : baseSteps,
    startFen: line.start_fen,
    evalCp: evalCp ?? null,
    evalMate: evalMate ?? null,
    depth: depth ?? null,
    title,
    featureSeries: line.feature_series ?? {},
    chartFeatures,
    tone,
  }
}

/** Title for the alternative card/line (better / engine's choice / weaker). */
function altLineTitle(
  san: string,
  isInferior: boolean,
  altCp: number | null,
  playedCp: number | null,
): string {
  const gap = altCp != null && playedCp != null ? Math.abs(altCp - playedCp) : null
  if (isInferior) {
    return gap != null && gap >= 60 ? `Weaker was ${san}` : `Comparable: ${san}`
  }
  return gap != null && gap < 50 ? `Engine's choice: ${san}` : `Better was ${san}`
}

function evalChipLabel(
  cp: number | null | undefined,
  mate: number | null | undefined,
  depth: number | null | undefined,
): string {
  let head: string
  if (mate != null && mate !== 0)
    head = `#${Math.abs(mate)} ${mate > 0 ? 'White' : 'Black'}`
  else if (cp != null) head = `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`
  else return ''
  return depth != null ? `${head} · depth ${depth}` : head
}

function formatCommentTitle(
  item: MainlineComment,
  moveNotation: string,
): string {
  return `Move ${Math.floor(item.moveIndex / 2) + 1}${item.moveIndex % 2 === 0 ? '.' : '...'} ${moveNotation}`
}

/**
 * A lead-in step so the PV viewer opens one ply earlier — on the position the
 * commented move was played from, carrying the previous move's arrow. This way
 * the reader sees the move that led in and what the feature changes are measured
 * against (point 0 of the chart series), instead of jumping straight to the
 * position after the move (Guid).
 */
function leadInStep(
  startFen: string | null | undefined,
  prevMove?: GameMove | null,
): LineStep | null {
  if (!startFen || !prevMove) return null
  const uci = prevMove.uci ?? ''
  return {
    san: prevMove.san ?? '',
    fen: startFen,
    from: uci.slice(0, 2) || undefined,
    to: uci.slice(2, 4) || undefined,
  }
}

const Comments: React.FC = () => {
  const { state, manager } = useGameState()
  const {
    commentsMainline,
    currentMoveIndex,
    commentaryComplete,
    aiGeneration,
    selectedPart,
  } = state
  // The current ply along the shown line — shared by the board, the move cards
  // and the charts so they stay in sync. Reset when the move changes.
  const [pvIdx, setPvIdx] = useState(0)
  useEffect(() => setPvIdx(0), [currentMoveIndex])

  // Selecting a line focuses the variation navigator so arrow keys drive it.
  const setSelectedPart = useCallback(
    (p: CommentPart) => {
      manager.setSelectedPart(p)
      manager.setFocusedBoard('variation')
    },
    [manager],
  )

  // Clicking a ply token selects its line and jumps the board to that ply.
  const onSelectPly = useCallback(
    (part: CommentPart, ply: number) => {
      manager.setSelectedPart(part)
      manager.setFocusedBoard('variation')
      setPvIdx(ply)
    },
    [manager],
  )

  // Navigation resets the navigator to the move's main line (no focus change).
  useEffect(() => {
    manager.setSelectedPart('main')
  }, [currentMoveIndex, manager])

  // Clicking a PV reference in the comment prose loads that line into the
  // navigator (main/alt) and moves keyboard focus to it.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const part = (e as CustomEvent).detail?.part
      if (part === 'main' || part === 'alt') manager.setSelectedPart(part)
      manager.setFocusedBoard('variation')
    }
    window.addEventListener('aca:variation-open', onOpen)
    return () => window.removeEventListener('aca:variation-open', onOpen)
  }, [manager])

  const commentaryGenerating = useMemo(
    () => !commentaryComplete || Object.keys(aiGeneration).length > 0,
    [commentaryComplete, aiGeneration],
  )

  const currentMove = manager.getMainlineMove(currentMoveIndex)
  const currentMoveId = currentMove?.id

  const displayedComments = commentsMainline
  // Nav/count covers only real key-moment commentary, not the template floor
  // every analyzed move carries. (The reading pane still shows facts for any
  // selected move via comment_facts.)
  const keyMomentIdx = useMemo(() => {
    const s = new Set<number>()
    state.gameJson?.moves?.forEach((m, i) => {
      if (m.is_key_moment) s.add(i)
    })
    return s
  }, [state.gameJson])
  const sortedForNav = useMemo(
    () =>
      [...displayedComments]
        .filter((c) => keyMomentIdx.size === 0 || keyMomentIdx.has(c.moveIndex))
        .sort((a, b) => a.moveIndex - b.moveIndex),
    [displayedComments, keyMomentIdx],
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
    const km = (moveData.hiddenFeatures as Record<string, unknown>)[
      'keyMomentType'
    ]
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
    [manager],
  )

  const gm = state.gameJson?.moves?.[currentMoveIndex]
  const facts = gm?.comment_facts ?? null

  // Tell the focus model whether this move has a better-alternative line, so the
  // Up/Down focus cycle includes (or skips) the alternative board.
  const hasAlt = !!facts?.better_alternative?.display_line?.san?.length
  useEffect(() => {
    manager.setHasAlternative(hasAlt)
  }, [hasAlt, manager])

  // The main line (played move's envisioned continuation), or — for moves
  // without facts — engine PV1, then the game continuation (book theory).
  const mainLine = useMemo<PlayerLine | null>(() => {
    const prevMove = state.gameJson?.moves?.[currentMoveIndex - 1]
    if (facts?.display_line?.san?.length) {
      return factsLineToPlayer(
        facts.display_line,
        facts.claims,
        facts.eval_cp,
        facts.eval_mate,
        facts.depth,
        'Main line',
        'main',
        prevMove,
      )
    }
    if (gm?.variations?.[0]?.line?.length) {
      const v = gm.variations[0]
      const startFen = manager.getPositionForIndex(currentMoveIndex - 1)
      const baseSteps = v.line.map((san, i) => ({ san, fen: v.fens?.[i] ?? '' }))
      const lead = leadInStep(startFen, prevMove)
      return {
        steps: lead ? [lead, ...baseSteps] : baseSteps,
        startFen,
        evalCp: v.score?.cp ?? null,
        evalMate: v.score?.mate ?? null,
        depth: v.depth ?? null,
        title: 'Engine line 1',
      }
    }
    const moves = state.gameJson?.moves ?? []
    const cont = moves.slice(currentMoveIndex, currentMoveIndex + 8)
    if (cont.length) {
      const startFen = manager.getPositionForIndex(currentMoveIndex - 1)
      const baseSteps = cont.map((m) => ({ san: m.san, fen: m.fen }))
      const lead = leadInStep(startFen, prevMove)
      return {
        steps: lead ? [lead, ...baseSteps] : baseSteps,
        startFen,
        title: 'Game continuation',
      }
    }
    return null
  }, [facts, gm, currentMoveIndex, state.gameJson, manager])

  // The better/weaker alternative line, when the move has one.
  const altLine = useMemo<PlayerLine | null>(() => {
    const a = facts?.better_alternative
    if (!a?.display_line?.san?.length) return null
    const prevMove = state.gameJson?.moves?.[currentMoveIndex - 1]
    const title = altLineTitle(
      a.san,
      !!a.is_inferior,
      a.eval_cp,
      facts?.eval_cp ?? null,
    )
    return factsLineToPlayer(
      a.display_line,
      a.claims,
      a.eval_cp,
      null,
      facts?.depth,
      title,
      'alt',
      prevMove,
    )
  }, [facts, currentMoveIndex, state.gameJson])

  const selectedLine = selectedPart === 'alt' && altLine ? altLine : mainLine
  const pvLen = selectedLine?.steps.length ?? 1
  const idx = Math.max(0, Math.min(pvIdx, pvLen - 1))

  const evalChip = evalChipLabel(
    facts?.eval_cp ?? currentMove?.score ?? null,
    facts?.eval_mate ?? currentMove?.mateIn,
    facts?.depth ?? state.gameJson?.analysis_info?.depth ?? null,
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
          <button
            type="button"
            className="btn icon-btn"
            style={{ width: 26, height: 26 }}
            disabled={!prevComment}
            onClick={() => goToComment(prevComment)}
            title="Previous comment"
          >
            <Icon name="prev" size={14} />
          </button>
          <span className="mono tabular-nums">
            {navPos > 0 ? navPos : '–'}/{sortedForNav.length}
          </span>
          <button
            type="button"
            className="btn icon-btn"
            style={{ width: 26, height: 26 }}
            disabled={!nextComment}
            onClick={() => goToComment(nextComment)}
            title="Next comment"
          >
            <Icon name="next" size={14} />
          </button>
        </div>
      </div>

      <div className="scroll-y min-h-0 flex-1">
        {!activeComment && !facts && !mainLine ? (
          <div className="flex min-h-[60px] flex-col items-center justify-center p-4 text-center text-text-secondary">
            <p className="mb-0.5 text-[12px] font-medium text-text-primary">
              {displayedComments.length === 0
                ? 'No commentary available for this game.'
                : 'No commentary for this move'}
            </p>
            <p className="text-[11px] text-text-tertiary">
              Use ‹ › above to jump between commented moves.
            </p>
          </div>
        ) : (
          <div className="comment-body">
            {/* LLM prose comment (key moments only) */}
            {activeComment ? (
              <>
                <h2 className="comment-title flex items-center gap-2">
                  {activeMainTitle}
                  {gm?.final_comment ? (
                    <span
                      className="rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] font-semibold text-emerald-600"
                      title="This comment would be used in the final annotated game"
                    >
                      Final
                    </span>
                  ) : null}
                </h2>
                <CommentItem
                  id={`comment-main-${activeComment.moveId}`}
                  title=""
                  text={activeComment.text}
                  isActive
                  keyMomentType={activeKeyMomentType}
                  resolvedTokens={activeComment.resolvedTokens}
                  llmDebug={activeComment.llmDebug}
                />
              </>
            ) : null}

            {/* PV board (left) + the line cards (right). */}
            <div className="mt-2 flex flex-wrap gap-3">
              <PvBoard
                line={selectedLine}
                idx={idx}
                onIdx={setPvIdx}
                loadKey={`${currentMoveIndex}:${selectedPart}`}
              />
              {facts ? (
                <StructuredComment
                  facts={facts}
                  debug={gm?.debug}
                  mainLine={mainLine}
                  altLine={altLine}
                  selectedPart={selectedPart}
                  onSelectPart={setSelectedPart}
                  pvIdx={idx}
                  onSelectPly={onSelectPly}
                />
              ) : null}
            </div>

            {/* Feature charts below: main (green) + alternative (gray) + game
                (orange dashed). */}
            <div className="mt-2 border-t border-border-tertiary pt-3">
              <FeatureCharts
                mainLine={mainLine}
                altLine={altLine}
                gameSeries={state.gameJson?.feature_series?.features ?? {}}
                mainlinePly={currentMoveIndex}
                idx={idx}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Comments
