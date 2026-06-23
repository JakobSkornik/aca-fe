import React, { useState } from 'react'
import type { PlayerLine } from '@/types/Line'
import {
  featureLabel,
  featureDescription,
  featureUnit,
  featureUnitSuffix,
  featureSource,
} from '@/helpers/featureMeta'
import type { FeatureUnit } from '@/helpers/featureMeta.generated'

const H = 34
const RANK_SCALE: Record<FeatureUnit, number> = {
  cp: 1,
  squares: 3,
  pawns: 10,
  count: 5,
  flag: 1,
}

/** Signed, unit-aware delta label (centipawns as pawns, others as integers). */
function formatFeatureDelta(value: number, unit: FeatureUnit): string {
  const sign = value >= 0 ? '+' : ''
  if (unit === 'cp') return `${sign}${(value / 100).toFixed(2)}`
  return `${sign}${Math.round(value)}${featureUnitSuffix(unit)}`
}

function polyPoints(values: (number | null)[], lo: number, hi: number): string {
  const n = values.length
  if (n < 2) return ''
  const span = hi - lo || 1
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null) continue
    const x = (i / (n - 1)) * 100
    const y = H - 2 - ((v / 100 - lo) / span) * (H - 4)
    out.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return out.join(' ')
}

function nonNull(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v != null)
}

/**
 * One feature, with up to three series on a shared scale: the played main line
 * (green, drives the Δ/cursor), the alternative line (gray), and the game's own
 * path (orange dashed). Toggling which line the board steps does not change the
 * chart — both lines are always shown.
 */
