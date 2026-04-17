import React, { useState } from 'react'
import PvHoverBoard from './PvHoverBoard'
import type { RagRef } from '@/contexts/GameStateManager'

type Props = {
  ragRefs: RagRef[]
}

/** Chips for RAG-retrieved master positions; hover shows mini board, click expands text. */
const RagRefChips: React.FC<Props> = ({ ragRefs }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  if (!ragRefs.length) return null

  const active = hoverIdx !== null ? ragRefs[hoverIdx] : null
  const basename = (src: string) => {
    const i = Math.max(src.lastIndexOf('\\'), src.lastIndexOf('/'))
    return i >= 0 ? src.slice(i + 1) : src
  }

  return (
    <div className="mt-2 pt-2 border-t border-light-gray">
      <div className="text-xs font-semibold text-gray-500 mb-1.5">Referenced positions</div>
      <div className="flex flex-wrap gap-1.5 items-start">
        {ragRefs.map((ref, i) => {
          const label = [basename(ref.source), ref.san, ref.phase].filter(Boolean).join(' · ')
          const scoreLabel =
            typeof ref.score === 'number'
              ? ref.score <= 1 && ref.score >= 0
                ? `${Math.round(ref.score * 100)}%`
                : ref.score.toFixed(3)
              : null
          const open = expandedIdx === i
          return (
            <div key={`rag-${i}-${ref.fen.slice(0, 20)}`} className="flex flex-col gap-0.5 min-w-0 max-w-full">
              <button
                type="button"
                className="cursor-help text-left px-2 py-1 rounded text-xs font-medium border bg-blue-500/10 text-blue-900 border-blue-500/25 hover:bg-blue-500/15 max-w-full truncate inline-flex items-center gap-1.5"
                title={ref.text}
                onMouseEnter={(e) => {
                  setHoverIdx(i)
                  setAnchorEl(e.currentTarget)
                }}
                onMouseLeave={() => {
                  setHoverIdx(null)
                  setAnchorEl(null)
                }}
                onClick={() => setExpandedIdx(open ? null : i)}
              >
                <span className="truncate">{label || 'Reference'}</span>
                {scoreLabel && (
                  <span className="shrink-0 px-1 py-0.5 rounded bg-blue-500/20 text-[10px] font-semibold align-middle">
                    {scoreLabel}
                  </span>
                )}
              </button>
              {open && (
                <div className="text-xs text-gray-600 pl-1 max-h-32 overflow-y-auto whitespace-pre-wrap border-l-2 border-blue-400/40 ml-0.5">
                  {ref.text}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {active && (
        <PvHoverBoard fen={active.fen} visible={hoverIdx !== null} anchorEl={anchorEl} />
      )}
    </div>
  )
}

export default RagRefChips
