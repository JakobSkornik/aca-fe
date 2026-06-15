import React, { useRef, useEffect, useMemo } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { UIHelpers } from '@/helpers/uiHelpers'
import { Move } from '@/types/chess/Move'
import Icon from '@/components/ui/Icon'

const VALID_ANNOTATIONS = new Set(['??', '?', '?!', '!?', '!', '!!'])
const BAD_ANNOTATIONS = new Set(['??', '?', '?!'])
const GOOD_ANNOTATIONS = new Set(['!?', '!', '!!'])

function moveAnnotation(move: Move | undefined): string | undefined {
  const raw = move?.annotation
  return raw && VALID_ANNOTATIONS.has(raw) ? raw : undefined
}

function qClass(q: string | undefined): string {
  if (!q) return ''
  if (q === '??') return 'q-blunder'
  if (BAD_ANNOTATIONS.has(q)) return 'q-inacc'
  if (GOOD_ANNOTATIONS.has(q)) return 'q-good'
  return ''
}

function formatScore(move: Move | undefined): string | null {
  if (!move) return null
  if (move.mateIn != null) return `M${move.mateIn}`
  if (move.score !== undefined) return (move.score / 100).toFixed(2)
  if (move.phase === 'early') return 'book'
  return null
}

function MoveCell({
  move,
  active,
  hasComment,
  generating,
  onClick,
}: {
  move: Move | undefined
  active: boolean
  hasComment: boolean
  generating: boolean
  onClick: () => void
}) {
  if (!move?.move) return <div className="move-cell ca-muted" style={{ cursor: 'default' }}>—</div>
  const annot = moveAnnotation(move)
  const score = formatScore(move)
  return (
    <div className={`move-cell${active ? ' active' : ''}`} onClick={onClick}>
      <span className="san">
        {move.move}
        {annot ? <span className={`q ${qClass(annot)}`}>{annot}</span> : null}
        {generating ? (
          <span
            className="ml-1 inline-block h-2 w-2 animate-spin rounded-full border-2 border-text-warning border-t-transparent align-middle"
            aria-label="generating"
          />
        ) : hasComment ? (
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: 'var(--accent)' }} title="has commentary" />
        ) : null}
      </span>
      {score != null ? <span className="ev">{score}</span> : null}
    </div>
  )
}

const MoveList = () => {
  const listRef = useRef<HTMLDivElement>(null)
  const { state, manager } = useGameState()
  const { currentMoveIndex, isAnalysisInProgress, analysisProgress, isFullyAnalyzed, commentsMainline, aiGeneration } =
    state

  // Dot only on moves with real key-moment/teaching commentary — not the
  // template-floor facts that every analyzed move carries. Move id = index+1.
  const moveIdsWithComment = useMemo(() => {
    const s = new Set<number>()
    const gmoves = state.gameJson?.moves
    if (gmoves) {
      gmoves.forEach((m, i) => {
        if (m.is_key_moment) s.add(i + 1)
      })
    } else {
      for (const c of commentsMainline) s.add(c.moveId)
    }
    return s
  }, [state.gameJson, commentsMainline])

  const displayedMoves = manager.getDisplayedMovesList()
  const pairCount = Math.ceil(displayedMoves.length / 2)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === 'Escape') {
        manager.setFocusedBoard('game')
        return
      }
      // Left/Right/Home/End step the focused board; Up/Down cycle focus across
      // the main board, the main-line navigator and the alternative navigator.
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault()
        manager.handleArrowKey(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [manager])

  useEffect(() => {
    if (listRef.current && displayedMoves?.length) {
      const activeItem = listRef.current.querySelector(`.move-item-${currentMoveIndex}`) as HTMLElement
      if (activeItem) UIHelpers.scrollIntoView(activeItem, listRef.current)
    }
  }, [currentMoveIndex, displayedMoves?.length])

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <div className="panel-head">
        <Icon name="list" size={15} />
        <h3>Moves</h3>
        <div className="grow" />
        <span className="eyebrow">eval after</span>
      </div>
      {!isFullyAnalyzed && isAnalysisInProgress ? (
        <div className="shrink-0 border-b border-border-tertiary px-3 py-2">
          <div className="relative h-2.5 w-full rounded-full bg-background-secondary">
            <div
              className="absolute h-full rounded-full transition-[width] duration-500"
              style={{ width: `${analysisProgress}%`, left: 0, background: 'var(--info)' }}
            />
          </div>
          <p className="mt-1 text-[10px] text-text-tertiary">Analyzing… {analysisProgress.toFixed(0)}%</p>
        </div>
      ) : null}
      <div ref={listRef} className="movelist scroll-y min-h-0 flex-1">
        {Array.from({ length: pairCount }).map((_, pairIndex) => {
          const whiteIdx = pairIndex * 2
          const blackIdx = pairIndex * 2 + 1
          const whiteMove = displayedMoves[whiteIdx]
          const blackMove = displayedMoves[blackIdx]
          return (
            <div key={`pair-${pairIndex}`} className="move-row">
              <div className="num">{pairIndex + 1}.</div>
              <div className={`move-item-${whiteIdx}`}>
                <MoveCell
                  move={whiteMove}
                  active={currentMoveIndex === whiteIdx}
                  hasComment={!!whiteMove && moveIdsWithComment.has(whiteMove.id)}
                  generating={!!whiteMove && aiGeneration[whiteMove.id] != null}
                  onClick={() => manager.goToMove(whiteIdx)}
                />
              </div>
              <div className={`move-item-${blackIdx}`}>
                <MoveCell
                  move={blackMove}
                  active={currentMoveIndex === blackIdx}
                  hasComment={!!blackMove && moveIdsWithComment.has(blackMove.id)}
                  generating={!!blackMove && aiGeneration[blackMove.id] != null}
                  onClick={() => blackMove && manager.goToMove(blackIdx)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MoveList
