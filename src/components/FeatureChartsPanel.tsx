import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { Card } from '@/components/ui/Card'
import type { FeatureRef } from '@/types/GameJson'

const CHART_W = 160
const BAND_H = 22
const PAD_Y = 3

// Board palette: White's series = white line on the dark squares' brown;
// Black's series = black line on the light squares' brown. Self-explanatory,
// so no legend.
const WHITE_BAND_BG = 'var(--board-dark)'
const BLACK_BAND_BG = 'var(--board-light)'
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

const Band: React.FC<{
  band: SeriesBand
  plyCount: number
  currentIdx: number
  onSeek: (moveIndex: number) => void
}> = ({ band, plyCount, currentIdx, onSeek }) => {
  const nums = band.values.filter((v): v is number => v != null)
  const min = Math.min(0, ...nums)
  const max = Math.max(0, ...nums)
  const span = max - min || 1
  const zeroY = BAND_H - PAD_Y - ((0 - min) / span) * (BAND_H - 2 * PAD_Y)
  const markerX = plyCount > 1 ? (currentIdx / (plyCount - 1)) * CHART_W : 0
  const isWhiteSeries = band.side !== 'black'
  const bg = isWhiteSeries ? WHITE_BAND_BG : BLACK_BAND_BG
  const stroke = isWhiteSeries ? WHITE_LINE : BLACK_LINE

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const idx = Math.round(frac * (plyCount - 1))
    onSeek(Math.max(0, Math.min(plyCount - 1, idx)))
  }

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${BAND_H}`}
      className="block h-[22px] w-full cursor-crosshair"
      preserveAspectRatio="none"
      style={{ backgroundColor: bg }}
      onClick={handleClick}
    >
      {band.side === 'net' ? (
        <line x1={0} y1={zeroY} x2={CHART_W} y2={zeroY} stroke={stroke} strokeOpacity={0.3} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ) : null}
      <polyline
        points={linePoints(band.values, min, max)}
        fill="none"
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={markerX}
        y1={0}
        x2={markerX}
        y2={BAND_H}
        stroke="var(--accent-progress)"
        strokeOpacity={0.85}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

const MiniChart: React.FC<{
  group: ChartGroup
  plyCount: number
  currentIdx: number
  highlighted: boolean
  flashed: boolean
  onSeek: (moveIndex: number) => void
}> = ({ group, plyCount, currentIdx, highlighted, flashed, onSeek }) => {
  const currentVals = group.bands
    .map((b) => b.values[currentIdx])
    .filter((v): v is number => v != null)
  const valueLabel = currentVals.map((v) => (v / 100).toFixed(2)).join(' / ')

  return (
    <div
      className={`rounded-md border p-1.5 transition-shadow ${
        flashed
          ? 'border-accent-progress shadow-[0_0_0_2px_var(--accent-progress)]'
          : highlighted
            ? 'border-accent-progress bg-accent-progress/10 shadow-[0_0_0_1px_var(--accent-progress)]'
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
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-text-tertiary">
          {valueLabel}
        </span>
      </div>
      <div className="space-y-px overflow-hidden rounded-sm">
        {group.bands.map((b) => (
          <Band
            key={b.name}
            band={b}
            plyCount={plyCount}
            currentIdx={currentIdx}
            onSeek={onSeek}
          />
        ))}
      </div>
      {highlighted && group.refs.length > 0 ? (
        <div className="mt-0.5 flex flex-wrap gap-1">
          {group.refs.map((r) => (
            <span
              key={r.name}
              className="rounded bg-accent-progress/20 px-1 text-[9px] font-medium tabular-nums text-text-primary"
              title={r.name}
            >
              {r.delta_cp >= 0 ? '+' : ''}
              {(r.delta_cp / 100).toFixed(2)}
            </span>
          ))}
        </div>
      ) : null}
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

  const groups = useMemo(() => {
    if (!fs?.features) return []
    const gs = buildGroups(fs.features, refsByName)
    return gs.sort((a, b) => {
      const ha = a.refs.length > 0 ? 1 : 0
      const hb = b.refs.length > 0 ? 1 : 0
      if (ha !== hb) return hb - ha
      return 0
    })
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

  const body = (
    <>
      {nHighlighted > 0 ? (
        <div className="mb-1.5 px-0.5 text-[10px] font-medium text-text-secondary">
          {nHighlighted} feature{nHighlighted > 1 ? 's' : ''} behind this comment
        </div>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5">
        {groups.map((g) => (
          <MiniChart
            key={g.key}
            group={g}
            plyCount={fs.plies.length}
            currentIdx={Math.min(currentIdx, fs.plies.length - 1)}
            highlighted={g.refs.length > 0}
            flashed={g.bands.some((b) => b.name === flashedFeature)}
            onSeek={(idx) => manager.goToMove(idx)}
          />
        ))}
      </div>
    </>
  )

  if (embedded) {
    return <div className="h-full overflow-y-auto p-2">{body}</div>
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
