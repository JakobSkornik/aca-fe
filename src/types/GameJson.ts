import type { ResolvedAnnotationToken } from './WebSocketMessages'

export interface MoveScore {
  cp: number | null
  mate: number | null
}

export interface VariationKeyFactorJson {
  text: string
  text_state?: string | null
  features?: string[]
  delta_cp?: number
  flag_note?: string | null
}

export interface Variation {
  rank: number
  move_san: string
  score: MoveScore | null
  line: string[]
  /** Position after each ply of `line` (backend-resolved; no SAN replay needed). */
  fens?: string[]
  /** Search depth behind `score`. */
  depth?: number | null
  /** Key factors of the final position vs the base position. */
  key_factors?: VariationKeyFactorJson[]
}

export type GamePhase = 'early' | 'mid' | 'end'

export interface GameMove {
  mn: number
  color: 'w' | 'b'
  san: string
  uci: string
  fen: string
  phase?: GamePhase
  score: MoveScore | null
  variations: Variation[]
  comment: string | null
  classification: string | null
  /** NAG-style symbol from the key-moment classification (!!, !, ?!, ?, ??). */
  annotation?: string | null
  has_comment?: boolean
  comment_kind?: string | null
  commentary_status?: string | null
  commentary_reason?: string | null
  /** True only for real key-moment commentary; independent of comment presence. */
  is_key_moment?: boolean
  /** True when this comment would actually be used in the final annotated game
   * (a substantive key-moment comment, not a back-to-back stub). */
  final_comment?: boolean
  resolved_tokens?: ResolvedAnnotationToken[]
  /** Phrases of the comment tied to a position of a displayed line (statement links). */
  comment_links?: CommentLink[]
  /** Trimmed CommentFacts (verdict, display line, claims, better alternative). */
  comment_facts?: CommentFactsJson | null
  /** Academic reasoning trace (debug mode). */
  debug?: MoveDebugJson | null
}

export interface MoveDebugJson {
  eval_before_cp: number | null
  eval_after_cp: number | null
  eval_swing_cp: number | null
  best_move_san: string | null
  best_move_eval_cp: number | null
  key_moment_type: string | null
  move_quality: string | null
  envisioned: {
    kept_plies: number
    trimmed_plies: number
    start_quiescent: boolean
    leaf_quiescent: boolean
  } | null
  fired_rules: {
    rule_id: string
    text: string
    delta_cp: number
    features: string[]
    flag_note: string | null
  }[]
  muted_claims: string[]
  renderings: Record<string, string> | null
  contract_ok: boolean | null
}

export type CommentaryLevel = 'beginner' | 'intermediate' | 'expert'

export interface CommentFactsLine {
  start_fen: string
  san: string[]
  fens: string[]
  /** Per-point feature progression along the line (cp); keyed by feature name. */
  feature_series?: Record<string, number[]>
  /** First settled ply after the move (1-3); claims at or before it are immediate. */
  immediate_horizon_ply?: number | null
  /** Ply chosen as the endpoint by the settlement test (null: fallback window). */
  settled_ply?: number | null
  stable_ply?: number | null
  horizon_reason?: string | null
  trimmed_plies?: number | null
}

/** A piece the statement is about, at the claim's support position. */
export interface ClaimEvidencePiece {
  square: string
  piece: string
  color: 'white' | 'black'
  /** subject (the piece the claim is about), target, attacker, king. */
  role: string
}

/** A phrase of a comment and what it is about: the line (`main` after the played move, `alt`
 * after the other move), the ply along it (1 = after its first move) and the squares. */
export interface CommentLink {
  phrase: string
  /** Offset of the phrase in the comment text, when the writer's text was not changed since. */
  start?: number
  part: 'main' | 'alt'
  ply: number
  evidence?: Partial<ClaimEvidence>
}

/** Board entities a claim is about, for hover highlighting. */
export interface ClaimEvidence {
  /** Squares at the support position. */
  squares: string[]
  pieces: ClaimEvidencePiece[]
  /** The same entities in the starting position (for "lost"/"before" states). */
  baseline_squares: string[]
  /** Whole files the claim is about ("e"). */
  files: string[]
  source?: 'rule' | 'feature' | string
}

export interface CommentFactsClaim {
  rule_id?: string
  support_ply?: number | null
  support_fen?: string | null
  baseline_fen?: string | null
  text: string
  text_state: string | null
  features: string[]
  delta_cp: number
  flag_note: string | null
  /** Which side this claim favors ("white" | "black"). */
  beneficiary?: string | null
  /** True when the claim favors the opponent of the mover (a trade-off). */
  is_concession?: boolean
  /** "immediate" if realized on the move, "envisioned" if it only develops
   * deeper in the line. */
  realization?: string
  /** For envisioned claims: the line move (ply, SAN) that brings the claim about. */
  caused_by_ply?: number | null
  caused_by_san?: string | null
  /** Where along the displayed line the claim held (first and last firing ply). */
  first_ply?: number | null
  last_ply?: number | null
  persistence?: 'held' | 'transient' | string
  entity?: string | null
  evidence?: ClaimEvidence | null
}

export interface CommentFactsJson {
  selection_metadata?: {
    comment_selection?: { allowed: boolean; reason?: string }
  }
  terminal_result?: string | null
  verdict: string
  eval_cp: number | null
  eval_mate: number | null
  depth: number | null
  engine: string
  display_line: CommentFactsLine | null
  claims: CommentFactsClaim[]
  better_alternative?: {
    san: string
    uci: string
    verdict: string
    eval_cp: number | null
    eval_mate?: number | null
    display_line: CommentFactsLine | null
    claims: CommentFactsClaim[]
    /** When true this is the clearly-worse runner-up shown to contrast a top
     * move that was played â€” not a better move that was missed. */
    is_inferior?: boolean
    /** better | weaker | comparable, for the mover; absent in older material. */
    comparison?: string | null
    /** Depth at which both lines were also compared, and a note when they settle differently. */
    matched_ply?: number | null
    horizon_note?: string | null
  }
}

export interface GameMetadata {
  initial_fen?: string | null
  id: string
  white: string
  black: string
  result: string
  eventId: string | null
  site: string | null
  round: string | null
  date: string | null
  whiteElo: number | null
  blackElo: number | null
  opening: string | null
  opening_eco: string | null
  /** Pre-analysis options the commentary was generated with. */
  commentary_level?: string | null
  comment_side?: string | null
}

export interface AnalysisInfo {
  engine: string
  depth: number
  multipv: number
  timestamp: number
}

/** Per-ply progression of every charted positional feature (White-POV cp). */
export interface FeatureSeries {
  plies: number[]
  features: Record<string, (number | null)[]>
}

export interface GameJson {
  metadata: GameMetadata
  moves: GameMove[]
  feature_series?: FeatureSeries | null
  /** True once the LLM commentary sweep finished. */
  commentary_complete?: boolean
  analysis_info: AnalysisInfo
}
