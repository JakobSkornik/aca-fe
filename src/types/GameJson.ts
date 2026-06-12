import type { ResolvedAnnotationToken } from './WebSocketMessages'

export interface MoveScore {
  cp: number | null;
  mate: number | null;
}

export interface VariationKeyFactorJson {
  text: string;
  text_state?: string | null;
  features?: string[];
  delta_cp?: number;
  flag_note?: string | null;
}

export interface Variation {
  rank: number;
  move_san: string;
  score: MoveScore | null;
  line: string[];
  /** Position after each ply of `line` (backend-resolved; no SAN replay needed). */
  fens?: string[];
  /** Search depth behind `score`. */
  depth?: number | null;
  /** Key factors of the final position vs the base position. */
  key_factors?: VariationKeyFactorJson[];
}

/** A positional feature this move's comment is grounded in (chart highlight). */
export interface FeatureRef {
  name: string;
  delta_cp: number;
}

/** One feature's change between the starting and envisioned position. */
export interface FeatureDelta {
  name: string;
  delta_cp: number;
  before_cp: number;
  after_cp: number;
  flag_before: number | null;
  flag_after: number | null;
}

/** Guid diff tables: positive favors White, negative favors Black. */
export interface FeatureDiff {
  positive: FeatureDelta[];
  negative: FeatureDelta[];
}

export type GamePhase = 'early' | 'mid' | 'end';

export interface GameMove {
  mn: number;
  color: 'w' | 'b';
  san: string;
  uci: string;
  fen: string;
  phase?: GamePhase;
  score: MoveScore | null;
  variations: Variation[];
  comment: string | null;
  classification: string | null;
  move_quality: string | null;
  event_type: string | null;
  tactical_motifs: string[];
  is_critical: boolean;
  episode_index: number | null;
  feature_refs?: FeatureRef[];
  feature_diff?: FeatureDiff | null;
  resolved_tokens?: ResolvedAnnotationToken[];
  /** Per-audience-level renderings of the same facts; `comment` mirrors intermediate. */
  comments?: Record<string, string>;
  resolved_tokens_by_level?: Record<string, ResolvedAnnotationToken[]>;
  /** Trimmed CommentFacts (verdict, display line, claims, better alternative). */
  comment_facts?: CommentFactsJson | null;
  /** Academic reasoning trace (debug mode). */
  debug?: MoveDebugJson | null;
}

export interface MoveDebugJson {
  eval_before_cp: number | null;
  eval_after_cp: number | null;
  eval_swing_cp: number | null;
  best_move_san: string | null;
  best_move_eval_cp: number | null;
  key_moment_type: string | null;
  move_quality: string | null;
  envisioned: {
    kept_plies: number;
    trimmed_plies: number;
    start_quiescent: boolean;
    leaf_quiescent: boolean;
  } | null;
  fired_rules: {
    rule_id: string;
    text: string;
    delta_cp: number;
    features: string[];
    flag_note: string | null;
  }[];
  muted_claims: string[];
  renderings: Record<string, string> | null;
  contract_ok: boolean | null;
}

export type CommentaryLevel = 'beginner' | 'intermediate' | 'expert';

export interface CommentFactsLine {
  start_fen: string;
  san: string[];
  fens: string[];
}

export interface CommentFactsClaim {
  text: string;
  text_state: string | null;
  features: string[];
  delta_cp: number;
  flag_note: string | null;
  /** Which side this claim favors ("white" | "black"). */
  beneficiary?: string | null;
  /** True when the claim favors the opponent of the mover (a trade-off). */
  is_concession?: boolean;
}

export interface CommentFactsJson {
  verdict: string;
  eval_cp: number | null;
  eval_mate: number | null;
  depth: number | null;
  engine: string;
  display_line: CommentFactsLine | null;
  claims: CommentFactsClaim[];
  better_alternative?: {
    san: string;
    uci: string;
    verdict: string;
    eval_cp: number | null;
    display_line: CommentFactsLine | null;
    claims: CommentFactsClaim[];
  };
}

export interface GameMetadata {
  id: string;
  white: string;
  black: string;
  result: string;
  date: string | null;
  eventId: string | null;
  whiteElo: number | null;
  blackElo: number | null;
  opening: string | null;
}

export interface AnalysisInfo {
  engine: string;
  depth: number;
  multipv: number;
  timestamp: number;
}

export interface EpisodeSummary {
  episode_index: number;
  title: string;
  start_move: number;
  end_move: number;
  narrative: string | null;
  dominant_theme: string;
}

/** Per-ply progression of every charted positional feature (White-POV cp). */
export interface FeatureSeries {
  plies: number[];
  features: Record<string, (number | null)[]>;
}

export interface GameJson {
  metadata: GameMetadata;
  moves: GameMove[];
  episodes?: EpisodeSummary[];
  game_narrative?: string | null;
  feature_series?: FeatureSeries | null;
  analysis_info: AnalysisInfo;
}
