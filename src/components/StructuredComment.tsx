import React from 'react'
import PvLineChips from './PvLineChips'
import { evalDepthSuffix } from '@/helpers/chessNotation'
import type { KeyFactor } from '@/types/Line'
import type { CommentFactsClaim, CommentFactsJson, MoveDebugJson } from '@/types/GameJson'

type Props = {
  facts: CommentFactsJson
  debug?: MoveDebugJson | null
}

function claimToFactor(c: CommentFactsClaim): KeyFactor {
  return {
    text: c.text,
    text_state: c.text_state,
    features: c.features,
    delta_cp: c.delta_cp,
    flag_note: c.flag_note,
    beneficiary: c.beneficiary,
    is_concession: c.is_concession,
  }
}

function flashFeature(name: string) {
  try {
    window.dispatchEvent(new CustomEvent('aca:flash-feature', { detail: name }))
  } catch {
    /* ignore */
  }
}

const FeatureChip: React.FC<{ name: string; delta?: number }> = ({ name, delta }) => (
  <span
    className="cursor-help rounded bg-accent-progress/15 px-1 py-0.5 font-mono text-[9px] text-text-tertiary hover:bg-accent-progress/30"
    title={`${name} — hover highlights its chart below`}
    onMouseEnter={() => flashFeature(name)}
  >
    {name}
    {delta != null ? ` ${delta >= 0 ? '+' : ''}${delta}` : ''}
  </span>
)

const ClaimRow: React.FC<{ claim: CommentFactsClaim }> = ({ claim }) => (
  <li className="flex flex-wrap items-center gap-1.5 text-text-secondary">
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
    {claim.features.slice(0, 3).map((f) => (
      <FeatureChip key={f} name={f} delta={claim.delta_cp} />
    ))}
    {claim.flag_note ? (
      <span className="font-mono text-[9px] text-text-tertiary">[{claim.flag_note}]</span>
    ) : null}
  </li>
)

/**
 * The comment's structure made visible: assessment line, rule-based reasons
 * with their feature values (always shown), the better alternative, and the
 * reasoning trace behind a small disclosure.
 */
const StructuredComment: React.FC<Props> = ({ facts, debug }) => {
  const line = facts.display_line
  const alt = facts.better_alternative
  const merits = (facts.claims ?? []).filter((c) => !c.is_concession)
  const concessions = (facts.claims ?? []).filter((c) => c.is_concession)

  return (
    <div className="mt-2 space-y-2 border-t border-border-tertiary pt-2 text-xs">
      {line ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">Line</span>
          <PvLineChips
            steps={line.san.map((san, i) => ({ san, fen: line.fens[i] ?? '' }))}
            startFen={line.start_fen}
            evalCp={facts.eval_cp}
            evalMate={facts.eval_mate}
            depth={facts.depth}
            keyFactors={(facts.claims ?? []).map(claimToFactor)}
            title="Commented line"
          />
          <span className="font-mono text-[10px] text-text-secondary">
            {evalDepthSuffix(facts.eval_cp, facts.eval_mate, facts.depth)}
          </span>
        </div>
      ) : null}

      {merits.length || concessions.length ? (
        <div>
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            Reasons (rule-based)
          </div>
          <ul className="space-y-0.5">
            {merits.map((c, i) => (
              <ClaimRow key={`m-${i}`} claim={c} />
            ))}
            {concessions.map((c, i) => (
              <ClaimRow key={`x-${i}`} claim={c} />
            ))}
          </ul>
        </div>
      ) : null}

      {alt?.display_line ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            Better was {alt.san}
          </span>
          <PvLineChips
            steps={alt.display_line.san.map((san, i) => ({
              san,
              fen: alt.display_line!.fens[i] ?? '',
            }))}
            startFen={alt.display_line.start_fen}
            evalCp={alt.eval_cp}
            depth={facts.depth}
            keyFactors={(alt.claims ?? []).map(claimToFactor)}
            title={`Better was ${alt.san}`}
          />
          <span className="font-mono text-[10px] text-text-secondary">
            {evalDepthSuffix(alt.eval_cp, null, facts.depth)}
          </span>
        </div>
      ) : null}

      {debug ? (
        <details className="rounded-md border border-border-tertiary bg-background-secondary/50 px-2 py-1">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            Reasoning details
          </summary>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11px] text-text-secondary">
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
              Classification: {debug.key_moment_type ?? 'none'}; quality: {debug.move_quality ?? '—'}.
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
                    .map((r) => `${r.rule_id} (Δ${r.delta_cp}cp${r.flag_note ? `, ${r.flag_note}` : ''})`)
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
                {debug.contract_ok === false ? ' (a level violated the fact contract → template)' : ''}
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
