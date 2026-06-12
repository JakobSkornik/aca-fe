import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { Card } from '@/components/ui/Card'
import type { FeatureRef } from '@/types/GameJson'

const CHART_W = 160
const BAND_H = 44
const PAD_Y = 4

// Board palette: one brown plot area (midpoint of the two square colors) where
// White's series is a white line and Black's a black line — both clearly
// visible, no legend needed.
const PANEL_BG = 'color-mix(in srgb, var(--board-light) 55%, var(--board-dark) 45%)'
const WHITE_LINE = '#ffffff'
const BLACK_LINE = '#000000'

/** Display labels for net features; per-side groups are title-cased from the base name. */
const NET_LABELS: Record<string, string> = {
  MATERIAL_BALANCE: 'Material',
  EVALUATE_PAWNS: 'Pawn structure (net)',
  EVALUATE_KING_SAFETY: 'King safety (net)',
  KING_TROPISM: 'King tropism (net)',
}

function titleCase(base: string): string {
  return base
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type SeriesBand = {
  name: string
  values: (number | null)[]
  /** 'white' | 'black' | 'net' */
  side: 'white' | 'black' | 'net'
}

type ChartGroup = {
  key: string
  label: string
  bands: SeriesBand[]
  /** feature_refs of the selected move that touch this group */
  refs: FeatureRef[]
}

function buildGroups(
  features: Record<string, (number | null)[]>,
  refsByName: Map<string, FeatureRef>
): ChartGroup[] {
  const groups = new Map<string, ChartGroup>()
  for (const [name, values] of Object.entries(features)) {
    let key: string
    let label: string
    let side: SeriesBand['side']
    if (name.startsWith('WHITE_')) {
      key = name.slice(6)
      label = titleCase(key)
      side = 'white'
    } else if (name.startsWith('BLACK_')) {
      key = name.slice(6)
      label = titleCase(key)
      side = 'black'
    } else {
      key = name
      label = NET_LABELS[name] ?? titleCase(name)
      side = 'net'
    }
    let g = groups.get(key)
    if (!g) {
      g = { key, label, bands: [], refs: [] }
      groups.set(key, g)
    }
    g.bands.push({ name, values, side })
    const ref = refsByName.get(name)
    if (ref) g.refs.push(ref)
  }
  // White band on top, black below.
  const order = { white: 0, net: 1, black: 2 }
  for (const g of groups.values()) {
    g.bands.sort((a, b) => order[a.side] - order[b.side])
  }
  return Array.from(groups.values())
}

function linePoints(
  values: (number | null)[],
  min: number,
  max: number
): string {
  const n = values.length
  if (n === 0) return ''
  const span = max - min || 1
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v == null) continue
    const x = (i / Math.max(n - 1, 1)) * CHART_W
    const y = BAND_H - PAD_Y - ((v - min) / span) * (BAND_H - 2 * PAD_Y)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

const MiniChart: React.FC<{
  group: ChartGroup
  plyCount: number
  currentIdx: number
  highlighted: boolean
  flashed: boolean
  onSeek: (moveIndex: number) => void
}> = ({ group, plyCount, currentIdx, highlighted, flashed, onSeek }) => {
  const allNums = group.bands.flatMap((b) =>
    b.values.filter((v): v is number => v != null)
  )
  const min = Math.min(0, ...allNums)
  const max = Math.max(0, ...allNums)
  const span = max - min || 1
  const zeroY = BAND_H - PAD_Y - ((0 - min) / span) * (BAND_H - 2 * PAD_Y)
  const markerX = plyCount > 1 ? (currentIdx / (plyCount - 1)) * CHART_W : 0

  const currentVals = group.bands
    .map((b) => b.values[currentIdx])
    .filter((v): v is number => v != null)
  const valueLabel = currentVals.map((v) => (v / 100).toFixed(2)).join(' / ')
  const deltaBadge = group.refs.length
    ? `${group.refs[0].delta_cp >= 0 ? '+' : ''}${(group.refs[0].delta_cp / 100).toFixed(2)}`
    : null

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const idx = Math.round(frac * (plyCount - 1))
    onSeek(Math.max(0, Math.min(plyCount - 1, idx)))
  }

  return (
    <div
      className={`rounded-md border p-1.5 transition-shadow ${
        flashed
          ? 'border-accent-progress shadow-[0_0_0_2px_var(--accent-progress)]'
          : highlighted
            ? 'border-accent-progress shadow-[0_0_0_1px_var(--accent-progress)]'
            : 'border-border-tertiary bg-background-secondary/40'
      }`}
    >
      <div className="mb-0.5 flex items-baseline justify-between gap-1">
        <span
          className={`truncate text-[10px] font-semibold ${
            highlighted ? 'text-text-primary' : 'text-text-tertiary'
          }`}
          title={group.bands.map((b) => b.name).join(', ')}
        >
          {group.label}
        </span>
        <span className="flex shrink-0 items-baseline gap-1">
          {deltaBadge ? (
            <span className="rounded bg-accent-progress/25 px-1 text-[10px] font-bold tabular-nums text-text-primary">
              Δ{deltaBadge}
            </span>
          ) : null}
          <span className="font-mono text-sm font-bold tabular-nums text-text-primary">
            {valueLabel}
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${BAND_H}`}
        className="block h-[44px] w-full cursor-crosshair rounded-sm"
        preserveAspectRatio="none"
        style={{ backgroundColor: PANEL_BG }}
        onClick={handleClick}
      >
        <line
          x1={0}
          y1={zeroY}
          x2={CHART_W}
          y2={zeroY}
          stroke="#000000"
          strokeOpacity={0.25}
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        {group.bands.map((b) => (
          <polyline
            key={b.name}
            points={linePoints(b.values, min, max)}
            fill="none"
            stroke={b.side === 'black' ? BLACK_LINE : WHITE_LINE}
            strokeWidth={1.6}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line
          x1={markerX}
          y1={0}
          x2={markerX}
          y2={BAND_H}
          stroke="var(--accent-progress)"
          strokeOpacity={0.9}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

/**
 * Grid of per-feature progression charts (Guid feature vector over the game).
 * Charts grounding the selected move's comment (`feature_refs`) are highlighted
 * and sorted first. Clicking a chart seeks to that ply.
 */
const FeatureChartsPanel: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { state, manager } = useGameState()
  const gj = state.gameJson
  const fs = gj?.feature_series
  const currentIdx = state.currentMoveIndex

  // Hovering a feature chip in the reasons block flashes its chart here.
  const [flashedFeature, setFlashedFeature] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)
  useEffect(() => {
    const onFlash = (e: Event) => {
      const name = (e as CustomEvent<string>).detail
      if (!name) return
      setFlashedFeature(name)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlashedFeature(null), 1500)
    }
    window.addEventListener('aca:flash-feature', onFlash)
    return () => {
      window.removeEventListener('aca:flash-feature', onFlash)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  }, [])

  const refsByName = useMemo(() => {
    const m = new Map<string, FeatureRef>()
    const move = gj?.moves?.[currentIdx]
    for (const r of move?.feature_refs ?? []) m.set(r.name, r)
    return m
  }, [gj, currentIdx])

  // Stable order — highlighting is a ring only, charts never jump around.
  const groups = useMemo(() => {
    if (!fs?.features) return []
    return buildGroups(fs.features, refsByName)
  }, [fs, refsByName])

  if (!fs || !fs.plies?.length) {
    const empty = (
      <p className="p-3 text-xs italic text-text-tertiary">
        No feature series in this game file (re-run the analysis with the current backend).
      </p>
    )
    if (embedded) return <div className="h-full overflow-y-auto">{empty}</div>
    return (
      <Card
        title="Positional features"
        className="flex h-full min-h-[200px] w-full flex-col overflow-hidden"
        bodyClassName="min-h-0 flex-1 overflow-y-auto text-xs text-text-secondary"
      >
        {empty}
      </Card>
    )
  }

  const nHighlighted = groups.filter((g) => g.refs.length > 0).length

  const charts = groups.map((g) => (
    <MiniChart
      key={g.key}
      group={g}
      plyCount={fs.plies.length}
      currentIdx={Math.min(currentIdx, fs.plies.length - 1)}
      highlighted={g.refs.length > 0}
      flashed={g.bands.some((b) => b.name === flashedFeature)}
      onSeek={(idx) => manager.goToMove(idx)}
    />
  ))

  const body = (
    <>
      {nHighlighted > 0 ? (
        <div className="mb-1.5 px-0.5 text-[10px] font-medium text-text-secondary">
          {nHighlighted} feature{nHighlighted > 1 ? 's' : ''} behind this comment
        </div>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5">{charts}</div>
    </>
  )

  if (embedded) {
    // Full-width bottom strip: charts flow in rows of fixed-width cards;
    // the strip scrolls vertically when they overflow.
    return (
      <div className="h-full overflow-y-auto p-2">
        <div className="grid grid-cols-[repeat(auto-fill,200px)] justify-start gap-1.5">{charts}</div>
      </div>
    )
  }
  return (
    <Card
      title="Positional features"
      className="flex h-full min-h-[200px] w-full flex-col overflow-hidden"
      bodyClassName="min-h-0 flex-1 overflow-y-auto p-2"
    >
      {body}
    </Card>
  )
}

export default FeatureChartsPanel
