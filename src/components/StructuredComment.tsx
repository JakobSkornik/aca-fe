import { alternativeTitle } from '@/helpers/alternativeTitle'
import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { evalDepthSuffix, formatNumberedSteps } from '@/helpers/chessNotation'
import type { PlayerLine, LineStep } from '@/types/Line'
import type {
  CommentFactsClaim,
  CommentFactsJson,
  MoveDebugJson,
} from '@/types/GameJson'

export type CommentPart = 'main' | 'alt'

type Props = {
  facts: CommentFactsJson
  mainLine: PlayerLine | null
  altLine: PlayerLine | null
  selectedPart: CommentPart
  onSelectPart: (part: CommentPart) => void
  /** Current ply in the selected line (highlighted in the selected card). */
  pvIdx: number
  onSelectPly: (part: CommentPart, ply: number) => void
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
      onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect() } }}
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
      <div className="line-evidence-note mt-2 text-[11px] text-text-secondary">{claims.length} retained {claims.length === 1 ? 'fact' : 'facts'} · evidence below</div>
    </div>
  )
}

/**
 * The line cards (main line / better alternative) to the right of the PV board.
 * Each shows its line as clickable numbered tokens (with the current ply
 * highlighted) and its evaluation/depth. Facts and charts share the evidence panel below. Selecting a card
 * loads it into the board on the left.
 */
const StructuredComment: React.FC<Props> = ({
  facts,
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


    </div>
  )
}

export const ReasoningDetails: React.FC<{ debug: MoveDebugJson }> = ({ debug }) => (
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
