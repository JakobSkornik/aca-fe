import type { ResolvedAnnotationToken } from './WebSocketMessages'

export interface MoveScore {
  cp: number | null;
  mate: number | null;
}

export interface Variation {
  rank: number;
  move_san: string;
  score: MoveScore | null;
  line: string[];
  /** Position after each ply of `line` (backend-resolved; no SAN replay needed). */
  fens?: string[];
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
