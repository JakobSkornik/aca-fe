import React, { useState } from 'react'
import PvHoverBoard from './PvHoverBoard'

export type PvLineEntry = { san: string; fen: string }

type Props = {
  pvLine: PvLineEntry[]
  /** Inside an accordion or card — omit extra chrome */
  embedded?: boolean
}

/**
 * Renders engine PV moves as hoverable chips; shows a mini board with the position after each move.
 */
const InlinePvMoves: React.FC<Props> = ({ pvLine, embedded = false }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  if (!pvLine.length) return null

  const active = hoverIdx !== null ? pvLine[hoverIdx] : null

  const wrapClass = embedded ? '' : 'mt-2 border-t border-border-tertiary pt-2'

  return (
    <div className={wrapClass}>
      {!embedded ? (
        <div className="mb-1 text-xs font-semibold text-text-tertiary">Engine line (hover for position)</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
        {pvLine.map((step, i) => (
          <span
            key={`pv-${i}-${step.fen}`}
            className="cursor-help rounded border border-accent-progress/35 bg-accent-progress/15 px-1.5 py-0.5 text-sm font-medium text-text-primary"
            onMouseEnter={(e) => {
              setHoverIdx(i)
              setAnchorEl(e.currentTarget)
            }}
            onMouseLeave={() => {
              setHoverIdx(null)
              setAnchorEl(null)
            }}
          >
            {step.san}
          </span>
        ))}
      </div>
      {active && <PvHoverBoard fen={active.fen} visible={hoverIdx !== null} anchorEl={anchorEl} />}
    </div>
  )
}

export default InlinePvMoves
