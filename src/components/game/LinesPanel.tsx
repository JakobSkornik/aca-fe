import React, { useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameState } from '@/contexts/GameStateContext'
import { useVariationPlayer } from '@/contexts/VariationPlayerContext'
import { evalDepthSuffix, numberedLineString } from '@/helpers/chessNotation'
import type { KeyFactor, PlayerLine } from '@/types/Line'
import type { CommentFactsLine } from '@/types/GameJson'

type LineCard = PlayerLine & { key: string; title: string; startFen: string }

function factsClaimsToFactors(
  claims: { text: string; text_state: string | null; features: string[]; delta_cp: number; flag_note: string | null }[] | undefined
): KeyFactor[] {
  return (claims ?? []).map((c) => ({
    text: c.text,
    text_state: c.text_state,
    features: c.features,
    delta_cp: c.delta_cp,
    flag_note: c.flag_note,
  }))
}

function cardFromFactsLine(
  key: string,
  title: string,
  line: CommentFactsLine | null | undefined,
  evalCp: number | null,
  evalMate: number | null,
  depth: number | null,
  keyFactors: KeyFactor[]
): LineCard | null {
  if (!line || !line.san?.length) return null
  return {
    key,
    title,
    startFen: line.start_fen,
    steps: line.san.map((san, i) => ({ san, fen: line.fens[i] ?? '' })),
    evalCp,
    evalMate,
    depth,
    keyFactors,
  }
}

/** Grid of every available line for the current move; clicking a card loads
 * it into the embedded variation player. */
const LinesPanel: React.FC = () => {
  const { state, manager } = useGameState()
  const player = useVariationPlayer()
  const { currentMoveIndex, gameJson } = state

  const cards = useMemo<LineCard[]>(() => {
    const out: LineCard[] = []
    const gm = gameJson?.moves?.[currentMoveIndex]
    if (!gm) return out
    const baseFen = manager.getPositionForIndex(currentMoveIndex - 1)

    const cf = gm.comment_facts
    if (cf) {
      const main = cardFromFactsLine(
        'display',
        'Commented line',
        cf.display_line,
        cf.eval_cp,
        cf.eval_mate,
        cf.depth,
        factsClaimsToFactors(cf.claims)
      )
      if (main) out.push(main)
      const alt = cf.better_alternative
      if (alt) {
        const altCard = cardFromFactsLine(
          'alt',
          `Better was ${alt.san}`,
          alt.display_line,
          alt.eval_cp,
          null,
          cf.depth,
          factsClaimsToFactors(alt.claims)
        )
        if (altCard) out.push(altCard)
      }
    }

    for (const v of gm.variations ?? []) {
      if (!v.line?.length) continue
      out.push({
        key: `pv-${v.rank}`,
        title: `Engine line ${v.rank}`,
        startFen: baseFen,
        steps: v.line.map((san, i) => ({ san, fen: v.fens?.[i] ?? '' })),
        evalCp: v.score?.cp ?? null,
        evalMate: v.score?.mate ?? null,
        depth: v.depth ?? gameJson?.analysis_info?.depth ?? null,
        keyFactors: (v.key_factors ?? []) as KeyFactor[],
      })
    }
    return out
  }, [gameJson, currentMoveIndex, manager])

  if (!cards.length) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-[11px] italic text-text-tertiary">
        No lines for this move (opening-book moves are not engine-analyzed).
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
        {cards.map((card) => {
          const leafFen = card.steps[card.steps.length - 1]?.fen || card.startFen
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => player?.loadLine(card, 0)}
              className="flex flex-col gap-1 rounded-md border border-border-tertiary bg-background-secondary/40 p-1.5 text-left transition-colors hover:border-accent-progress/60"
              title="Load into the line player"
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-[10px] font-semibold text-text-primary">{card.title}</span>
                <span className="shrink-0 font-mono text-[9px] text-text-tertiary">
                  {evalDepthSuffix(card.evalCp, card.evalMate, card.depth)}
                </span>
              </div>
              <div className="pointer-events-none self-center">
                <Chessboard
                  position={leafFen}
                  boardWidth={150}
                  customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
                  customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
                  arePiecesDraggable={false}
                  boardOrientation="white"
                  showBoardNotation={false}
                />
              </div>
              <div className="line-clamp-2 text-[10px] leading-snug text-text-secondary">
                {numberedLineString(card.startFen, card.steps.map((s) => s.san))}
              </div>
              {card.keyFactors?.length ? (
                <div className="line-clamp-2 text-[9px] leading-snug text-text-tertiary">
                  {card.keyFactors.map((f) => f.text_state || f.text).join(' ')}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LinesPanel
