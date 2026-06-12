import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Chessboard } from 'react-chessboard'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'

const BOARD_W = 240
const AUTOPLAY_MS = 900

export type PvPopupStep = {
  san: string
  fen: string
  from?: string
  to?: string
}

type Props = {
  steps: PvPopupStep[]
  /** Index of the step to show first. */
  initialIdx?: number
  anchorEl: HTMLElement | null
  onClose: () => void
}

/**
 * One interactive popup for a whole PV line: board, slider, step controls and
 * autoplay. Replaces the per-move hover boards for variations.
 */
const PvPopup: React.FC<Props> = ({ steps, initialIdx = 0, anchorEl, onClose }) => {
  const [idx, setIdx] = useState(() => Math.max(0, Math.min(initialIdx, steps.length - 1)))
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const rootRef = useRef<HTMLDivElement | null>(null)

  const place = useCallback(() => {
    if (!anchorEl) return
    const r = anchorEl.getBoundingClientRect()
    const pad = 8
    const W = BOARD_W + 18
    const H = BOARD_W + 96
    let left = r.right + pad
    let top = r.top
    if (left + W > window.innerWidth - pad) left = r.left - W - pad
    if (left < pad) left = pad
    if (top + H > window.innerHeight - pad) top = window.innerHeight - H - pad
    if (top < pad) top = pad
    setPos({ top, left })
  }, [anchorEl])

  useEffect(() => {
    place()
    const onScroll = () => place()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [place])

  // Close on Escape / outside click
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, steps.length - 1))
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0))
    }
    const onDown = (e: MouseEvent) => {
      const root = rootRef.current
      if (!root) return
      if (root.contains(e.target as Node)) return
      if (anchorEl && anchorEl.contains(e.target as Node)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [onClose, steps.length, anchorEl])

  // Autoplay
  useEffect(() => {
    if (!playing) return
    if (idx >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => setIdx((i) => Math.min(i + 1, steps.length - 1)), AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, idx, steps.length])

  const step = steps[idx]
  const arrows = useMemo<Arrow[]>(() => {
    if (step?.from && step?.to) {
      return [[step.from as Square, step.to as Square, 'rgba(34, 197, 94, 0.95)']]
    }
    return []
  }, [step])

  if (!steps.length) return null

  const moveLabel = (i: number) => {
    const s = steps[i]
    return s ? s.san : ''
  }

  const btnCls =
    'rounded border border-border-secondary bg-background-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-primary hover:bg-background-primary disabled:opacity-40 disabled:cursor-default'

  const popup = (
    <div
      ref={rootRef}
      className="fixed z-[9999] rounded-lg border border-border-secondary bg-background-primary p-2 shadow-xl"
      style={{ top: pos.top, left: pos.left, width: BOARD_W + 18 }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] text-text-secondary">
          {idx + 1}/{steps.length} · <span className="font-semibold text-text-primary">{moveLabel(idx)}</span>
        </span>
        <button type="button" className={btnCls} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <Chessboard
        position={step.fen}
        boardWidth={BOARD_W}
        customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
        customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
        customArrows={arrows}
        arePiecesDraggable={false}
        boardOrientation="white"
        showBoardNotation={true}
      />
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        value={idx}
        onChange={(e) => {
          setPlaying(false)
          setIdx(Number(e.target.value))
        }}
        className="mt-1.5 block w-full accent-[var(--accent-progress)]"
        aria-label="Variation position"
      />
      <div className="mt-1 flex items-center justify-center gap-1">
        <button type="button" className={btnCls} disabled={idx === 0} onClick={() => { setPlaying(false); setIdx(0) }} aria-label="First">
          ⏮
        </button>
        <button type="button" className={btnCls} disabled={idx === 0} onClick={() => { setPlaying(false); setIdx((i) => Math.max(i - 1, 0)) }} aria-label="Previous">
          ◀
        </button>
        <button
          type="button"
          className={`${btnCls} min-w-[44px]`}
          onClick={() => {
            if (!playing && idx >= steps.length - 1) setIdx(0)
            setPlaying((p) => !p)
          }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶ Play'}
        </button>
        <button type="button" className={btnCls} disabled={idx >= steps.length - 1} onClick={() => { setPlaying(false); setIdx((i) => Math.min(i + 1, steps.length - 1)) }} aria-label="Next">
          ▶
        </button>
        <button type="button" className={btnCls} disabled={idx >= steps.length - 1} onClick={() => { setPlaying(false); setIdx(steps.length - 1) }} aria-label="Last">
          ⏭
        </button>
      </div>
    </div>
  )

  return createPortal(popup, document.body)
}

export default PvPopup
