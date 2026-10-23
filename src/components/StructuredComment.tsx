import { alternativeTitle } from '@/helpers/alternativeTitle'
import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { evalDepthSuffix, formatNumberedSteps } from '@/helpers/chessNotation'
import { featureLabel, featureDescription } from '@/helpers/featureMeta'
import type { PlayerLine, LineStep } from '@/types/Line'
import type {
  CommentFactsClaim,
  CommentFactsJson,
  MoveDebugJson,
} from '@/types/GameJson'

export type CommentPart = 'main' | 'alt'

type Props = {
  facts: CommentFactsJson
  debug?: MoveDebugJson | null
  mainLine: PlayerLine | null
  altLine: PlayerLine | null
  selectedPart: CommentPart
  onSelectPart: (part: CommentPart) => void
  /** Current ply in the selected line (highlighted in the selected card). */
  pvIdx: number
  onSelectPly: (part: CommentPart, ply: number) => void
}

function flashFeature(name: string) {
  try {
    window.dispatchEvent(new CustomEvent('aca:flash-feature', { detail: name }))
  } catch {
    /* ignore */
  }
}

const FeatureChip: React.FC<{ name: string }> = ({ name }) => {
  const desc = featureDescription(name)
  return (
    <span
      className="cursor-help rounded bg-accent-progress/15 px-1 py-0.5 font-mono text-[9px] text-text-tertiary hover:bg-accent-progress/30"
      title={`${name}${desc ? ` — ${desc}` : ''}\n(hover highlights its chart)`}
      onMouseEnter={() => flashFeature(name)}
    >
      {featureLabel(name)}
    </span>
  )
}

const ClaimRow: React.FC<{
  claim: CommentFactsClaim
  steps: LineStep[]
  onSelectPly: (ply: number) => void
}> = ({ claim, steps, onSelectPly }) => {
  const supportIdx = claim.support_fen ? steps.findIndex((step) => step.fen === claim.support_fen) : -1
  const support = supportIdx >= 0 ? steps[supportIdx] : null
  const after = support?.fen.split(' ')
  const moveNo = after ? Number(after[5]) - (after[1] === 'w' ? 1 : 0) : null
  const anchor = support && after ? `${moveNo}${after[1] === 'w' ? '...' : '.'}${support.san}` : null
  return (
    <li className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
      <span>
        {claim.is_concession ? (
          <span
            className="mr-1 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600"
            title="Favors the opponent — a trade-off of the move"
          >
            concedes
          </span>
        ) : (
          '• '
        )}
        {claim.text}
      </span>
      {(claim.features ?? []).map((f) => (
        <FeatureChip key={f} name={f} />
      ))}
      {anchor ? (
        <button
          type="button"
          className="rounded bg-accent-progress/15 px-1 py-0.5 font-mono text-[10px] hover:underline"
          title="Show the position supporting this fact"
          onClick={(event) => { event.stopPropagation(); onSelectPly(supportIdx) }}
        >
          after {anchor}
        </button>
      ) : claim.support_ply != null ? (
        <span className="text-[10px] text-text-tertiary">after line ply {claim.support_ply}</span>
      ) : null}
      {claim.flag_note ? (
        <span className="font-mono text-[9px] text-text-tertiary">[{claim.flag_note}]</span>
      ) : null}
    </li>
  )
}

/** The line as clickable numbered tokens: the lead-in ply (the position before
 * the move) is gray; the current ply is highlighted while this card is selected. */
const LineTokens: React.FC<{
  steps: LineStep[]
  idx: number
  selected: boolean
  toneColor: string
  onPly: (ply: number) => void
}> = ({ steps, idx, selected, toneColor, onPly }) => {
  const tokens = formatNumberedSteps(steps)
  return (
    <div className="pv-line mt-0.5">
      {tokens.map((t, i) => {
        const isLeadIn = i === 0
        const isCurrent = selected && i === idx
        return (
          <span
            key={`${i}-${t.san}`}
            className={`pv-move${isCurrent ? ' on' : ''}`}
            style={
              isCurrent
                ? undefined
                : { color: isLeadIn ? 'var(--fg-3)' : toneColor, opacity: isLeadIn ? 0.7 : 1 }
            }
            onClick={(e) => {
              e.stopPropagation()
              onPly(i)
            }}
          >
            {t.label}
          </span>
        )
      })}
    </div>
  )
}

