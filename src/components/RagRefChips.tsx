import React, { useState } from 'react'
import PvHoverBoard from './PvHoverBoard'
import type { RagRef } from '@/contexts/GameStateManager'

type Props = {
  ragRefs: RagRef[]
  embedded?: boolean
}

/** Chips for RAG-retrieved master positions; hover shows mini board, click expands text. */
const RagRefChips: React.FC<Props> = ({ ragRefs, embedded = false }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  if (!ragRefs.length) return null

  const active = hoverIdx !== null ? ragRefs[hoverIdx] : null
  const basename = (src: string) => {
    const i = Math.max(src.lastIndexOf('\\'), src.lastIndexOf('/'))
    return i >= 0 ? src.slice(i + 1) : src
  }

  const wrapClass = embedded ? '' : 'mt-2 border-t border-border-tertiary pt-2'

  return (
    <div className={wrapClass}>
      {!embedded ? (
        <div className="mb-1.5 text-xs font-semibold text-text-tertiary">Referenced positions</div>
      ) : null}
      <div className="flex flex-wrap items-start gap-1.5">
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
            <div key={`rag-${i}-${ref.fen.slice(0, 20)}`} className="flex min-w-0 max-w-full flex-col gap-0.5">
              <button
                type="button"
                className="inline-flex max-w-full cursor-help items-center gap-1.5 truncate rounded border border-accent-engine/30 bg-accent-engine/10 px-2 py-1 text-left text-xs font-medium text-text-info hover:bg-accent-engine/15"
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
                  <span className="shrink-0 rounded bg-accent-engine/20 px-1 py-0.5 align-middle text-[10px] font-semibold">
                    {scoreLabel}
                  </span>
                )}
              </button>
              {open && (
                <div className="ml-0.5 max-h-32 overflow-y-auto whitespace-pre-wrap border-l-2 border-accent-engine/40 pl-1 text-xs text-text-secondary">
                  {ref.text}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {active && <PvHoverBoard fen={active.fen} visible={hoverIdx !== null} anchorEl={anchorEl} />}
    </div>
  )
}

export default RagRefChips
