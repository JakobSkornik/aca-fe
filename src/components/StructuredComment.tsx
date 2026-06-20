import React from 'react'
import { evalDepthSuffix, numberedLineString } from '@/helpers/chessNotation'
import { featureLabel, featureDescription } from '@/helpers/featureMeta'
import type {
  CommentFactsClaim,
  CommentFactsJson,
  MoveDebugJson,
} from '@/types/GameJson'

export type CommentPart = 'main' | 'alt'

type Props = {
  facts: CommentFactsJson
  debug?: MoveDebugJson | null
  selectedPart: CommentPart
  onSelectPart: (part: CommentPart) => void
}

function flashFeature(name: string) {
  try {
    window.dispatchEvent(new CustomEvent('aca:flash-feature', { detail: name }))
  } catch {
    /* ignore */
  }
}

const FeatureChip: React.FC<{ name: string; delta?: number }> = ({
  name,
  delta,
}) => {
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
    {claim.flag_note ? (
      <span className="font-mono text-[9px] text-text-tertiary">
        [{claim.flag_note}]
      </span>
    ) : null}
  </li>
)

const PartCard: React.FC<{
  title: string
  lineText: string
  suffix: string
  claims: CommentFactsClaim[]
  selected: boolean
  /** 'main' = green, 'alt' = gray — matches the tab/line colors elsewhere. */
  tone: 'main' | 'alt'
  onSelect: () => void
}> = ({ title, lineText, suffix, claims, selected, tone, onSelect }) => {
  const toneColor = tone === 'alt' ? 'var(--fg-3)' : 'var(--accent)'
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`part-card${selected ? ' sel' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow" style={{ color: toneColor }}>
          {selected ? '● ' : '○ '}
          {title}
        </span>
        <span className="shrink-0 mono text-[10px] text-text-secondary">
          {suffix}
        </span>
      </div>
      <div
        className="mono mt-0.5 text-[13px] font-medium leading-snug"
        style={{ color: toneColor }}
      >
        {lineText}
      </div>
      {claims.length ? (
        <ul className="mt-1 space-y-0.5">
          {claims.map((c, i) => (
            <ClaimRow key={`c-${i}`} claim={c} />
          ))}
        </ul>
      ) : null}
    </button>
  )
}

/**
 * One card per line of the comment (main line / better alternative), each with
 * its numbered line, (eval, depth) and rule-based reasons. Selecting a card
 * loads it into the player pinned below.
 */
/** "Better was X" only when X is meaningfully better; otherwise it's just the
 * engine's (roughly equal) preference. */
function altTitle(
  alt: NonNullable<CommentFactsJson['better_alternative']>,
  playedCp: number | null,
): string {
  const gap =
    alt.eval_cp != null && playedCp != null
      ? Math.abs(alt.eval_cp - playedCp)
      : null
  return gap != null && gap < 50
    ? `Engine's choice: ${alt.san}`
    : `Better was ${alt.san}`
}

const StructuredComment: React.FC<Props> = ({
  facts,
  debug,
  selectedPart,
  onSelectPart,
}) => {
  const line = facts.display_line
  const alt = facts.better_alternative

  return (
    <div className="mt-2 space-y-1.5 text-xs">
      {line?.san?.length ? (
        <PartCard
          title="Main line"
          lineText={numberedLineString(line.start_fen, line.san)}
          suffix={evalDepthSuffix(facts.eval_cp, facts.eval_mate, facts.depth)}
          claims={facts.claims ?? []}
          selected={selectedPart === 'main'}
          tone="main"
          onSelect={() => onSelectPart('main')}
        />
      ) : null}

      {alt?.display_line?.san?.length ? (
        <PartCard
          title={altTitle(alt, facts.eval_cp)}
          lineText={numberedLineString(
            alt.display_line.start_fen,
            alt.display_line.san,
          )}
          suffix={evalDepthSuffix(alt.eval_cp, null, facts.depth)}
          claims={alt.claims ?? []}
          selected={selectedPart === 'alt'}
          tone="alt"
          onSelect={() => onSelectPart('alt')}
        />
      ) : null}

      {debug ? (
        <details className="disclosure" open>
          <summary>Reasoning details</summary>
          <ol className="reason list-decimal pl-4">
            <li>
              Engine: eval{' '}
              {debug.eval_before_cp != null
                ? (debug.eval_before_cp / 100).toFixed(2)
                : '—'}{' '}
              →{' '}
              {debug.eval_after_cp != null
                ? (debug.eval_after_cp / 100).toFixed(2)
                : '—'}
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
                Envisioned line: kept {debug.envisioned.kept_plies} plies
                (trimmed {debug.envisioned.trimmed_plies} forcing); start
                quiescent: {String(debug.envisioned.start_quiescent)}; leaf
                quiescent: {String(debug.envisioned.leaf_quiescent)}.
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
                {debug.contract_ok === false
                  ? ' (fact-contract violation → template)'
                  : ''}
                .
              </li>
            ) : null}
          </ol>
        </details>
      ) : null}
    </div>
  )
}

export default StructuredComment
