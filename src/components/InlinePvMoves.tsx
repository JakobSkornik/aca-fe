import React, { useState } from 'react'
import PvHoverBoard from './PvHoverBoard'

export type PvLineEntry = { san: string; fen: string }

type Props = {
  pvLine: PvLineEntry[]
}

/**
 * Renders engine PV moves as hoverable chips; shows a mini board with the position after each move.
 */
const InlinePvMoves: React.FC<Props> = ({ pvLine }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  if (!pvLine.length) return null

  const active = hoverIdx !== null ? pvLine[hoverIdx] : null

  return (
    <div className="mt-2 pt-2 border-t border-light-gray">
      <div className="text-xs font-semibold text-dark-gray mb-1">Engine line (hover for position)</div>
      <div className="flex flex-wrap gap-1 items-center">
        {pvLine.map((step, i) => (
          <span
            key={`pv-${i}-${step.fen}`}
            className="cursor-help px-1.5 py-0.5 rounded bg-orange-500/15 text-darkest-gray font-medium text-sm border border-orange-500/30"
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
      {active && (
        <PvHoverBoard fen={active.fen} visible={hoverIdx !== null} anchorEl={anchorEl} />
      )}
    </div>
  )
}

export default InlinePvMoves
