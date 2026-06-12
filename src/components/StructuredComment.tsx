import React, { useState } from 'react'
import PvLineChips from './PvLineChips'
import type { VariationKeyFactor } from './VariationInspector'
import { evalDepthSuffix } from '@/helpers/chessNotation'
import type { CommentFactsClaim, CommentFactsJson, MoveDebugJson } from '@/types/GameJson'

type Props = {
  facts: CommentFactsJson
  debug?: MoveDebugJson | null
  debugMode: boolean
}

function claimToFactor(c: CommentFactsClaim): VariationKeyFactor {
  return {
    text: c.text,
    text_state: c.text_state,
    features: c.features,
    delta_cp: c.delta_cp,
    flag_note: c.flag_note,
  }
}

const FeatureChip: React.FC<{ name: string; delta?: number }> = ({ name, delta }) => (
  <span
    className="rounded bg-accent-progress/15 px-1 py-0.5 font-mono text-[9px] text-text-tertiary"
    title={name}
  >
    {name}
    {delta != null ? ` ${delta >= 0 ? '+' : ''}${delta}` : ''}
  </span>
)

/**
 * The comment's structure made visible (Matej: "each part with its own PV,
 * reasons visible"): assessment + line, claim rows with their features, the
 * better alternative, and — in debug mode — the full reasoning trace.
 */
const StructuredComment: React.FC<Props> = ({ facts, debug, debugMode }) => {
  const [showDiffNote, setShowDiffNote] = useState(false)
  const line = facts.display_line
  const alt = facts.better_alternative

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

      {facts.claims?.length ? (
        <div>
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            Reasons (rule-based)
          </div>
          <ul className="space-y-0.5">
            {facts.claims.map((c, i) => (
              <li key={`c-${i}`} className="flex flex-wrap items-center gap-1.5 text-text-secondary">
                <span>• {c.text}</span>
                {c.features.slice(0, 3).map((f) => (
                  <FeatureChip key={f} name={f} delta={c.delta_cp} />
                ))}
                {c.flag_note ? (
                  <span className="font-mono text-[9px] text-text-tertiary">[{c.flag_note}]</span>
                ) : null}
              </li>
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

      {debugMode && debug ? (
        <div className="rounded-md border border-border-tertiary bg-background-secondary/50 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
            Reasoning (debug)
          </div>
          <ol className="list-decimal space-y-0.5 pl-4 text-[11px] text-text-secondary">
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
                    .map((r) => `${r.rule_id} (Δ${r.delta_cp}cp${r.flag_note ? `, ${r.flag_note}` : ''})`)
                    .join('; ')
                : 'none'}
              {debug.muted_claims.length
                ? `; muted by dedup window: ${debug.muted_claims.length} (${debug.muted_claims.join(' | ')})`
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
          <button
            type="button"
            className="mt-1 text-[10px] text-text-tertiary underline hover:text-text-secondary"
            onClick={() => setShowDiffNote((s) => !s)}
          >
            {showDiffNote ? 'Hide' : 'About these numbers'}
          </button>
          {showDiffNote ? (
            <p className="mt-1 text-[10px] leading-snug text-text-tertiary">
              Claims are fired by threshold rules over the feature-difference vector between the
              position before the move and the envisioned position (the end of the quiescence-trimmed
              line). Thresholds are listed in the game JSON under <code>debug_info.rule_thresholds</code>.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default StructuredComment
