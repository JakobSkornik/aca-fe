import type { CommentFactsClaim, CommentFactsLine } from '@/types/GameJson'
import { featureLabel, featureUnit } from './featureMeta'
import { RULE_THRESHOLDS as T, COUNT_CLAIM_WEIGHTS as W } from './ruleReference.generated'

export type Operator = '≥' | '>' | '<' | '='
export interface EvidenceCheck {
  label: string
  features: string[]
  unit: string
  values?: (number | null)[]
  value: number | null
  limit: number
  operator: Operator
  passed: boolean | null
  detail?: string
}
export interface RuleEvidence {
  anchor: number | null
  checks: EvidenceCheck[]
  notes: string[]
  kind: 'numeric' | 'board' | 'unavailable'
}

export function supportAnchor(claim: CommentFactsClaim, line: CommentFactsLine | null): number | null {
  const ply = claim.support_ply
  return line && Number.isInteger(ply) && (ply as number) > 0 && (ply as number) <= line.fens.length
    && claim.baseline_fen === line.start_fen && claim.support_fen === line.fens[(ply as number) - 1]
    ? ply as number : null
}

export function evidenceUnit(name: string): string {
  if (/KING_DANGER|KING_TROPISM/.test(name)) return 'feature points'
  const unit = featureUnit(name)
  return unit === 'cp' ? 'feature cp' : unit === 'squares' ? 'squares' : unit === 'pawns' ? 'pawns' : 'count'
}

export function compare(value: number, operator: Operator, limit: number) {
  return operator === '≥' ? value >= limit : operator === '>' ? value > limit : operator === '<' ? value < limit : value === limit
}

/** Reference checks use the saved branch and exact supporting ply. They never
 * assert that today's thresholds were used to generate an old export. */
