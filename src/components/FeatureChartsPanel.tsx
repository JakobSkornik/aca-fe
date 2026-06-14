import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import Icon from '@/components/ui/Icon'
import type { FeatureRef } from '@/types/GameJson'

const NET_LABELS: Record<string, string> = {
  MATERIAL_BALANCE: 'Material',
  EVALUATE_PAWNS: 'Pawn Structure',
  EVALUATE_KING_SAFETY: 'King Safety',
  KING_TROPISM: 'King Tropism',
}

function titleCase(base: string): string {
  return base
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type Group = {
  key: string
  label: string
  /** White-POV pawns per ply (accent line). */
  wSeries: number[]
  /** Black series in pawns (grey line); empty for net features. */
  bSeries: number[]
  isNet: boolean
  refNames: string[]
}

function toPawns(arr: (number | null)[]): number[] {
  return arr.map((v) => (v == null ? 0 : v / 100))
}

function buildGroups(features: Record<string, (number | null)[]>): Group[] {
  const map = new Map<string, Group>()
  for (const [name, values] of Object.entries(features)) {
    let key: string
    let label: string
    let net = false
    let side: 'w' | 'b' | null = null
    if (name.startsWith('WHITE_')) {
      key = name.slice(6)
      label = titleCase(key)
      side = 'w'
    } else if (name.startsWith('BLACK_')) {
      key = name.slice(6)
      label = titleCase(key)
      side = 'b'
    } else {
      key = name
      label = NET_LABELS[name] ?? titleCase(name)
      net = true
    }
    let g = map.get(key)
    if (!g) {
      g = { key, label, wSeries: [], bSeries: [], isNet: net, refNames: [] }
      map.set(key, g)
    }
    if (net) {
      g.wSeries = toPawns(values)
      g.isNet = true
    } else if (side === 'w') {
      g.wSeries = toPawns(values)
    } else {
      g.bSeries = toPawns(values)
    }
    g.refNames.push(name)
  }
  return Array.from(map.values())
}

function Sparkline({ wSeries, bSeries, ply }: { wSeries: number[]; bSeries: number[]; ply: number }) {
  const n = wSeries.length
  if (n < 2) return <svg className="feat-spark" viewBox="0 0 100 34" />
  const all = wSeries.concat(bSeries.length ? bSeries : [])
  let lo = Math.min(...all)
  let hi = Math.max(...all)
  if (hi - lo < 0.2) {
    const m = (hi + lo) / 2
    lo = m - 0.1
    hi = m + 0.1
  }
  const pad = (hi - lo) * 0.15
  lo -= pad
  hi += pad
  const X = (i: number) => (i / (n - 1)) * 100
  const Y = (v: number) => 32 - ((v - lo) / (hi - lo)) * 30 - 1
  const pts = (s: number[]) => s.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')
  const mx = X(Math.max(0, Math.min(ply, n - 1)))
  const zeroY = lo <= 0 && hi >= 0 ? Y(0) : null
  return (
    <svg className="feat-spark" viewBox="0 0 100 34" preserveAspectRatio="none">
      {zeroY != null ? (
        <line x1={0} y1={zeroY} x2={100} y2={zeroY} stroke="var(--line-2)" strokeWidth={0.6} strokeDasharray="2 2" />
      ) : null}
      {bSeries.length ? (
        <polyline points={pts(bSeries)} fill="none" stroke="var(--fg-3)" strokeWidth={1.2} strokeLinejoin="round" opacity={0.75} />
      ) : null}
      <polyline points={pts(wSeries)} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinejoin="round" />
      <line x1={mx} y1={0} x2={mx} y2={34} stroke="var(--inacc)" strokeWidth={1} />
    </svg>
  )
}

function fmt(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
}

function FeatureCard({
  g,
  ply,
  swing,
  highlighted,
  flashed,
}: {
  g: Group
  ply: number
  swing?: number
  highlighted?: boolean
  flashed?: boolean
}) {
  const i = Math.max(0, Math.min(ply, g.wSeries.length - 1))
  const w = g.wSeries[i] ?? 0
  const b = g.bSeries.length ? g.bSeries[i] ?? 0 : null
  return (
    <div className={`feat-card${highlighted ? ' sel' : ''}`} style={flashed ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px var(--accent)' } : undefined}>
      <div className="feat-top">
        <span className="feat-name">{g.label}</span>
        {swing != null ? (
          <span className="feat-swing">Δ {swing.toFixed(2)}</span>
        ) : (
          <span className="feat-vals">
            <span className="w">{fmt(w)}</span>
            {b != null ? (
              <>
                <span className="ca-muted"> / </span>
                <span className="b">{fmt(b)}</span>
              </>
            ) : null}
          </span>
        )}
      </div>
      <Sparkline wSeries={g.wSeries} bSeries={g.bSeries} ply={ply} />
    </div>
  )
}

/** Positional-features panel: top-movers sparkline cards + an "All N" modal. */
const FeatureChartsPanel: React.FC = () => {
  const { state } = useGameState()
  const gj = state.gameJson
  const fs = gj?.feature_series
  const currentIdx = state.currentMoveIndex
  const [showAll, setShowAll] = useState(false)
  const [flashed, setFlashed] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    const onFlash = (e: Event) => {
      const raw = (e as CustomEvent<string>).detail
      if (!raw) return
      const key = raw.replace(/^WHITE_|^BLACK_/, '')
      setFlashed(key)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlashed(null), 1500)
    }
    window.addEventListener('aca:flash-feature', onFlash)
    return () => {
      window.removeEventListener('aca:flash-feature', onFlash)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  }, [])

  const groups = useMemo(() => (fs?.features ? buildGroups(fs.features) : []), [fs])

  const refKeys = useMemo(() => {
    const refs: FeatureRef[] = gj?.moves?.[currentIdx]?.feature_refs ?? []
    return new Set(refs.map((r) => r.name.replace(/^WHITE_|^BLACK_/, '')))
  }, [gj, currentIdx])

  // top movers: largest |net swing| over the last ~3 plies, then pin refs first
  const movers = useMemo(() => {
    const prev = Math.max(0, currentIdx - 3)
    const scored = groups.map((g) => {
      const wn = (g.wSeries[currentIdx] ?? 0) + (g.bSeries[currentIdx] ?? 0)
      const wp = (g.wSeries[prev] ?? 0) + (g.bSeries[prev] ?? 0)
      return { g, swing: Math.abs(wn - wp) }
    })
    scored.sort((a, b) => {
      const ar = refKeys.has(a.g.key) ? 1 : 0
      const br = refKeys.has(b.g.key) ? 1 : 0
      if (ar !== br) return br - ar
      return b.swing - a.swing
    })
    return scored.slice(0, 5)
  }, [groups, currentIdx, refKeys])

  if (!fs || !fs.plies?.length) {
    return (
      <div className="panel">
        <div className="panel-head">
          <Icon name="activity" size={15} />
          <h3>Positional features</h3>
        </div>
        <p className="p-4 text-xs italic text-text-tertiary">
          No feature series in this game file (re-run the analysis with the current backend).
        </p>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <Icon name="activity" size={15} />
        <h3>Positional features</h3>
        <span className="eyebrow">top movers</span>
        <div className="grow" />
        <button className="btn" onClick={() => setShowAll(true)}>
          <Icon name="grid" size={14} />
          All {groups.length}
        </button>
      </div>
      <div className="feat-grid p-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {movers.map(({ g, swing }) => (
          <FeatureCard
            key={g.key}
            g={g}
            ply={currentIdx}
            swing={swing}
            highlighted={refKeys.has(g.key)}
            flashed={flashed === g.key}
          />
        ))}
      </div>

      {showAll ? (
        <div className="overlay" onClick={() => setShowAll(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head" style={{ borderRadius: '18px 18px 0 0' }}>
              <Icon name="activity" size={15} />
              <h3>All positional features</h3>
              <span className="eyebrow">white / black · per ply</span>
              <div className="grow" />
              <button className="btn icon-btn" onClick={() => setShowAll(false)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="feat-grid p-3.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {groups.map((g) => (
                  <FeatureCard key={g.key} g={g} ply={currentIdx} highlighted={refKeys.has(g.key)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default FeatureChartsPanel
