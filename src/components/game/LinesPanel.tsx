import React, { useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameState } from '@/contexts/GameStateContext'
import VariationInspector, { type VariationKeyFactor } from '@/components/VariationInspector'
import type { PvPopupStep } from '@/components/PvPopup'
import { evalDepthSuffix, numberedLineString } from '@/helpers/chessNotation'
import type { CommentFactsLine } from '@/types/GameJson'

type LineCard = {
  key: string
  title: string
  startFen: string
  steps: PvPopupStep[]
  evalCp: number | null
  evalMate: number | null
  depth: number | null
  keyFactors: VariationKeyFactor[]
}

function cardFromFactsLine(
  key: string,
  title: string,
  line: CommentFactsLine | null | undefined,
  evalCp: number | null,
  evalMate: number | null,
  depth: number | null,
  keyFactors: VariationKeyFactor[]
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

/** 4.png-style grid: every available line of the current move as a mini-board card. */
const LinesPanel: React.FC = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, gameJson } = state
  const [inspecting, setInspecting] = useState<LineCard | null>(null)

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
        (cf.claims ?? []).map((c) => ({
          text: c.text,
          text_state: c.text_state,
          features: c.features,
          delta_cp: c.delta_cp,
          flag_note: c.flag_note,
        }))
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
          (alt.claims ?? []).map((c) => ({
            text: c.text,
            text_state: c.text_state,
            features: c.features,
            delta_cp: c.delta_cp,
            flag_note: c.flag_note,
          }))
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
        keyFactors: (v.key_factors ?? []) as VariationKeyFactor[],
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2">
        {cards.map((card) => {
          const leafFen = card.steps[card.steps.length - 1]?.fen || card.startFen
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setInspecting(card)}
              className="flex flex-col gap-1 rounded-md border border-border-tertiary bg-background-secondary/40 p-1.5 text-left transition-colors hover:border-accent-progress/60"
              title="Inspect this line"
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
                  boardWidth={160}
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
              {card.keyFactors.length > 0 ? (
                <div className="line-clamp-2 text-[9px] leading-snug text-text-tertiary">
                  {card.keyFactors.map((f) => f.text_state || f.text).join(' ')}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
      {inspecting ? (
        <VariationInspector
          steps={inspecting.steps}
          startFen={inspecting.startFen}
          evalCp={inspecting.evalCp}
          evalMate={inspecting.evalMate}
          depth={inspecting.depth}
          keyFactors={inspecting.keyFactors}
          title={inspecting.title}
          onClose={() => setInspecting(null)}
        />
      ) : null}
    </div>
  )
}

export default LinesPanel