export function ruleEvidence(claim: CommentFactsClaim, line: CommentFactsLine | null): RuleEvidence {
  const anchor = supportAnchor(claim, line)
  const checks: EvidenceCheck[] = []
  const notes: string[] = []
  const features = claim.features ?? []
  const side = features.find(f => /^(WHITE|BLACK)_/.test(f))?.split('_')[0]
  const sign = side === 'WHITE' ? 1 : side === 'BLACK' ? -1 : null
  const id = claim.rule_id ?? ''
  const feature = (suffix: string) => features.find(f => f === suffix || f.endsWith(`_${suffix}`))
  const delta = (name: string | undefined, multiplier = 1): (number | null)[] | undefined => {
    if (!name || !line || anchor == null) return undefined
    const values = line.feature_series?.[name]
    if (!values || values.length !== line.fens.length + 1 || !Number.isFinite(values[0])) return undefined
    return values.map(v => v != null && Number.isFinite(v) ? (v - values[0]) * multiplier : null)
  }
  const add = (label: string, names: string[], unit: string, values: (number | null)[] | undefined,
    limit: number, operator: Operator = '≥', scalar?: number | null, detail?: string) => {
    const candidate = scalar !== undefined ? scalar : anchor != null ? values?.[anchor] : null
    const value = candidate != null && Number.isFinite(candidate) ? candidate : null
    checks.push({ label, features: names, unit, values, value, limit, operator,
      passed: value == null ? null : compare(value, operator, limit), detail })
  }
  const addDelta = (suffix: string, label: string, limit: number, direction = 1, absolute = false) => {
    const name = feature(suffix)
    const raw = delta(name, absolute ? 1 : sign == null ? NaN : sign * direction)
    add(label, name ? [name] : [], name ? evidenceUnit(name) : 'units', absolute ? raw?.map(v => v == null ? null : Math.abs(v)) : raw, limit)
  }
  const flagMatch = /^\s*(-?\d+)\s*(?:->|→)\s*(-?\d+)\s*$/.exec(claim.flag_note ?? '')
  const flags = flagMatch && anchor != null ? [Number(flagMatch[1]), Number(flagMatch[2])] : null
  const flagChange = (label: string, direction = 1) => add(label, [], 'count', undefined, 1, '≥',
    flags ? (flags[1] - flags[0]) * direction : null,
    flags ? `Saved count ${flags[0]} → ${flags[1]}` : 'Count transition was not saved.')

  if (id === 'king_under_pressure' || id === 'king_safer') {
    const pressure = id === 'king_under_pressure'
    addDelta('KING_DANGER', pressure ? 'Increase in king danger' : 'Decrease in king danger', T.king_safety, pressure ? -1 : 1)
    const name = feature('KING_TROPISM')
    const opponentSign = name?.startsWith('BLACK_') ? -1 : name?.startsWith('WHITE_') ? 1 : NaN
    add(pressure ? 'Increase in opposing tropism' : 'Decrease in opposing tropism', name ? [name] : [], 'feature points',
      delta(name, opponentSign * (pressure ? 1 : -1)), T.king_tropism_corroborate)
  } else if (id === 'pawn_structure_improved' || id === 'pawn_structure_weakened') {
    const direction = id === 'pawn_structure_improved' ? 1 : -1
    const names = ['PAWN_DOUBLED', 'PAWN_ISOLATED', 'PAWN_BACKWARD'].map(f => `${side}_${f}`)
    add('Pawn-score change in the stated direction', ['EVALUATE_PAWNS'], 'feature cp', delta('EVALUATE_PAWNS', (sign ?? NaN) * direction), T.pawn_structure_evaluate)
    const parts = names.map(f => delta(f, (sign ?? NaN) * -direction))
    const values = parts.every(p => p != null) ? parts[0]?.map((_, i) => parts.some(p => p?.[i] == null)
      ? null : parts.filter(p => (p?.[i] ?? 0) > 0).length) : undefined
    add(direction === 1 ? 'Weakness types reduced' : 'Weakness types increased', names, 'types', values, 1,
      '≥', undefined, 'At least one of doubled, isolated or backward pawn counts must change in this direction.')
  } else if (id === 'rooks_activated') {
    const names = ['ROOK_OPEN_FILE', 'ROOK_HALF_OPEN_FILE'].map(f => `${side}_${f}`)
    const parts = names.map(f => delta(f, sign ?? NaN))
    const combine = (weights: number[]) => parts.every(p => p != null) ? parts[0]?.map((_, i) => parts.some(p => p?.[i] == null)
      ? null : parts.reduce((sum, p, j) => sum + (p?.[i] ?? 0) * weights[j], 0)) : undefined
    add('Additional rooks on open / semi-open files', names, 'rooks', combine([1, 1]), T.rook_activity)
    add('Weighted activity change', names, 'importance points', combine([W.ROOK_OPEN_FILE, W.ROOK_HALF_OPEN_FILE]), 0, '>')
    notes.push('The seventh-rank rule takes precedence when its rook count increases.')
  } else if (id === 'activity_improved' || id === 'activity_reduced') {
    addDelta('PIECE_ACTIVITY', id === 'activity_improved' ? 'Mobility increase' : 'Mobility decrease', T.piece_activity, id === 'activity_improved' ? 1 : -1)
    add('Absolute material change', ['MATERIAL_BALANCE'], 'feature cp', delta('MATERIAL_BALANCE')?.map(v => v == null ? null : Math.abs(v)), 100, '<')
  } else if (id === 'strong_knight_established' || id === 'strong_knight_lost') {
    addDelta('KNIGHTS_OUTPOSTS', id === 'strong_knight_established' ? 'Additional knight outposts' : 'Knight outposts lost', T.strong_knight, id === 'strong_knight_established' ? 1 : -1)
  } else if (id === 'center_control') {
    addDelta('CENTER_CONTROL', 'Central influence increase', T.center_control)
  } else if (id === 'space_gained') {
    addDelta('SPACE', 'Space increase', T.space)
  } else if (id === 'king_activated' || id === 'king_escorts_passer') {
    addDelta(id === 'king_activated' ? 'KING_ACTIVITY' : 'PASSER_KING_ESCORT', 'Feature increase', id === 'king_activated' ? T.king_activity_endgame : T.passer_escort)
    notes.push('Also requires the position to be classified as an endgame; phase is not recorded with this claim.')
  } else if (id === 'bad_bishop_created' || id === 'bad_bishop_solved') {
    addDelta('BAD_BISHOP', 'Absolute bad-bishop score change', T.bad_bishop, 1, true)
    flagChange(id === 'bad_bishop_created' ? 'Additional bad bishops' : 'Bad bishops removed', id === 'bad_bishop_created' ? 1 : -1)
  } else if (id === 'rooks_connected') {
    addDelta('ROOKS_CONNECTED', 'Absolute connected-rook score change', T.connected_rooks, 1, true)
    flagChange('Connected-rook count increase')
  } else if (id === 'bishop_pair_eliminated') {
    add('Bishop colour complexes before', [], 'count', undefined, 2, '≥', flags?.[0] ?? null)
    add('Bishop colour complexes after', [], 'count', undefined, 2, '<', flags?.[1] ?? null)
  } else if (id === 'back_rank_weakness') {
    add('Back-rank weakness before', [], 'flag', undefined, 0, '=', flags?.[0] ?? null)
    add('Back-rank weakness after', [], 'flag', undefined, 1, '=', flags?.[1] ?? null)
  } else if (['doubled_pawns_accepted', 'doubled_pawns_resolved', 'rook_reaches_seventh', 'rook_behind_passer', 'passed_pawn_created', 'outside_passer', 'hanging_piece'].includes(id)) {
    flagChange('Recorded count change', id === 'doubled_pawns_resolved' ? -1 : 1)
    if (id === 'outside_passer') notes.push('Also requires endgame phase; phase is not recorded with this claim.')
    if (id === 'hanging_piece') notes.push('Also requires a new undefended non-king target with a legal capture; a count alone is insufficient.')
  } else if (id === 'passed_pawn_advances') {
    addDelta('PAWN_PASSED', 'Passed-pawn score increase', T.passer_advance)
    notes.push('Also requires an unchanged positive passed-pawn count and board evidence of a same-file passed pawn advancing.')
  }
  const boardRules: Record<string, string> = {
    legal_capture: 'A legal capture in the displayed line. Inspect the supporting move; there is no numeric trigger threshold.',
    absolute_pin: 'A new absolute pin found on the board. Piece alignment and the intervening piece determine the fact, not a numeric threshold.',
    piece_pinned: 'A new absolute pin compared with the starting board. A pin-count change alone does not establish this fact.',
    exchange_sequence: 'Pieces removed during the displayed exchange. This describes the exchange, not its forcedness or net benefit.',
    intent_targets_piece: 'Board-based change in attacks on an enemy piece.',
    intent_pawn_break: 'Board-based candidate pawn advance challenging an enemy pawn.',
    intent_opens_file: 'A rook’s file becomes pawn-free; advancing a pawn along the same file is insufficient.',
    intent_semi_opens_file: 'A rook’s file loses its own pawns while an opposing pawn remains.',
    material_won: 'Material imbalance differs between the starting and supporting boards. The statement describes the resulting balance.',
    material_standing: `Unchanged material imbalance: the current rule requires at least ${T.material_standing} cp of standing material advantage.`,
    tactical_material_loss: 'Material loss supported by the displayed continuation.',
  }
  if (boardRules[id]) notes.push(boardRules[id])
  if (anchor == null) notes.push('The saved claim does not identify a consistent baseline and supporting position.')
  return { anchor, checks, notes, kind: checks.length ? 'numeric' : boardRules[id] ? 'board' : 'unavailable' }
}

/** Context charts never turn the claim's ranking score into a feature delta. */
export function contextSeries(name: string, line: CommentFactsLine | null): (number | null)[] | undefined {
  const values = line?.feature_series?.[name]
  if (!values || !line || values.length !== line.fens.length + 1 || !Number.isFinite(values[0])) return undefined
  return values.map(v => v != null && Number.isFinite(v) ? v - values[0] : null)
}

export function featureSummary(name: string, line: CommentFactsLine | null, anchor: number | null) {
  const values = line?.feature_series?.[name]
  if (anchor == null || !values || values.length !== (line?.fens.length ?? 0) + 1
    || !Number.isFinite(values[0]) || !Number.isFinite(values[anchor])) return `${featureLabel(name)}: values unavailable`
  const delta = values[anchor] - values[0]
  return `${featureLabel(name)}: ${values[0]} → ${values[anchor]} (Δ ${delta >= 0 ? '+' : ''}${delta} ${evidenceUnit(name)}; White-signed storage)`
}
