import React, { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { useGameState } from '@/contexts/GameStateContext'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'
import type { PlayerLine } from '@/types/Line'
import Icon from '@/components/ui/Icon'
import { evalDepthSuffix, formatNumberedSteps } from '@/helpers/chessNotation'
import { featureLabel, featureDescription } from '@/helpers/featureMeta'

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

function polyPoints(
  values: (number | null)[],
  lo: number,
  hi: number,
  h: number,
): string {
  const n = values.length
  if (n < 2) return ''
  const span = hi - lo || 1
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null) continue
    const x = (i / (n - 1)) * 100
    const y = h - 2 - ((v / 100 - lo) / span) * (h - 4)
    out.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return out.join(' ')
}

/**
 * One merged chart per fired feature (bottom-panel style): the feature's
 * progression over the whole game (grey) and along the displayed line (accent)
 * on a shared y-scale so the difference is directly visible, plus a Δ pill
 * showing how much the line shifts the feature.
 */
function MergedFeatureChart({
  label,
  description,
  gameValues,
  lineValues,
  lineIdx,
  commented = false,
}: {
  label: string
  description?: string
  gameValues: (number | null)[]
  lineValues: (number | null)[]
  lineIdx: number
  /** This feature drove the move's commentary (a rule fired on it). */
  commented?: boolean
}) {
  const H = 34
  const allNums = [...gameValues, ...lineValues].filter(
    (v): v is number => v != null,
  )
  if (allNums.length < 2) return null
  let lo = Math.min(...allNums) / 100
  let hi = Math.max(...allNums) / 100
  if (hi - lo < 0.2) {
    const m = (hi + lo) / 2
    lo = m - 0.1
    hi = m + 0.1
  }
  const pad = (hi - lo) * 0.15
  lo -= pad
  hi += pad
  const zeroY =
    lo <= 0 && hi >= 0 ? H - 2 - ((0 - lo) / (hi - lo)) * (H - 4) : null
  // Δ is the whole-line swing (start -> leaf), matching how the panel is sorted.
  // (A cursor-relative Δ reads 0.00 at ply 0, which misleads — the cursor line
  // already shows the progression.)
  const firstV = lineValues.find((v): v is number => v != null) ?? null
  let lastV: number | null = null
  for (let i = lineValues.length - 1; i >= 0; i--) {
    if (lineValues[i] != null) {
      lastV = lineValues[i] as number
      break
    }
  }
  const delta = firstV != null && lastV != null ? lastV - firstV : 0
  // The "current" readout follows the cursor: the feature's change from the
  // line's start up to the ply now shown in the player.
  let curV: number | null = null
  for (let i = Math.min(lineIdx, lineValues.length - 1); i >= 0; i--) {
    if (lineValues[i] != null) {
      curV = lineValues[i] as number
      break
    }
  }
  const curDelta = firstV != null && curV != null ? curV - firstV : 0
  // Dashed baseline at the line's starting value, and a faint tint of the area
  // between that baseline and the line — so the swing reads at a glance.
  const span = hi - lo || 1
  const yForCp = (vCp: number) => H - 2 - ((vCp / 100 - lo) / span) * (H - 4)
  const startY = firstV != null ? yForCp(firstV) : null
  const linePts = polyPoints(lineValues, lo, hi, H)
  const areaPts =
    startY != null && linePts
      ? `0,${startY.toFixed(1)} ${linePts} 100,${startY.toFixed(1)}`
      : ''
  // Both series are windowed to the same plies, so one cursor at the active
  // ply reads both the line (green) and the game's actual path (gray).
  const cursorX =
    lineValues.length > 1
      ? (Math.max(0, Math.min(lineIdx, lineValues.length - 1)) /
          (lineValues.length - 1)) *
        100
      : 0
  return (
    <div className="feat-card" title={description || undefined}>
      <div className="feat-top">
        <span className="feat-name">
          {commented ? (
            <span
              title="This feature drove the commentary"
              style={{ color: 'var(--accent)' }}
            >
              ●{' '}
            </span>
          ) : null}
          {label}
        </span>
        <span className="feat-swing">Δ {(delta / 100).toFixed(2)}</span>
      </div>
      <svg
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        className="feat-spark"
      >
        {areaPts ? (
          <polygon
            points={areaPts}
            fill="var(--accent)"
            fillOpacity={0.12}
            stroke="none"
          />
        ) : null}
        {zeroY != null ? (
          <line
            x1={0}
            y1={zeroY}
            x2={100}
            y2={zeroY}
            stroke="var(--line-2)"
            strokeWidth={0.6}
            strokeDasharray="2 2"
          />
        ) : null}
        {startY != null ? (
          <line
            x1={0}
            y1={startY}
            x2={100}
            y2={startY}
            stroke="var(--accent)"
            strokeWidth={0.6}
            strokeDasharray="1.5 2"
            opacity={0.6}
          />
        ) : null}
        {gameValues.length > 1 ? (
          <polyline
            points={polyPoints(gameValues, lo, hi, H)}
            fill="none"
            stroke="var(--fg-3)"
            strokeWidth={1.2}
            strokeLinejoin="round"
            opacity={0.7}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <polyline
          points={linePts}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={H}
          stroke="var(--inacc)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="mt-0.5 text-right font-mono text-[9px] leading-none"
        style={{ color: 'var(--accent)' }}
        title="Change from the line's start up to the position currently shown"
      >
        now {curDelta >= 0 ? '+' : ''}
        {(curDelta / 100).toFixed(2)}
      </div>
    </div>
  )
}

/**
 * Embedded variation player: a tight vertical board+slider+controls stack on
 * the left, with the fired-rule feature charts (mainline + along-the-line) on
 * the right. Numbered move tokens run underneath.
 */
const VariationPlayer: React.FC<Props> = ({
  line,
  loadKey,
  mainlineSeries = {},
  mainlinePly = 0,
}) => {
  const { manager, state } = useGameState()
  const steps = useMemo(() => line?.steps ?? [], [line])
  const lastIdx = steps.length - 1
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showAll, setShowAll] = useState(false)
  // Brief highlight when a PV reference in the comment prose is hovered.
  const [extHighlight, setExtHighlight] = useState(false)

  useEffect(() => {
    setIdx(0)
    setPlaying(false)
    setShowAll(false)
  }, [loadKey])

  useEffect(() => {
    if (!playing) return
    if (idx >= lastIdx) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(
      () => setIdx((i) => Math.min(i + 1, lastIdx)),
      AUTOPLAY_MS,
    )
    return () => window.clearTimeout(t)
  }, [playing, idx, lastIdx])

  // Let keyboard arrows drive this board when it has focus.
  useEffect(() => {
    const stepper = {
      prev: () => {
        setPlaying(false)
        setIdx((i) => Math.max(i - 1, 0))
      },
      next: () => {
        setPlaying(false)
        setIdx((i) => Math.min(i + 1, lastIdx))
      },
      first: () => {
        setPlaying(false)
        setIdx(0)
      },
      last: () => {
        setPlaying(false)
        setIdx(lastIdx)
      },
    }
    manager.registerVariationStepper(steps.length ? stepper : null)
    return () => manager.registerVariationStepper(null)
  }, [manager, lastIdx, steps.length])

  useEffect(() => {
    const onHi = (e: Event) => setExtHighlight(!!(e as CustomEvent).detail?.on)
    window.addEventListener('aca:variation-highlight', onHi)
    return () => window.removeEventListener('aca:variation-highlight', onHi)
  }, [])

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
    step?.from && step?.to
      ? [[step.from as Square, step.to as Square, 'var(--arrow)']]
      : []
  const suffix = evalDepthSuffix(line.evalCp, line.evalMate, line.depth)
  // main line = green (accent), better alternative = gray (fg-3)
  const toneColor = line.tone === 'alt' ? 'var(--fg-3)' : 'var(--accent)'
  const hasData = (f: string) =>
    (line.featureSeries?.[f]?.length ?? 0) > 1 ||
    (mainlineSeries[f]?.length ?? 0) > 1
  // Material is shown separately (it is not a positional feature), so it is
  // dropped from this panel entirely (Guid).
  const isMaterial = (f: string) => f === 'MATERIAL_BALANCE'
  // Prefer the along-the-line series for ranking; fall back to the mainline.
  const featValues = (f: string): number[] => {
    const ls = line.featureSeries?.[f]
    const src = ls && ls.length > 1 ? ls : (mainlineSeries[f] ?? [])
    return src.filter((v): v is number => v != null)
  }
  // |Δ| across the variation: how much the feature moved start → leaf.
  const featDelta = (f: string): number => {
    const s = featValues(f)
    return s.length ? Math.abs(s[s.length - 1] - s[0]) : 0
  }
  // Std-dev along the variation: did something happen during the line?
  const featStd = (f: string): number => {
    const s = featValues(f)
    if (s.length < 2) return 0
    const mean = s.reduce((a, b) => a + b, 0) / s.length
    return Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length)
  }
  // Sort by absolute difference first; tie-break by std-dev; then by name (Guid).
  const byMagnitude = (a: string, b: string) =>
    featDelta(b) - featDelta(a) ||
    featStd(b) - featStd(a) ||
    featureLabel(a).localeCompare(featureLabel(b))
  const everyFeature = Array.from(
    new Set([
      ...Object.keys(mainlineSeries),
      ...Object.keys(line.featureSeries ?? {}),
    ]),
  ).filter((f) => hasData(f) && !isMaterial(f))
  // Default view: every feature that actually changes along the line.
  const activeFeatures = everyFeature.filter((f) => featDelta(f) > 0)
  const sortedActive = activeFeatures.slice().sort(byMagnitude)
  const sortedAll = everyFeature.slice().sort(byMagnitude)
  const fired = new Set((line.chartFeatures ?? []).filter((f) => !isMaterial(f)))
  const features = showAll ? sortedAll : sortedActive
  const canShowMore = sortedAll.length > sortedActive.length

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

  const focused = state.focusedBoard === 'variation'
  return (
    <div
      className="pv-card"
      style={{
        // Focus cue: dim this board when arrow keys drive the other one. A
        // PV/line hover keeps it lit (and dims the main board instead).
        opacity: focused || extHighlight ? 1 : 0.75,
        transition: 'opacity 0.15s ease',
      }}
      onMouseDown={() => manager.setFocusedBoard('variation')}
    >
      <div className="pv-head">
        <span className="eyebrow" style={{ color: toneColor }}>
          {line.title || 'Variation'}
        </span>
        <div className="grow" />
        {suffix ? (
          <span className="mono text-[11px] text-text-tertiary">{suffix}</span>
        ) : null}
        <span className="mono text-[11px] text-text-tertiary">
          {safeIdx}/{lastIdx}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 p-3">
        {/* Left: tight vertical board + slider + controls */}
        <div className="shrink-0" style={{ width: BOARD_W }}>
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
              setPlaying(false)
              setIdx(Number(e.target.value))
            }}
            className="mt-2 block"
            style={{ width: BOARD_W, accentColor: 'var(--accent)' }}
            aria-label="Variation position"
          />
          <div className="navrow mt-1" style={{ width: BOARD_W }}>
            {navBtn('first', 'First', safeIdx === 0, () => {
              setPlaying(false)
              setIdx(0)
            })}
            {navBtn('prev', 'Previous', safeIdx === 0, () => {
              setPlaying(false)
              setIdx((i) => Math.max(i - 1, 0))
            })}
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
            {navBtn('next', 'Next', safeIdx >= lastIdx, () => {
              setPlaying(false)
              setIdx((i) => Math.min(i + 1, lastIdx))
            })}
            {navBtn('last', 'Last', safeIdx >= lastIdx, () => {
              setPlaying(false)
              setIdx(lastIdx)
            })}
          </div>
        </div>

        {/* Right: feature charts — game vs this line, merged per feature */}
        <div className="min-w-[200px] flex-1">
          {everyFeature.length ? (
            <>
              <div className="mb-1 flex items-center gap-2 text-[9px] text-text-tertiary">
                <span className="eyebrow" style={{ fontSize: 9 }}>
                  {showAll ? 'All features' : 'Active features'}
                </span>
                {canShowMore || showAll ? (
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: 9, padding: '1px 6px', minHeight: 0 }}
                    onClick={() => setShowAll((s) => !s)}
                    title={
                      showAll
                        ? 'Show only the features that change along this line'
                        : 'Show every positional feature, including ones that do not change here'
                    }
                  >
                    {showAll
                      ? 'Active only'
                      : `Show all (${sortedAll.length})`}
                  </button>
                ) : null}
                <span className="ml-auto inline-flex items-center gap-1">
                  <span
                    className="inline-block h-0.5 w-3 rounded"
                    style={{ background: 'var(--fg-3)' }}
                  />{' '}
                  game
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-0.5 w-3 rounded"
                    style={{ background: 'var(--accent)' }}
                  />{' '}
                  this line
                </span>
              </div>
              {features.length ? (
                <div
                  className="grid gap-1.5 overflow-y-auto"
                  style={{
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(200px, 1fr))',
                    // The chart grid is the only part allowed to overflow/scroll
                    // (esp. under "Show all") — so it never steals the comment's
                    // space and pushes the prose out of view (Guid).
                    maxHeight: 280,
                  }}
                >
                  {features.map((f) => {
                    const lineSeries = line.featureSeries?.[f] ?? []
                    // Align the gray "game" line to the same plies as the PV.
                    // The line series leads with its start position (point 0 =
                    // before this move), while the game series has one point per
                    // played move. So line point i maps to game[mainlinePly-1+i];
                    // window from mainlinePly-1 for the line's length to share
                    // one x-axis and point count.
                    const startPly = Math.max(0, mainlinePly - 1)
                    const gameSeries = (mainlineSeries[f] ?? []).slice(
                      startPly,
                      startPly + lineSeries.length,
                    )
                    return (
                      <MergedFeatureChart
                        key={f}
                        label={featureLabel(f)}
                        description={featureDescription(f)}
                        gameValues={gameSeries}
                        lineValues={lineSeries}
                        lineIdx={safeIdx}
                        commented={fired.has(f)}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="py-3 text-center text-[10px] italic text-text-tertiary">
                  No features change along this move — use Show all to
                  see every feature.
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] italic text-text-tertiary">
              No positional features for this move.
            </div>
          )}
        </div>
      </div>

      {/* Numbered move tokens (click to jump within the line); colored by part */}
      <div className="pv-line border-t border-border-tertiary px-3 py-2">
        {numbered.map((n, i) => (
          <span
            key={`pl-${i}`}
            className={`pv-move${i === safeIdx ? ' on' : ''}`}
            style={i === safeIdx ? undefined : { color: toneColor }}
            onClick={() => {
              setPlaying(false)
              setIdx(i)
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
