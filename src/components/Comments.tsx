import { Chess } from 'chess.js'
import { moveAnnotationBadge } from '@/helpers/keyMoments'
import { alternativeTitle } from '@/helpers/alternativeTitle'
import React, { createContext, useContext, useEffect, useMemo, useCallback, useState, useRef } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import type { MainlineComment } from '@/contexts/GameStateManager'
import type { PlayerLine, LineStep } from '@/types/Line'
import type { GameMove, CommentFactsLine, CommentFactsClaim } from '@/types/GameJson'
import CommentItem from './CommentItem'
import StructuredComment, { ReasoningDetails, type CommentPart } from './StructuredComment'
import PvBoard from './PvBoard'
import RuleEvidenceRows, { GameFeatureContext } from './RuleEvidenceRows'
import Icon from '@/components/ui/Icon'
import CommentStatusBadge from '@/components/CommentStatusBadge'

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
  const baseSteps = replaySteps(line.start_fen, line.san, line.fens)
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

/** Resolve move squares from this branch, including castling and promotions. */
function replaySteps(startFen: string | null | undefined, sans: string[], fens?: string[]): LineStep[] {
  let board: Chess | null = null
  try { if (startFen) board = new Chess(startFen) } catch { /* Invalid legacy line. */ }
  return sans.map((san, i) => {
    try {
      const move = board?.move(san)
      if (move) return { san, fen: fens?.[i] || board!.fen(), from: move.from, to: move.to }
    } catch { /* Keep the saved position, but never guess another branch's move. */ }
    try { board = fens?.[i] ? new Chess(fens[i]) : null } catch { board = null }
    return { san, fen: fens?.[i] ?? '' }
  })
}

/** Keep the position before the line available for rewinding and chart point 0. */
function leadInStep(
  startFen: string | null | undefined,
  prevMove?: GameMove | null,
): LineStep | null {
  if (!startFen) return null
  const uci = prevMove?.uci ?? ''
  return {
    san: prevMove?.san ?? '',
    fen: startFen,
    from: uci.slice(0, 2) || undefined,
    to: uci.slice(2, 4) || undefined,
  }
}

