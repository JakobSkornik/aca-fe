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
  /** True only for real key-moment commentary (drives the move dot). */
  is_key_moment?: boolean
  /** True when this comment would actually be used in the final annotated game
   * (a substantive key-moment comment, not a back-to-back stub). */
  final_comment?: boolean
  resolved_tokens?: ResolvedAnnotationToken[]
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
}

export interface CommentFactsClaim {
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
}

export interface CommentFactsJson {
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
    display_line: CommentFactsLine | null
    claims: CommentFactsClaim[]
    /** When true this is the clearly-worse runner-up shown to contrast a top
     * move that was played — not a better move that was missed. */
    is_inferior?: boolean
  }
}

export interface GameMetadata {
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