const PartCard: React.FC<{
  title: string
  steps: LineStep[]
  suffix: string
  claims: CommentFactsClaim[]
  selected: boolean
  /** The orange outline only shows while the PV viewer (variation) has focus. */
  highlight: boolean
  idx: number
  tone: 'main' | 'alt'
  onSelect: () => void
  onSelectPly: (ply: number) => void
}> = ({
  title,
  steps,
  suffix,
  claims,
  selected,
  highlight,
  idx,
  tone,
  onSelect,
  onSelectPly,
}) => {
  const toneColor = tone === 'alt' ? 'var(--fg-3)' : 'var(--accent)'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      aria-pressed={selected}
      className={`part-card${highlight ? ' sel' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow" style={{ color: toneColor }}>
          {selected ? '● ' : '○ '}
          {title}
        </span>
        <span className="shrink-0 mono text-[10px] text-text-secondary">{suffix}</span>
      </div>
      <LineTokens
        steps={steps}
        idx={idx}
        selected={selected}
        toneColor={toneColor}
        onPly={onSelectPly}
      />
      <div className="mt-2 border-t border-border-tertiary pt-2">
        <div className="text-[10px] font-semibold text-text-secondary">Supported facts ({claims.length})</div>
        {claims.length ? [
          { label: 'On this move', items: claims.filter((c) => c.realization === 'immediate') },
          { label: 'Forecast in this line', items: claims.filter((c) => c.realization === 'envisioned') },
          { label: 'Position evidence', items: claims.filter((c) => c.realization !== 'immediate' && c.realization !== 'envisioned') },
        ].filter((group) => group.items.length).map((group) => (
          <div key={group.label} className="mt-1.5">
            <div className="mb-1 text-[10px] text-text-tertiary">{group.label} ({group.items.length})</div>
            <ul className="space-y-1.5">
              {group.items.map((claim, i) => (
                <ClaimRow key={`${claim.rule_id ?? 'claim'}-${i}`} claim={claim} steps={steps} onSelectPly={onSelectPly} />
              ))}
            </ul>
          </div>
        )) : <p className="mt-1 text-[11px] text-text-tertiary">No approved positional facts for this line.</p>}
      </div>
    </div>
  )
}

/**
 * The line cards (main line / better alternative) to the right of the PV board.
 * Each shows its line as clickable numbered tokens (with the current ply
 * highlighted), its (eval, depth) and the rule-based reasons. Selecting a card
 * loads it into the board on the left.
 */
const StructuredComment: React.FC<Props> = ({
  facts,
  debug,
  mainLine,
  altLine,
  selectedPart,
  onSelectPart,
  pvIdx,
  onSelectPly,
}) => {
  const { state } = useGameState()
  const alt = facts.better_alternative
  const variationFocused = state.focusedBoard === 'variation'
  const selection = facts.selection_metadata?.comment_selection
  const selectionReason = selection?.reason === 'nonquiescent_start'
    ? 'the starting position is not quiet'
    : selection?.reason === 'nonquiescent_or_missing_endpoint'
      ? 'the line does not reach a quiet ending position'
      : selection?.reason === 'invalid_endpoint_evidence'
        ? 'the ending position could not be verified'
        : 'this move was not selected for annotation'

  return (
    <div className="min-w-0 flex-1 space-y-1.5 text-xs">
      {selection?.allowed === false ? (
        <p className="rounded bg-text-tertiary/10 px-2 py-1.5 text-[11px] text-text-secondary">
          No annotation: {selectionReason}. Supported facts remain available for inspection.
        </p>
      ) : null}
      <PartCard
          title="Main line"
          steps={mainLine?.steps ?? []}
          suffix={facts.terminal_result ? `Result: ${facts.terminal_result}` : evalDepthSuffix(facts.eval_cp, facts.eval_mate, facts.depth)}
          claims={facts.claims ?? []}
          selected={selectedPart === 'main'}
          highlight={selectedPart === 'main' && variationFocused}
          idx={pvIdx}
          tone="main"
          onSelect={() => onSelectPart('main')}
          onSelectPly={(ply) => onSelectPly('main', ply)}
      />

      {alt ? (
        <PartCard
          title={alternativeTitle(facts)}
          steps={altLine?.steps ?? []}
          suffix={evalDepthSuffix(alt.eval_cp, alt.eval_mate, facts.depth)}
          claims={alt.claims ?? []}
          selected={selectedPart === 'alt'}
          highlight={selectedPart === 'alt' && variationFocused}
          idx={pvIdx}
          tone="alt"
          onSelect={() => onSelectPart('alt')}
          onSelectPly={(ply) => onSelectPly('alt', ply)}
        />
      ) : null}

      {debug ? <ReasoningDetails debug={debug} /> : null}
    </div>
  )
}

const ReasoningDetails: React.FC<{ debug: MoveDebugJson }> = ({ debug }) => (
  <details className="disclosure">
    <summary>Diagnostics (includes excluded rules)</summary>
    <ol className="reason list-decimal pl-4">
      <li>
        Engine: eval{' '}
        {debug.eval_before_cp != null ? (debug.eval_before_cp / 100).toFixed(2) : '—'} →{' '}
        {debug.eval_after_cp != null ? (debug.eval_after_cp / 100).toFixed(2) : '—'}
        {debug.eval_swing_cp != null
          ? ` (swing ${(debug.eval_swing_cp / 100).toFixed(2)})`
          : ''}
        {debug.best_move_san
          ? `; best ${debug.best_move_san}${
              debug.best_move_eval_cp != null
                ? ` (${(debug.best_move_eval_cp / 100).toFixed(2)})`
                : ''
            }`
          : ''}
        .
      </li>
      <li>
        Classification: {debug.key_moment_type ?? 'none'}; quality:{' '}
        {debug.move_quality ?? '—'}.
      </li>
      {debug.envisioned ? (
        <li>
          Envisioned line: kept {debug.envisioned.kept_plies} plies (trimmed{' '}
          {debug.envisioned.trimmed_plies} forcing); start quiescent:{' '}
          {String(debug.envisioned.start_quiescent)}; leaf quiescent:{' '}
          {String(debug.envisioned.leaf_quiescent)}.
        </li>
      ) : null}
      <li>
        Fired rules:{' '}
        {debug.fired_rules.length
          ? debug.fired_rules
              .map(
                (r) =>
                  `${r.rule_id} (Δ${r.delta_cp}cp${r.flag_note ? `, ${r.flag_note}` : ''})`,
              )
              .join('; ')
          : 'none'}
        {debug.muted_claims.length
          ? `; muted by dedup window: ${debug.muted_claims.length}`
          : ''}
        .
      </li>
      {debug.renderings ? (
        <li>
          Rendering:{' '}
          {Object.entries(debug.renderings)
            .map(([lvl, r]) => `${lvl}=${r}`)
            .join(', ')}
          {debug.contract_ok === false ? ' (fact-contract violation → template)' : ''}.
        </li>
      ) : null}
    </ol>
  </details>
)

export default StructuredComment