function MergedFeatureChart({
  label,
  description,
  mainValues,
  altValues,
  gameValues,
  lineIdx,
  commented = false,
  unit = 'cp',
  source,
}: {
  label: string
  description?: string
  mainValues: (number | null)[]
  altValues: (number | null)[]
  gameValues: (number | null)[]
  lineIdx: number
  commented?: boolean
  unit?: FeatureUnit
  source?: 'stockfish' | 'custom'
}) {
  const allNums = [
    ...nonNull(mainValues),
    ...nonNull(altValues),
    ...nonNull(gameValues),
  ]
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
  const zeroY = lo <= 0 && hi >= 0 ? H - 2 - ((0 - lo) / (hi - lo)) * (H - 4) : null

  // Δ / now / shaded area / start baseline all track the main line, so the chart
  // is stable when the board toggles to the alternative.
  const firstV = mainValues.find((v): v is number => v != null) ?? null
  let lastV: number | null = null
  for (let i = mainValues.length - 1; i >= 0; i--) {
    if (mainValues[i] != null) {
      lastV = mainValues[i] as number
      break
    }
  }
  const delta = firstV != null && lastV != null ? lastV - firstV : 0
  let curV: number | null = null
  for (let i = Math.min(lineIdx, mainValues.length - 1); i >= 0; i--) {
    if (mainValues[i] != null) {
      curV = mainValues[i] as number
      break
    }
  }
  const curDelta = firstV != null && curV != null ? curV - firstV : 0
  const span = hi - lo || 1
  const yForCp = (vCp: number) => H - 2 - ((vCp / 100 - lo) / span) * (H - 4)
  const startY = firstV != null ? yForCp(firstV) : null
  const mainPts = polyPoints(mainValues, lo, hi)
  const areaPts =
    startY != null && mainPts
      ? `0,${startY.toFixed(1)} ${mainPts} 100,${startY.toFixed(1)}`
      : ''
  const cursorX =
    mainValues.length > 1
      ? (Math.max(0, Math.min(lineIdx, mainValues.length - 1)) /
          (mainValues.length - 1)) *
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
          {source ? (
            <span
              className="ml-1 rounded px-1 text-[8px] font-semibold uppercase tracking-wide"
              style={{
                color: source === 'stockfish' ? 'var(--accent)' : 'var(--fg-3)',
                background:
                  source === 'stockfish'
                    ? 'var(--accent-bg, rgba(0,0,0,0.05))'
                    : 'rgba(0,0,0,0.05)',
              }}
              title={
                source === 'stockfish'
                  ? 'Computed from the Stockfish evaluation definition'
                  : 'Our own positional measure (no Stockfish equivalent)'
              }
            >
              {source === 'stockfish' ? 'SF' : 'ours'}
            </span>
          ) : null}
        </span>
        <span className="feat-swing">Δ {formatFeatureDelta(delta, unit)}</span>
      </div>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="feat-spark">
        {areaPts ? (
          <polygon points={areaPts} fill="var(--accent)" fillOpacity={0.12} stroke="none" />
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
        {nonNull(gameValues).length > 1 ? (
          <polyline
            points={polyPoints(gameValues, lo, hi)}
            fill="none"
            stroke="var(--inacc)"
            strokeWidth={1.1}
            strokeDasharray="3 2"
            strokeLinejoin="round"
            opacity={0.85}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {nonNull(altValues).length > 1 ? (
          <polyline
            points={polyPoints(altValues, lo, hi)}
            fill="none"
            stroke="var(--fg-3)"
            strokeWidth={1.2}
            strokeLinejoin="round"
            opacity={0.8}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <polyline
          points={mainPts}
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
        now {formatFeatureDelta(curDelta, unit)}
      </div>
    </div>
  )
}

const LegendSwatch: React.FC<{ color: string; dashed?: boolean; label: string }> = ({
  color,
  dashed,
  label,
}) => (
  <span className="inline-flex items-center gap-1">
    <span
      className="inline-block h-0 w-3"
      style={{
        borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
      }}
    />{' '}
    {label}
  </span>
)

type Props = {
  mainLine: PlayerLine | null
  altLine: PlayerLine | null
  /** The game's own feature path (per feature, full game), windowed to the line. */
  gameSeries: Record<string, (number | null)[]>
  mainlinePly: number
  /** Current ply along the line — drives the cursor. */
  idx: number
}

/**
 * The positional-feature charts below the board: one chart per feature, each
 * overlaying the main line, the alternative, and (dashed) the game's own path.
 */
const FeatureCharts: React.FC<Props> = ({
  mainLine,
  altLine,
  gameSeries,
  mainlinePly,
  idx,
}) => {
  const [showAll, setShowAll] = useState(false)
  const mainFs = mainLine?.featureSeries ?? {}
  const altFs = altLine?.featureSeries ?? {}

  const isMaterial = (f: string) => f === 'MATERIAL_BALANCE'
  const hasData = (f: string) =>
    (mainFs[f]?.length ?? 0) > 1 ||
    (altFs[f]?.length ?? 0) > 1 ||
    (gameSeries[f]?.length ?? 0) > 1
  // Rank on the main line's swing; fall back to the game path.
  const rankValues = (f: string): number[] => {
    const ls = mainFs[f]
    const src = ls && ls.length > 1 ? ls : (gameSeries[f] ?? [])
    return src.filter((v): v is number => v != null)
  }
  const featDelta = (f: string): number => {
    const s = rankValues(f)
    return s.length ? Math.abs(s[s.length - 1] - s[0]) : 0
  }
  const featStd = (f: string): number => {
    const s = rankValues(f)
    if (s.length < 2) return 0
    const mean = s.reduce((a, b) => a + b, 0) / s.length
    return Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length)
  }
  const rankScale = (f: string) => RANK_SCALE[featureUnit(f)]
  const byMagnitude = (a: string, b: string) =>
    featDelta(b) * rankScale(b) - featDelta(a) * rankScale(a) ||
    featStd(b) * rankScale(b) - featStd(a) * rankScale(a) ||
    featureLabel(a).localeCompare(featureLabel(b))

  const everyFeature = Array.from(
    new Set([...Object.keys(mainFs), ...Object.keys(altFs), ...Object.keys(gameSeries)]),
  ).filter((f) => hasData(f) && !isMaterial(f))
  const activeFeatures = everyFeature.filter((f) => featDelta(f) > 0)
  const sortedActive = activeFeatures.slice().sort(byMagnitude)
  const sortedAll = everyFeature.slice().sort(byMagnitude)
  const fired = new Set((mainLine?.chartFeatures ?? []).filter((f) => !isMaterial(f)))
  const features = showAll ? sortedAll : sortedActive
  const canShowMore = sortedAll.length > sortedActive.length
  const startPly = Math.max(0, mainlinePly - 1)

  if (!everyFeature.length) {
    return (
      <div className="py-3 text-center text-[10px] italic text-text-tertiary">
        No positional features for this move.
      </div>
    )
  }

  return (
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
            {showAll ? 'Active only' : `Show all (${sortedAll.length})`}
          </button>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-2">
          <LegendSwatch color="var(--accent)" label="main line" />
          {altLine ? <LegendSwatch color="var(--fg-3)" label="alternative" /> : null}
          <LegendSwatch color="var(--inacc)" dashed label="game" />
        </span>
      </div>
      {features.length ? (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          }}
        >
          {features.map((f) => {
            const mainValues = mainFs[f] ?? []
            const altValues = altFs[f] ?? []
            const len = Math.max(mainValues.length, altValues.length)
            const gameValues = (gameSeries[f] ?? []).slice(startPly, startPly + len)
            return (
              <MergedFeatureChart
                key={f}
                label={featureLabel(f)}
                description={featureDescription(f)}
                mainValues={mainValues}
                altValues={altValues}
                gameValues={gameValues}
                lineIdx={idx}
                commented={fired.has(f)}
                unit={featureUnit(f)}
                source={featureSource(f)}
              />
            )
          })}
        </div>
      ) : (
        <div className="py-3 text-center text-[10px] italic text-text-tertiary">
          No features change along this move — use Show all to see every feature.
        </div>
      )}
    </>
  )
}

export default FeatureCharts