function useCommentaryView() {
  const { state, manager } = useGameState()
  const {
    commentsMainline,
    currentMoveIndex,
    commentaryComplete,
    aiGeneration,
    selectedPart,
  } = state
  // The current ply along the shown line — shared by the board, the move cards
  // and the charts so they stay in sync. Open after the first move in the line.
  const [pvIdx, setPvIdx] = useState(1)
  const requestedPly = useRef<{ part: CommentPart; moveIndex: number; ply: number } | null>(null)


  // Selecting a line focuses the variation navigator (the reset is handled by
  // the line reset effect, which also covers arrow-driven board switches).
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
      if (part !== selectedPart) requestedPly.current = { part, moveIndex: currentMoveIndex, ply }
      manager.setSelectedPart(part)
      manager.setFocusedBoard('variation')
      setPvIdx(ply)
    },
    [manager, selectedPart, currentMoveIndex],
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
  const sortedForNav = useMemo(
    () => [...displayedComments].filter((c) => c.text.trim())
      .sort((a, b) => a.moveIndex - b.moveIndex),
    [displayedComments],
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
      const baseSteps = replaySteps(startFen, v.line, v.fens)
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
      const baseSteps = replaySteps(startFen, cont.map((m) => m.san), cont.map((m) => m.fen))
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
    if (!facts || !a?.display_line?.san?.length) return null
    const prevMove = state.gameJson?.moves?.[currentMoveIndex - 1]
    const title = alternativeTitle(facts)
    return factsLineToPlayer(
      a.display_line,
      a.claims,
      a.eval_cp,
      a.eval_mate,
      facts?.depth,
      title,
      'alt',
      prevMove,
    )
  }, [facts, currentMoveIndex, state.gameJson])

  const selectedLine = selectedPart === 'alt' && altLine ? altLine : mainLine
  const lineKey = JSON.stringify(selectedLine?.steps.map((step) => [step.san, step.fen]) ?? [])
  useEffect(() => {
    const requested = requestedPly.current
    const last = Math.max(0, (selectedLine?.steps.length ?? 0) - 1)
    setPvIdx(Math.max(0, Math.min(
      requested?.part === selectedPart && requested.moveIndex === currentMoveIndex ? requested.ply : 1,
      last,
    )))
    requestedPly.current = null
    // The signature tracks actual replay changes, not unrelated metadata updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMoveIndex, selectedPart, lineKey])
  const pvLen = Math.max(1, selectedLine?.steps.length ?? 0)
  const idx = Math.max(0, Math.min(pvIdx, pvLen - 1))

  const evalChip = facts?.terminal_result ? `Result: ${facts.terminal_result}` : evalChipLabel(
    facts?.eval_cp ?? currentMove?.score ?? null,
    facts?.eval_mate ?? currentMove?.mateIn,
    facts?.depth ?? state.gameJson?.analysis_info?.depth ?? null,
  )

  return { state, currentMoveId, activeComment, activeMainTitle, activeKeyMomentType, gm,
    commentaryGenerating, evalChip, prevComment, nextComment, goToComment,
    navPos, sortedForNav, displayedComments, facts, mainLine, altLine,
    selectedLine, lineKey, idx, setPvIdx, currentMoveIndex, selectedPart, setSelectedPart, onSelectPly }
}

const CommentaryContext = createContext<ReturnType<typeof useCommentaryView> | null>(null)

export function CommentaryProvider({ children }: { children: React.ReactNode }) {
  const view = useCommentaryView()
  return <CommentaryContext.Provider value={view}>{children}</CommentaryContext.Provider>
}

function useCommentary() {
  const view = useContext(CommentaryContext)
  if (!view) throw new Error('Commentary panels require CommentaryProvider')
  return view
}

const Comments: React.FC = () => {
  const { state, currentMoveId, activeComment, activeMainTitle, activeKeyMomentType, gm, commentaryGenerating,
    prevComment, nextComment, goToComment, navPos, sortedForNav,
    displayedComments } = useCommentary()
  const annotation = state.moves.getMoveAtIndex(state.currentMoveIndex)?.annotation ?? gm?.annotation
  const event = [gm?.classification, gm?.debug?.key_moment_type, activeKeyMomentType]
    .find((kind) => kind === 'best_move' || kind === 'great_move' || kind === 'good_defense')
  const qualityBadge = moveAnnotationBadge(annotation, event)
  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <div className="panel-head flex-wrap">
        <Icon name="msg" size={15} />
        <h3>Commentary</h3>
        <CommentStatusBadge move={gm} generating={currentMoveId != null && !!state.aiGeneration[currentMoveId]}
          commentaryComplete={state.commentaryComplete} />
        <div className="grow" />
        {commentaryGenerating ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-text-warning">
            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-text-warning border-t-transparent" />
            generating…
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
        {!activeComment ? (
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
            {/* Prose is separate from the complete supporting fact catalogue. */}
            {activeComment ? (
              <>
                <h2 className="comment-title flex flex-wrap items-center gap-2">
                  {activeMainTitle}
                  {qualityBadge ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.85em] font-semibold leading-none"
                      style={{ color: qualityBadge.color, borderColor: `color-mix(in srgb, ${qualityBadge.color} 40%, transparent)`,
                        backgroundColor: `color-mix(in srgb, ${qualityBadge.color} 12%, transparent)` }}
                      aria-label={`${qualityBadge.annotation} ${qualityBadge.label}`}>
                      <span aria-hidden="true">{qualityBadge.annotation}</span>
                      <span aria-hidden="true">{qualityBadge.label}</span>
                    </span>
                  ) : null}
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


          </div>
        )}
      </div>
    </div>
  )
}

export function EvidencePanel() {
  const { state, facts, gm, mainLine, altLine, selectedLine, lineKey, idx, setPvIdx,
    currentMoveIndex, selectedPart, setSelectedPart, onSelectPly } = useCommentary()
  return (
    <aside className="analysis-evidence" aria-label="Variations and supporting evidence">
      <section className="panel analysis-evidence-panel">
        <div className="panel-head"><Icon name="list" size={15} /><h3>Variations &amp; evidence</h3></div>
        <div className="analysis-facts-layout flex flex-wrap items-start gap-3 p-3">
          <PvBoard line={selectedLine} idx={idx} onIdx={setPvIdx}
            loadKey={`${currentMoveIndex}:${selectedPart}:${lineKey}`} />
          {facts ? <StructuredComment facts={facts}
            mainLine={mainLine} altLine={altLine} selectedPart={selectedPart}
            onSelectPart={setSelectedPart} pvIdx={idx} onSelectPly={onSelectPly} />
            : <p className="text-xs text-text-secondary">No rule facts for this move.</p>}
        </div>
        {facts ? <RuleEvidenceRows key={currentMoveIndex} facts={facts} mainLine={mainLine} altLine={altLine}
          selectedPart={selectedPart} idx={idx} onSelectPly={onSelectPly} />
          : <GameFeatureContext key={currentMoveIndex} series={state.gameJson?.feature_series} ply={currentMoveIndex + 1} />}
        {gm?.debug ? <div className="evidence-diagnostics"><ReasoningDetails debug={gm.debug} /></div> : null}
      </section>
    </aside>
  )
}

export default Comments
