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

const FeatureChip: React.FC<{ name: string; delta?: number }> = ({ name, delta }) => {
  const desc = featureDescription(name)
  return (
    <span
      className="cursor-help rounded bg-accent-progress/15 px-1 py-0.5 font-mono text-[9px] text-text-tertiary hover:bg-accent-progress/30"
      title={`${featureLabel(name)}${desc ? ` — ${desc}` : ''}\n(hover highlights its chart)`}
      onMouseEnter={() => flashFeature(name)}
    >
      {name}
      {delta != null ? ` ${delta >= 0 ? '+' : ''}${delta}` : ''}
    </span>
  )
}

const ClaimRow: React.FC<{ claim: CommentFactsClaim }> = ({ claim }) => (
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
    {claim.features.slice(0, 2).map((f) => (
      <FeatureChip key={f} name={f} delta={claim.delta_cp} />
    ))}
    {claim.realization === 'envisioned' ? (
      <span
        className="rounded bg-text-tertiary/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-tertiary"
        title="Not realized on the move itself — this develops deeper in the line"
      >
        in the line
      </span>
    ) : null}
    {claim.flag_note ? (
      <span className="font-mono text-[9px] text-text-tertiary">[{claim.flag_note}]</span>
    ) : null}
  </li>
)

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
      {claims.length ? (
        <ul className="mt-1 space-y-0.5">
          {claims.map((c, i) => (
            <ClaimRow key={`c-${i}`} claim={c} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** "Better was X" only when X is meaningfully better; otherwise it's just the
 * engine's (roughly equal) preference, or the weaker runner-up. */
function altTitle(
  alt: NonNullable<CommentFactsJson['better_alternative']>,
  playedCp: number | null,
): string {
  const gap =
    alt.eval_cp != null && playedCp != null ? Math.abs(alt.eval_cp - playedCp) : null
  if (alt.is_inferior) {
    return gap != null && gap >= 60 ? `Weaker was ${alt.san}` : `Comparable: ${alt.san}`
  }
  return gap != null && gap < 50 ? `Engine's choice: ${alt.san}` : `Better was ${alt.san}`
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

  return (
    <div className="min-w-0 flex-1 space-y-1.5 text-xs">
      {mainLine?.steps?.length ? (
        <PartCard
          title="Main line"
          steps={mainLine.steps}
          suffix={evalDepthSuffix(facts.eval_cp, facts.eval_mate, facts.depth)}
          claims={facts.claims ?? []}
          selected={selectedPart === 'main'}
          highlight={selectedPart === 'main' && variationFocused}
          idx={pvIdx}
          tone="main"
          onSelect={() => onSelectPart('main')}
          onSelectPly={(ply) => onSelectPly('main', ply)}
        />
      ) : null}

      {alt && altLine?.steps?.length ? (
        <PartCard
          title={altTitle(alt, facts.eval_cp)}
          steps={altLine.steps}
          suffix={evalDepthSuffix(alt.eval_cp, null, facts.depth)}
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
  <details className="disclosure" open>
    <summary>Reasoning details</summary>
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
