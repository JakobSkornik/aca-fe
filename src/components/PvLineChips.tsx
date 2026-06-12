import React, { useMemo, useState } from 'react'
import PvHoverBoard from './PvHoverBoard'
import type { PvPopupStep } from './PvPopup'
import VariationInspector, { type VariationKeyFactor } from './VariationInspector'
import { formatNumberedSteps } from '@/helpers/chessNotation'

type Props = {
  steps: PvPopupStep[]
  /** Position the line starts from (enables the base-vs-final comparison). */
  startFen?: string | null
  evalCp?: number | null
  evalMate?: number | null
  depth?: number | null
  keyFactors?: VariationKeyFactor[]
  title?: string
  /** Per-chip class override (e.g. white/black alternation in the engine panel). */
  chipClassName?: (idx: number) => string
}

const DEFAULT_CHIP =
  'cursor-pointer rounded border border-accent-progress/35 bg-accent-progress/15 px-1.5 py-0.5 text-sm font-medium text-text-primary hover:bg-accent-progress/30'

/**
 * Numbered SAN chips for one variation: hover previews the position, click
 * opens the Variation Inspector (base vs final boards, slider, key factors).
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
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null)
  const [inspectIdx, setInspectIdx] = useState<number | null>(null)

  const numbered = useMemo(() => formatNumberedSteps(steps), [steps])

  if (!steps.length) return null

  const hovered = hoverIdx !== null && inspectIdx === null ? steps[hoverIdx] : null

  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {steps.map((step, i) => (
        <span
          key={`pv-${i}-${step.fen}`}
          className={chipClassName ? chipClassName(i) : DEFAULT_CHIP}
          title="Click to inspect the line"
          onMouseEnter={(e) => {
            setHoverIdx(i)
            setHoverAnchor(e.currentTarget)
          }}
          onMouseLeave={() => {
            setHoverIdx(null)
            setHoverAnchor(null)
          }}
          onClick={() => {
            setInspectIdx(i)
            setHoverIdx(null)
          }}
        >
          {numbered[i]?.label ?? step.san}
        </span>
      ))}
      {hovered && hovered.fen && (
        <PvHoverBoard fen={hovered.fen} visible anchorEl={hoverAnchor} />
      )}
      {inspectIdx !== null && (
        <VariationInspector
          steps={steps}
          startFen={startFen}
          evalCp={evalCp}
          evalMate={evalMate}
          depth={depth}
          keyFactors={keyFactors}
          title={title}
          initialIdx={inspectIdx}
          onClose={() => setInspectIdx(null)}
        />
      )}
    </span>
  )
}

export default PvLineChips
