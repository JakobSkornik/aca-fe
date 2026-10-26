import React, { useEffect, useRef, useState } from 'react'
import type { CommentFactsClaim, CommentFactsJson, CommentFactsLine, FeatureSeries } from '@/types/GameJson'
import type { PlayerLine } from '@/types/Line'
import { featureDescription, featureLabel, featureSource } from '@/helpers/featureMeta'
import { contextSeries, evidenceUnit, featureSummary, ruleEvidence, type EvidenceCheck } from '@/helpers/ruleEvidence'
import { RULE_REFERENCE_REVISION } from '@/helpers/ruleReference.generated'
import type { CommentPart } from './StructuredComment'

const number = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2)

function Source({ name }: { name?: string }) {
  const source = name ? featureSource(name) : undefined
  return source ? <span className="evidence-source" title={source === 'stockfish'
    ? 'Definition adapted from Stockfish; computed by our feature module.'
    : 'Our own feature measure.'}>{source === 'stockfish' ? 'SF' : 'ours'}</span> : null
}

/** Native-unit chart with one x coordinate per ply; gaps stay gaps. */
export function EvidenceChart({ values, anchor, cursor, limit, label, unit, feature }: {
  values: (number | null)[]; anchor: number | null; cursor?: number; limit?: number
  label: string; unit: string; feature?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  useEffect(() => {
    const element = box.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setWidth(entry.contentRect.width) })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (!nums.length) return <p className="evidence-muted">Feature values unavailable.</p>
  const domain = [0, ...nums, ...(limit == null ? [] : [limit])]
  const low = Math.min(...domain), high = Math.max(...domain)
  const pad = Math.max((high - low) * 0.18, 1)
  const lo = low - pad, hi = high + pad
  const left = 48, right = Math.max(left + 10, width - 18), top = 24, bottom = 105
  const last = Math.max(1, values.length - 1)
  const x = (i: number) => left + (right - left) * i / last
  const y = (v: number) => bottom - (v - lo) / (hi - lo) * (bottom - top)
  let pen = false
  const path = values.map((v, i) => {
    if (v == null || !Number.isFinite(v)) { pen = false; return '' }
    const command = `${pen ? 'L' : 'M'}${x(i)},${y(v)}`; pen = true; return command
  }).join(' ')
  const support = anchor != null ? values[anchor] : null
  const ticks = Array.from(new Set([0, ...(anchor == null ? [] : [anchor]), values.length - 1]))
  // Keep a zero label only when it does not collide with the threshold label.
  const yTicks = limit == null ? Array.from(new Set([low, high]))
    : Math.abs(y(limit) - y(0)) > 19 ? [0, limit] : [limit]
  return <div className="evidence-chart" ref={box}>
    <div className="evidence-chart-title">{label} <Source name={feature} /></div>
    <svg viewBox={`0 0 ${width} 148`} role="img" aria-label={`${label}; ${unit}; change from baseline${anchor == null ? '' : `; supporting ply ${anchor}`}${limit == null ? '' : `; reference threshold ${limit}`}`}>
      <text x={left} y={13} className="evidence-axis">{unit}</text>
      <path d={`M${left} ${top}V${bottom}H${right}`} className="evidence-axis-line" />
      {yTicks.map(v => <text key={v} x={left - 6} y={y(v) + 4} textAnchor="end" className="evidence-axis">{number(v)}</text>)}
      {limit != null ? <line x1={left} x2={right} y1={y(limit)} y2={y(limit)} className="evidence-threshold" /> : null}
      {cursor != null && cursor >= 0 && cursor < values.length ? <line x1={x(cursor)} x2={x(cursor)} y1={top} y2={bottom} className="evidence-cursor" /> : null}
      <path d={path} className="evidence-series" />
      {values.map((v, i) => v != null && Number.isFinite(v) ? <circle key={i} cx={x(i)} cy={y(v)} r={2.2} className="evidence-point" /> : null)}
      {anchor != null && support != null && Number.isFinite(support) ? <>
        <circle cx={x(anchor)} cy={y(support)} r={4.2} className="evidence-support" />
        <text x={x(anchor)} y={Math.max(top, y(support) - 9)} textAnchor={anchor === 0 ? 'start' : anchor === values.length - 1 ? 'end' : 'middle'} className="evidence-value">{number(support)}</text>
      </> : null}
      {ticks.map(i => <text key={i} x={x(i)} y={123} textAnchor="middle" className="evidence-axis">{i}</text>)}
      <text x={(left + right) / 2} y={142} textAnchor="middle" className="evidence-axis">Plies from baseline</text>
    </svg>
    <div className="evidence-chart-legend">Change from baseline{limit == null ? '' : ' · dashed: reference threshold'}{anchor == null ? '' : ' · ring: support'}</div>
  </div>
}

function Check({ check }: { check: EvidenceCheck }) {
  return <div className="evidence-check">
    <span>{check.label}</span>
    <span className="evidence-equation">{check.value == null ? '?' : number(check.value)} {check.operator} {number(check.limit)} <span className="evidence-muted">{check.unit}</span>
      <span className={`evidence-check-status ${check.passed === true ? 'met' : check.passed === false ? 'unmet' : ''}`}>
        {check.passed === true ? '✓ met' : check.passed === false ? '✕ not met' : '— unknown'}
      </span>
    </span>
    {check.detail ? <small className="evidence-muted">{check.detail}</small> : null}
  </div>
}

function EvidenceRow({ claim, line, player, part, selectedPart, cursor, onSelectPly }: {
  claim: CommentFactsClaim; line: CommentFactsLine | null; player: PlayerLine | null
  part: CommentPart; selectedPart: CommentPart; cursor: number
  onSelectPly: (part: CommentPart, ply: number) => void
}) {
  const evidence = ruleEvidence(claim, line)
  const anchor = evidence.anchor
  // Use the recorded ply, not findIndex(FEN): repetitions may have identical positions.
  const playerIndex = anchor == null ? -1 : anchor - (player?.steps[0]?.fen === line?.start_fen ? 0 : 1)
  const canJump = playerIndex >= 0 && player?.steps[playerIndex]?.fen === claim.support_fen
  const firstChart = evidence.checks.find(c => c.values?.some(v => v != null))
  const contextFeature = claim.features?.find(f => contextSeries(f, line)?.some(v => v != null))
  const chartValues = firstChart?.values ?? (contextFeature ? contextSeries(contextFeature, line) : undefined)
  const after = claim.support_fen?.split(' ')
  const moveNo = after ? Number(after[5]) - (after[1] === 'w' ? 1 : 0) : null
  const san = anchor != null ? line?.san[anchor - 1] : null
  const time = anchor === 1 ? 'On this move' : anchor != null ? `Forecast · ply ${anchor}` : 'Position not verified'
  const checksMet = evidence.checks.filter(c => c.passed === true).length
  return <article className={`evidence-row evidence-row-${part}`}>
    <div className="evidence-row-meta"><span className="evidence-badge">{part === 'main' ? 'Main line' : 'Alternative'}</span><span>{time}</span>
      <span>{claim.is_concession ? 'Concession' : 'Retained fact'}</span>
      {canJump ? <button type="button" className="evidence-anchor" onClick={() => onSelectPly(part, playerIndex)} title="Show the position supporting this statement">
        After {moveNo}{after?.[1] === 'w' ? '...' : '.'}{san}
      </button> : null}
    </div>
    <div className="evidence-row-body">
      <div className="evidence-statement-block">
        <p className="evidence-statement">{claim.text}</p>
        {evidence.checks.length ? <div className="evidence-checks">
          {evidence.checks.map((check, i) => <Check key={`${check.label}-${i}`} check={check} />)}
          <div className="evidence-muted">{checksMet}/{evidence.checks.length} listed reference checks met{evidence.notes.length ? ' · additional conditions below' : ''}</div>
        </div> : <p className="evidence-muted">{evidence.kind === 'board' ? 'Board evidence · no feature-threshold chart required.' : 'Trigger details are not available for this rule.'}</p>}
      </div>
      {chartValues ? <EvidenceChart values={chartValues} anchor={anchor} cursor={part === selectedPart ? cursor : undefined}
        limit={firstChart?.limit} label={firstChart?.label ?? featureLabel(contextFeature!)} unit={firstChart?.unit ?? evidenceUnit(contextFeature!)} feature={firstChart?.features[0] ?? contextFeature} /> : null}
    </div>
    {evidence.notes.map(note => <p className="evidence-note" key={note}>{note}</p>)}
    <details className="evidence-detail">
      <summary>Supporting values &amp; rule details</summary>
      <div className="evidence-muted evidence-rule-id">Rule: {claim.rule_id ?? 'not recorded'} · support: {anchor ?? 'unknown'} plies from baseline</div>
      {(claim.features ?? []).map(f => <div className="evidence-feature-value" key={f} title={featureDescription(f)}>{featureSummary(f, line, anchor)} <Source name={f} /></div>)}
      {claim.flag_note ? <div className="evidence-muted">Recorded detail: {claim.flag_note}</div> : null}
      {evidence.checks.filter(c => c !== firstChart && c.values?.some(v => v != null)).map(c => <EvidenceChart key={c.label} values={c.values!} anchor={anchor} limit={c.limit} label={c.label} unit={c.unit} feature={c.features[0]} />)}
      <p className="evidence-muted">Claim importance: {claim.delta_cp} ranking points. This is not the engine evaluation or necessarily the plotted feature change.</p>
    </details>
  </article>
}

export default function RuleEvidenceRows({ facts, mainLine, altLine, selectedPart, idx, onSelectPly }: {
  facts: CommentFactsJson; mainLine: PlayerLine | null; altLine: PlayerLine | null
  selectedPart: CommentPart; idx: number; onSelectPly: (part: CommentPart, ply: number) => void
}) {
  const branches = [{ part: 'main' as const, claims: facts.claims ?? [], line: facts.display_line, player: mainLine },
    { part: 'alt' as const, claims: facts.better_alternative?.claims ?? [], line: facts.better_alternative?.display_line ?? null, player: altLine }]
  const selectedLine = selectedPart === 'alt' ? facts.better_alternative?.display_line ?? null : facts.display_line
  const names = Object.keys(selectedLine?.feature_series ?? {}).sort((a, b) => featureLabel(a).localeCompare(featureLabel(b)))
  const count = branches.reduce((n, b) => n + b.claims.length, 0)
  return <div className="rule-evidence-rows">
    <div className="evidence-section-head"><h4>Evidence &amp; rule checks <span>({count})</span></h4>
      <p>Reference rule checks · recomputed from saved values. Original trigger settings were not recorded.</p>
    </div>
    {!count ? <p className="evidence-empty">No retained rule statements for this move. Available feature values remain below.</p> : null}
    {branches.flatMap(branch => branch.claims.map((claim, i) => <EvidenceRow key={`${branch.part}-${claim.rule_id}-${i}`} claim={claim} line={branch.line}
      player={branch.player} part={branch.part} selectedPart={selectedPart} cursor={idx} onSelectPly={onSelectPly} />))}
    <details className="evidence-detail evidence-explorer">
      <summary>Explore all features · {selectedPart === 'main' ? 'main line' : 'alternative'} ({names.length})</summary>
      <p className="evidence-muted">Context values, not additional triggered rules. Changes use White-signed storage; no threshold is inferred.</p>
      <div className="evidence-explorer-grid">{names.map(name => {
        const values = contextSeries(name, selectedLine)
        return values ? <EvidenceChart key={name} values={values} anchor={idx} cursor={idx} label={featureLabel(name)} unit={evidenceUnit(name)} feature={name} /> : null
      })}</div>
      {!names.length ? <p className="evidence-muted">No saved feature series for this branch.</p> : null}
    </details>
    <div className="evidence-reference" title={RULE_REFERENCE_REVISION}>Rule reference {RULE_REFERENCE_REVISION.slice(0, 10)} · retained facts are not necessarily cited in the final prose. Move-selection and deduplication decisions are separate.</div>
  </div>
}

/** Moves with no claim catalogue still expose measured game features. These
 * must not be presented as the engine PV's feature progression. */
export function GameFeatureContext({ series, ply }: { series?: FeatureSeries | null; ply: number }) {
  const end = series?.plies.indexOf(ply) ?? -1
  const start = Math.max(0, end - 7)
  const names = Object.keys(series?.features ?? {}).filter(name => {
    const values = series?.features[name]
    return end >= 0 && values?.length === series?.plies.length && values?.[start] != null && Number.isFinite(values[start])
  }).sort((a, b) => featureLabel(a).localeCompare(featureLabel(b)))
  return <div className="rule-evidence-rows">
    <div className="evidence-section-head"><h4>Position features</h4><p>No retained rule statements for this move.</p></div>
    <details className="evidence-detail evidence-explorer">
      <summary>Explore played-game features ({names.length})</summary>
      <p className="evidence-muted">Played-game history, plies {series?.plies[start] ?? '—'}–{ply}; separate from the engine variation. Charts show changes from the first displayed game position.</p>
      <div className="evidence-explorer-grid">{names.map(name => {
        const raw = series!.features[name].slice(start, end + 1)
        const baseline = raw[0]!
        return <EvidenceChart key={name} label={featureLabel(name)} feature={name} unit={evidenceUnit(name)}
          values={raw.map(v => v != null && Number.isFinite(v) ? v - baseline : null)} anchor={raw.length - 1} />
      })}</div>
      {!names.length ? <p className="evidence-muted">No saved game-feature values for this position.</p> : null}
    </details>
  </div>
}
