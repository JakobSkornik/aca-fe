import React, { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'
import type { PlayerLine } from '@/types/Line'
import { evalDepthSuffix, formatNumberedSteps } from '@/helpers/chessNotation'

const BOARD_W = 192
const AUTOPLAY_MS = 900

type Props = {
  line: PlayerLine | null
  /** Changes whenever a new line is loaded (resets the position). */
  loadKey?: string | number
}

/**
 * Embedded variation player pinned under the comment cards: board + slider +
 * step controls with the numbered line and its (eval, depth).
 */
const VariationPlayer: React.FC<Props> = ({ line, loadKey }) => {
  const steps = line?.steps ?? []
  const lastIdx = steps.length - 1
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Reset whenever a different line is loaded.
  useEffect(() => {
    setIdx(0)
    setPlaying(false)
  }, [loadKey])

  useEffect(() => {
    if (!playing) return
    if (idx >= lastIdx) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => setIdx((i) => Math.min(i + 1, lastIdx)), AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, idx, lastIdx])

  const numbered = useMemo(() => formatNumberedSteps(steps), [steps])

  if (!line || !steps.length) {
    return (
      <div className="flex h-[232px] shrink-0 items-center justify-center border-t border-border-tertiary text-[11px] italic text-text-tertiary">
        No line to play for this move.
      </div>
    )
  }

  const safeIdx = Math.max(0, Math.min(idx, lastIdx))
  const step = steps[safeIdx]
  const arrows: Arrow[] =
    step?.from && step?.to
      ? [[step.from as Square, step.to as Square, 'rgba(34, 197, 94, 0.95)']]
      : []
  const suffix = evalDepthSuffix(line.evalCp, line.evalMate, line.depth)

  const btnCls =
    'rounded border border-border-secondary bg-background-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-primary hover:bg-background-primary disabled:opacity-40 disabled:cursor-default'

  return (
    <div className="flex h-[232px] shrink-0 gap-2 border-t border-border-tertiary p-2">
      <div className="shrink-0">
        <Chessboard
          position={step.fen}
          boardWidth={BOARD_W}
          customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
          customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
          customArrows={arrows}
          arePiecesDraggable={false}
          boardOrientation="white"
          showBoardNotation={false}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            {line.title || 'Variation'} · {safeIdx + 1}/{steps.length}
          </span>
          {suffix ? (
            <span className="shrink-0 font-mono text-[10px] text-text-secondary">{suffix}</span>
          ) : null}
        </div>
        <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-wrap content-start gap-x-1.5 gap-y-0.5 text-[12px] font-medium">
            {numbered.map((n, i) => (
              <button
                key={`pl-${i}`}
                type="button"
                onClick={() => {
                  setPlaying(false)
                  setIdx(i)
                }}
                className={`rounded px-0.5 ${
                  i === safeIdx
                    ? 'bg-accent-progress/30 text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(lastIdx, 0)}
          value={safeIdx}
          onChange={(e) => {
            setPlaying(false)
            setIdx(Number(e.target.value))
          }}
          className="mt-1 block w-full accent-[var(--accent-progress)]"
          aria-label="Variation position"
        />
        <div className="mt-1 flex items-center justify-center gap-1">
          <button type="button" className={btnCls} disabled={safeIdx === 0} onClick={() => { setPlaying(false); setIdx(0) }}>
            ⏮
          </button>
          <button type="button" className={btnCls} disabled={safeIdx === 0} onClick={() => { setPlaying(false); setIdx((i) => Math.max(i - 1, 0)) }}>
            ◀
          </button>
          <button
            type="button"
            className={`${btnCls} min-w-[44px]`}
            onClick={() => {
              if (!playing && safeIdx >= lastIdx) setIdx(0)
              setPlaying((p) => !p)
            }}
          >
            {playing ? '⏸' : '▶ Play'}
          </button>
          <button type="button" className={btnCls} disabled={safeIdx >= lastIdx} onClick={() => { setPlaying(false); setIdx((i) => Math.min(i + 1, lastIdx)) }}>
            ▶
          </button>
          <button type="button" className={btnCls} disabled={safeIdx >= lastIdx} onClick={() => { setPlaying(false); setIdx(lastIdx) }}>
            ⏭
          </button>
        </div>
      </div>
    </div>
  )
}

export default VariationPlayer
