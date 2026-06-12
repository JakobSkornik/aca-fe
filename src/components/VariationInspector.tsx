import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Chessboard } from 'react-chessboard'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'
import type { PvPopupStep } from './PvPopup'
import { evalDepthSuffix, formatNumberedSteps } from '@/helpers/chessNotation'

const BOARD_W = 252
const AUTOPLAY_MS = 900

export type VariationKeyFactor = {
  text: string
  text_state?: string | null
  features?: string[]
  delta_cp?: number
  flag_note?: string | null
}

type Props = {
  steps: PvPopupStep[]
  /** Position the line starts from — the static "base" diagram. */
  startFen?: string | null
  evalCp?: number | null
  evalMate?: number | null
  depth?: number | null
  keyFactors?: VariationKeyFactor[]
  title?: string
  initialIdx?: number
  onClose: () => void
}

/**
 * Modal inspector for one variation (Guid Fig. 5.2): base position beside an
 * interactive board stepping through the line, the numbered line with its
 * evaluation and depth, and the key factors of the final position.
 */
const VariationInspector: React.FC<Props> = ({
  steps,
  startFen,
  evalCp,
  evalMate,
  depth,
  keyFactors = [],
  title,
  initialIdx,
  onClose,
}) => {
  const lastIdx = steps.length - 1
  const [idx, setIdx] = useState(() =>
    initialIdx != null ? Math.max(0, Math.min(initialIdx, lastIdx)) : lastIdx
  )
  const [playing, setPlaying] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const numbered = useMemo(() => formatNumberedSteps(steps), [steps])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, lastIdx))
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, lastIdx])

  useEffect(() => {
    if (!playing) return
    if (idx >= lastIdx) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => setIdx((i) => Math.min(i + 1, lastIdx)), AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, idx, lastIdx])

  if (!steps.length) return null

  const step = steps[idx]
  const arrows: Arrow[] =
    step?.from && step?.to
      ? [[step.from as Square, step.to as Square, 'rgba(34, 197, 94, 0.95)']]
      : []

  const btnCls =
    'rounded border border-border-secondary bg-background-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-primary hover:bg-background-primary disabled:opacity-40 disabled:cursor-default'

  const suffix = evalDepthSuffix(evalCp, evalMate, depth)

  const popup = (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
      }}
    >
      <div
        ref={rootRef}
        className="max-h-[92vh] w-fit max-w-[96vw] overflow-y-auto rounded-lg border border-border-secondary bg-background-primary p-3 shadow-2xl"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {title}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-medium text-text-primary">
              {numbered.map((n, i) => (
                <button
                  key={`h-${i}`}
                  type="button"
                  onClick={() => {
                    setPlaying(false)
                    setIdx(i)
                  }}
                  className={`rounded px-0.5 ${
                    i === idx
                      ? 'bg-accent-progress/30 text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {n.label}
                </button>
              ))}
              {suffix ? (
                <span className="ml-1 font-mono text-xs text-text-secondary">{suffix}</span>
              ) : null}
            </div>
          </div>
          <button type="button" className={btnCls} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {startFen ? (
            <div>
              <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                Base position
              </div>
              <Chessboard
                position={startFen}
                boardWidth={BOARD_W}
                customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
                customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
                arePiecesDraggable={false}
                boardOrientation="white"
                showBoardNotation={true}
              />
            </div>
          ) : null}
          <div>
            <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
              After {numbered[idx]?.label ?? step.san} ({idx + 1}/{steps.length})
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
              max={lastIdx}
              value={idx}
              onChange={(e) => {
                setPlaying(false)
                setIdx(Number(e.target.value))
              }}
              className="mt-1.5 block w-full accent-[var(--accent-progress)]"
              aria-label="Variation position"
            />
            <div className="mt-1 flex items-center justify-center gap-1">
              <button type="button" className={btnCls} disabled={idx === 0} onClick={() => { setPlaying(false); setIdx(0) }}>
                ⏮
              </button>
              <button type="button" className={btnCls} disabled={idx === 0} onClick={() => { setPlaying(false); setIdx((i) => Math.max(i - 1, 0)) }}>
                ◀
              </button>
              <button
                type="button"
                className={`${btnCls} min-w-[44px]`}
                onClick={() => {
                  if (!playing && idx >= lastIdx) setIdx(0)
                  setPlaying((p) => !p)
                }}
              >
                {playing ? '⏸' : '▶ Play'}
              </button>
              <button type="button" className={btnCls} disabled={idx >= lastIdx} onClick={() => { setPlaying(false); setIdx((i) => Math.min(i + 1, lastIdx)) }}>
                ▶
              </button>
              <button type="button" className={btnCls} disabled={idx >= lastIdx} onClick={() => { setPlaying(false); setIdx(lastIdx) }}>
                ⏭
              </button>
            </div>
          </div>
        </div>

        {keyFactors.length > 0 ? (
          <div className="mt-3 border-t border-border-tertiary pt-2">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
              Key factors of the final position (vs base)
            </div>
            <ul className="space-y-1">
              {keyFactors.map((f, i) => (
                <li key={`kf-${i}`} className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                  <span>• {f.text_state || f.text}</span>
                  {(f.features ?? []).slice(0, 3).map((feat) => (
                    <span
                      key={feat}
                      className="rounded bg-accent-progress/15 px-1 py-0.5 font-mono text-[9px] text-text-tertiary"
                      title={feat}
                    >
                      {feat}
                      {f.delta_cp != null ? ` ${f.delta_cp >= 0 ? '+' : ''}${f.delta_cp}` : ''}
                    </span>
                  ))}
                  {f.flag_note ? (
                    <span className="font-mono text-[9px] text-text-tertiary">[{f.flag_note}]</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )

  return createPortal(popup, document.body)
}

export default VariationInspector
