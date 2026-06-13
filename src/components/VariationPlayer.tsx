import React, { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'
import type { PlayerLine } from '@/types/Line'
import Icon from '@/components/ui/Icon'
import { evalDepthSuffix, formatNumberedSteps } from '@/helpers/chessNotation'

const BOARD_W = 200
const AUTOPLAY_MS = 900

type Props = {
  line: PlayerLine | null
  /** Changes whenever a new line is loaded (resets the position). */
  loadKey?: string | number
  /** Mainline feature progression (name -> cp per ply) for the left sparkline. */
  mainlineSeries?: Record<string, (number | null)[]>
  mainlinePlies?: number
  mainlinePly?: number
}

function featureLabel(name: string): string {
  const base = name.replace(/^WHITE_/, '').replace(/^BLACK_/, '')
  const side = name.startsWith('WHITE_') ? 'W ' : name.startsWith('BLACK_') ? 'B ' : ''
  const t = base
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return side + t
}

/** Tiny sparkline (cp series → pawns), with a marker at `markerIdx`. */
function Mini({ values, markerIdx, accent }: { values: (number | null)[]; markerIdx: number; accent: string }) {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length < 2) return <svg viewBox="0 0 100 24" className="block h-[24px] w-full" />
  let lo = Math.min(...nums) / 100
  let hi = Math.max(...nums) / 100
  if (hi - lo < 0.2) {
    const m = (hi + lo) / 2
    lo = m - 0.1
    hi = m + 0.1
  }
  const n = values.length
  const X = (i: number) => (i / (n - 1)) * 100
  const Y = (v: number) => 22 - ((v / 100 - lo) / (hi - lo)) * 20 - 1
  const pts = values
    .map((v, i) => (v == null ? null : `${X(i).toFixed(1)},${Y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(' ')
  const zeroY = lo <= 0 && hi >= 0 ? Y(0) : null
  const mx = X(Math.max(0, Math.min(markerIdx, n - 1)))
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="block h-[24px] w-full" style={{ background: 'var(--bg-inset)', borderRadius: 4 }}>
      {zeroY != null ? <line x1={0} y1={zeroY} x2={100} y2={zeroY} stroke="var(--line-2)" strokeWidth={0.5} strokeDasharray="2 2" /> : null}
      <polyline points={pts} fill="none" stroke={accent} strokeWidth={1.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <line x1={mx} y1={0} x2={mx} y2={24} stroke="var(--inacc)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Embedded variation player: a tight vertical board+slider+controls stack on
 * the left, with the fired-rule feature charts (mainline + along-the-line) on
 * the right. Numbered move tokens run underneath.
 */
const VariationPlayer: React.FC<Props> = ({ line, loadKey, mainlineSeries = {}, mainlinePly = 0 }) => {
  const steps = useMemo(() => line?.steps ?? [], [line])
  const lastIdx = steps.length - 1
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)

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
  const features = (line.chartFeatures ?? []).filter(
    (f) => (line.featureSeries?.[f]?.length ?? 0) > 1 || (mainlineSeries[f]?.length ?? 0) > 1
  )

  const navBtn = (icon: string, label: string, disabled: boolean, onClick: () => void) => (
    <button type="button" className="btn icon-btn" title={label} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={15} />
    </button>
  )

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

      <div className="flex flex-wrap gap-3 p-3">
        {/* Left: tight vertical board + slider + controls */}
        <div className="shrink-0" style={{ width: BOARD_W }}>
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
          <input
            type="range"
            min={0}
            max={Math.max(lastIdx, 0)}
            value={safeIdx}
            onChange={(e) => {
              setPlaying(false)
              setIdx(Number(e.target.value))
            }}
            className="mt-2 block"
            style={{ width: BOARD_W, accentColor: 'var(--accent)' }}
            aria-label="Variation position"
          />
          <div className="navrow mt-1" style={{ width: BOARD_W }}>
            {navBtn('first', 'First', safeIdx === 0, () => { setPlaying(false); setIdx(0) })}
            {navBtn('prev', 'Previous', safeIdx === 0, () => { setPlaying(false); setIdx((i) => Math.max(i - 1, 0)) })}
            <button
              type="button"
              className="btn"
              style={{ minWidth: 72, justifyContent: 'center' }}
              onClick={() => {
                if (!playing && safeIdx >= lastIdx) setIdx(0)
                setPlaying((p) => !p)
              }}
            >
              <Icon name={playing ? 'pause' : 'play'} size={14} />
              {playing ? 'Pause' : 'Play'}
            </button>
            {navBtn('next', 'Next', safeIdx >= lastIdx, () => { setPlaying(false); setIdx((i) => Math.min(i + 1, lastIdx)) })}
            {navBtn('last', 'Last', safeIdx >= lastIdx, () => { setPlaying(false); setIdx(lastIdx) })}
          </div>
        </div>

        {/* Right: fired-rule charts — mainline vs along this line */}
        <div className="min-w-[200px] flex-1">
          {features.length ? (
            <>
              <div className="mb-1 flex items-center gap-3 text-[9px] text-text-tertiary">
                <span className="eyebrow" style={{ fontSize: 9 }}>Fired-rule features</span>
                <span className="ml-auto inline-flex items-center gap-1">
                  <span className="inline-block h-0.5 w-3 rounded" style={{ background: 'var(--fg-2)' }} /> game
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-0.5 w-3 rounded" style={{ background: 'var(--accent)' }} /> this line
                </span>
              </div>
              <div className="space-y-1.5">
                {features.map((f) => {
                  const hasGame = (mainlineSeries[f]?.length ?? 0) > 1
                  return (
                    <div key={f}>
                      <div className="mb-0.5 truncate text-[10px] font-medium text-text-secondary">{featureLabel(f)}</div>
                      <div className={`grid gap-1.5 ${hasGame ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {hasGame ? (
                          <Mini values={mainlineSeries[f]} markerIdx={mainlinePly} accent="var(--fg-2)" />
                        ) : null}
                        <Mini values={line.featureSeries?.[f] ?? []} markerIdx={safeIdx} accent="var(--accent)" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] italic text-text-tertiary">
              No rule-based features for this move.
            </div>
          )}
        </div>
      </div>

      {/* Numbered move tokens (click to jump within the line) */}
      <div className="pv-line border-t border-border-tertiary px-3 py-2">
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
    </div>
  )
}

export default VariationPlayer
