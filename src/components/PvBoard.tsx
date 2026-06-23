import React, { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameState } from '@/contexts/GameStateContext'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'
import type { PlayerLine } from '@/types/Line'
import Icon from '@/components/ui/Icon'
import { evalDepthSuffix } from '@/helpers/chessNotation'

const BOARD_W = 200
const AUTOPLAY_MS = 900

type Props = {
  line: PlayerLine | null
  /** Current ply along the line (controlled — shared with the cards/charts). */
  idx: number
  onIdx: (next: number) => void
  /** Changes whenever the move or selected part changes (resets autoplay). */
  loadKey: string
}

/**
 * The variation board: a tight board + slider + controls. The ply index is
 * controlled by the parent so the move cards and the charts stay in sync; the
 * numbered move tokens live in the cards to the right, not here.
 */
const PvBoard: React.FC<Props> = ({ line, idx, onIdx, loadKey }) => {
  const { manager, state } = useGameState()
  const steps = useMemo(() => line?.steps ?? [], [line])
  const lastIdx = steps.length - 1
  const [playing, setPlaying] = useState(false)
  const [extHighlight, setExtHighlight] = useState(false)

  const stop = () => setPlaying(false)
  const goto = (next: number) => onIdx(Math.max(0, Math.min(next, lastIdx)))

  useEffect(() => setPlaying(false), [loadKey])

  useEffect(() => {
    if (!playing) return
    if (idx >= lastIdx) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => onIdx(Math.min(idx + 1, lastIdx)), AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, idx, lastIdx, onIdx])

  // Drive this board with the keyboard arrows when it has focus.
  useEffect(() => {
    const stepper = {
      prev: () => goto(idx - 1),
      next: () => goto(idx + 1),
      first: () => goto(0),
      last: () => goto(lastIdx),
    }
    manager.registerVariationStepper(steps.length ? stepper : null)
    return () => manager.registerVariationStepper(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, idx, lastIdx, steps.length])

  useEffect(() => {
    const onHi = (e: Event) => setExtHighlight(!!(e as CustomEvent).detail?.on)
    window.addEventListener('aca:variation-highlight', onHi)
    return () => window.removeEventListener('aca:variation-highlight', onHi)
  }, [])

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
    step?.from && step?.to
      ? [[step.from as Square, step.to as Square, 'var(--arrow)']]
      : []
  const suffix = evalDepthSuffix(line.evalCp, line.evalMate, line.depth)
  const toneColor = line.tone === 'alt' ? 'var(--fg-3)' : 'var(--accent)'
  const focused = state.focusedBoard === 'variation'

  const navBtn = (
    icon: string,
    label: string,
    disabled: boolean,
    onClick: () => void,
  ) => (
    <button
      type="button"
      className="btn icon-btn"
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={15} />
    </button>
  )

  return (
    <div
      className="pv-card shrink-0"
      style={{
        opacity: focused || extHighlight ? 1 : 0.6,
        transition: 'opacity 0.15s ease',
      }}
      onMouseDown={() => manager.setFocusedBoard('variation')}
    >
      <div className="pv-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span className="eyebrow" style={{ color: toneColor }}>
          {line.title || 'Variation'}
        </span>
        <span className="mono text-[11px] text-text-tertiary">
          {suffix ? `${suffix} ` : ''}
          {safeIdx}/{lastIdx}
        </span>
      </div>
      <div className="p-3">
        <div
          className="overflow-hidden rounded-[8px]"
          style={{ width: BOARD_W, height: BOARD_W }}
        >
          <Chessboard
            position={step.fen}
            boardWidth={BOARD_W}
            customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
            customArrows={arrows}
            arePiecesDraggable={false}
            boardOrientation={state.boardOrientation}
            showBoardNotation={false}
          />
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(lastIdx, 0)}
          value={safeIdx}
          onChange={(e) => {
            stop()
            goto(Number(e.target.value))
          }}
          className="mt-2 block"
          style={{ width: BOARD_W, accentColor: 'var(--accent)' }}
          aria-label="Variation position"
        />
        <div className="navrow mt-1" style={{ width: BOARD_W }}>
          {navBtn('first', 'First', safeIdx === 0, () => {
            stop()
            goto(0)
          })}
          {navBtn('prev', 'Previous', safeIdx === 0, () => {
            stop()
            goto(idx - 1)
          })}
          <button
            type="button"
            className="btn"
            style={{ minWidth: 72, justifyContent: 'center' }}
            onClick={() => {
              if (!playing && safeIdx >= lastIdx) onIdx(0)
              setPlaying((p) => !p)
            }}
          >
            <Icon name={playing ? 'pause' : 'play'} size={14} />
            {playing ? 'Pause' : 'Play'}
          </button>
          {navBtn('next', 'Next', safeIdx >= lastIdx, () => {
            stop()
            goto(idx + 1)
          })}
          {navBtn('last', 'Last', safeIdx >= lastIdx, () => {
            stop()
            goto(lastIdx)
          })}
        </div>
      </div>
    </div>
  )
}

export default PvBoard
