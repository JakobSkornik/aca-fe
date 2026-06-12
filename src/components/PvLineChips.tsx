import React, { useMemo, useState } from 'react'
import PvHoverBoard from './PvHoverBoard'
import { useVariationPlayer } from '@/contexts/VariationPlayerContext'
import { formatNumberedSteps } from '@/helpers/chessNotation'
import type { KeyFactor, LineStep } from '@/types/Line'

type Props = {
  steps: LineStep[]
  /** Position the line starts from (shown as the player's context). */
  startFen?: string | null
  evalCp?: number | null
  evalMate?: number | null
  depth?: number | null
  keyFactors?: KeyFactor[]
  title?: string
  /** Per-chip class override (e.g. white/black alternation). */
  chipClassName?: (idx: number) => string
}

const DEFAULT_CHIP =
  'cursor-pointer rounded border border-accent-progress/35 bg-accent-progress/15 px-1.5 py-0.5 text-sm font-medium text-text-primary hover:bg-accent-progress/30'

/**
 * Numbered SAN chips for one variation: hover previews the position, click
 * loads the line into the embedded VariationPlayer at that ply.
 */
const PvLineChips: React.FC<Props> = ({
  steps,
  startFen,
  evalCp,
  evalMate,
  depth,
  keyFactors,
  title,
  chipClassName,
}) => {
  const player = useVariationPlayer()
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null)

  const numbered = useMemo(() => formatNumberedSteps(steps), [steps])

  if (!steps.length) return null

  const hovered = hoverIdx !== null ? steps[hoverIdx] : null

  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {steps.map((step, i) => (
        <span
          key={`pv-${i}-${step.fen}`}
          className={chipClassName ? chipClassName(i) : DEFAULT_CHIP}
          title="Click to load into the line player"
          onMouseEnter={(e) => {
            setHoverIdx(i)
            setHoverAnchor(e.currentTarget)
          }}
          onMouseLeave={() => {
            setHoverIdx(null)
            setHoverAnchor(null)
          }}
          onClick={() => {
            player?.loadLine(
              { steps, startFen, evalCp, evalMate, depth, keyFactors, title },
              i
            )
          }}
        >
          {numbered[i]?.label ?? step.san}
        </span>
      ))}
      {hovered && hovered.fen && (
        <PvHoverBoard fen={hovered.fen} visible anchorEl={hoverAnchor} />
      )}
    </span>
  )
}

export default PvLineChips
