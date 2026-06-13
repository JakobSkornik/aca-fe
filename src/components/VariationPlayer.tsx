import React, { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'
import type { PlayerLine } from '@/types/Line'
import Icon from '@/components/ui/Icon'
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
  const steps = useMemo(() => line?.steps ?? [], [line])
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
      <div className="pv-card flex items-center justify-center p-4 text-[11px] italic text-text-tertiary">
        No line to play for this move.
      </div>
    )
  }

  const safeIdx = Math.max(0, Math.min(idx, lastIdx))
  const step = steps[safeIdx]
  const arrows: Arrow[] =
    step?.from && step?.to ? [[step.from as Square, step.to as Square, 'var(--arrow)']] : []
  const suffix = evalDepthSuffix(line.evalCp, line.evalMate, line.depth)

  return (
    <div className="pv-card">
      <div className="pv-head">
        <span className="eyebrow">{line.title || 'Variation'}</span>
        <div className="grow" />
        {suffix ? <span className="mono text-[11px] text-text-tertiary">{suffix}</span> : null}
        <span className="mono text-[11px] text-text-tertiary">
          {safeIdx}/{lastIdx}
        </span>
      </div>
      <div className="grid gap-3 p-3" style={{ gridTemplateColumns: `${BOARD_W}px 1fr` }}>
        <div className="overflow-hidden rounded-[8px]" style={{ width: BOARD_W, height: BOARD_W }}>
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
        <div className="flex min-w-0 flex-col">
          <div className="pv-line min-h-0 flex-1 overflow-y-auto">
            {numbered.map((n, i) => (
              <span
                key={`pl-${i}`}
                className={`pv-move${i === safeIdx - 1 ? ' on' : ''}`}
                onClick={() => {
                  setPlaying(false)
                  setIdx(i + 1)
                }}
              >
                {n.label}
              </span>
            ))}
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
            className="mt-2 block w-full"
            style={{ accentColor: 'var(--accent)' }}
            aria-label="Variation position"
          />
          <div className="navrow mt-2" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn icon-btn" disabled={safeIdx === 0} onClick={() => { setPlaying(false); setIdx(0) }}>
              <Icon name="first" size={15} />
            </button>
            <button type="button" className="btn icon-btn" disabled={safeIdx === 0} onClick={() => { setPlaying(false); setIdx((i) => Math.max(i - 1, 0)) }}>
              <Icon name="prev" size={15} />
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (!playing && safeIdx >= lastIdx) setIdx(0)
                setPlaying((p) => !p)
              }}
            >
              <Icon name={playing ? 'pause' : 'play'} size={14} />
              {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="btn icon-btn" disabled={safeIdx >= lastIdx} onClick={() => { setPlaying(false); setIdx((i) => Math.min(i + 1, lastIdx)) }}>
              <Icon name="next" size={15} />
            </button>
            <button type="button" className="btn icon-btn" disabled={safeIdx >= lastIdx} onClick={() => { setPlaying(false); setIdx(lastIdx) }}>
              <Icon name="last" size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VariationPlayer
