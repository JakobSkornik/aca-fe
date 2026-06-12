import React, { useState } from 'react'
import PvHoverBoard from './PvHoverBoard'
import PvPopup, { type PvPopupStep } from './PvPopup'

type Props = {
  steps: PvPopupStep[]
  /** Per-chip class override (e.g. white/black alternation in the engine panel). */
  chipClassName?: (idx: number) => string
}

const DEFAULT_CHIP =
  'cursor-pointer rounded border border-accent-progress/35 bg-accent-progress/15 px-1.5 py-0.5 text-sm font-medium text-text-primary hover:bg-accent-progress/30'

/**
 * SAN chips for one PV line: hover previews the position, click opens a single
 * popup for the whole line (slider, autoplay, step controls).
 */
const PvLineChips: React.FC<Props> = ({ steps, chipClassName }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null)
  const [popupIdx, setPopupIdx] = useState<number | null>(null)
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null)

  if (!steps.length) return null

  const hovered = hoverIdx !== null && popupIdx === null ? steps[hoverIdx] : null

  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {steps.map((step, i) => (
        <span
          key={`pv-${i}-${step.fen}`}
          className={chipClassName ? chipClassName(i) : DEFAULT_CHIP}
          title="Click to open the line"
          onMouseEnter={(e) => {
            setHoverIdx(i)
            setHoverAnchor(e.currentTarget)
          }}
          onMouseLeave={() => {
            setHoverIdx(null)
            setHoverAnchor(null)
          }}
          onClick={(e) => {
            setPopupIdx(i)
            setPopupAnchor(e.currentTarget)
            setHoverIdx(null)
          }}
        >
          {step.san}
        </span>
      ))}
      {hovered && hovered.fen && (
        <PvHoverBoard fen={hovered.fen} visible anchorEl={hoverAnchor} />
      )}
      {popupIdx !== null && (
        <PvPopup
          steps={steps}
          initialIdx={popupIdx}
          anchorEl={popupAnchor}
          onClose={() => {
            setPopupIdx(null)
            setPopupAnchor(null)
          }}
        />
      )}
    </span>
  )
}

export default PvLineChips
