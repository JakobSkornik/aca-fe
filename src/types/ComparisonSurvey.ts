export type ComparisonDecision = 'rated' | 'skipped'
/** candidate id -> criterion id -> 1..5 */
export type ComparisonScores = Record<string, Record<string, number>>
export type ComparisonReview = {
  game_id: string; decision: ComparisonDecision; scores: ComparisonScores; feedback: string
}
export type ComparisonCriterion = { id: string; label: string; statement: string }
export type ComparisonScale = { min: number; max: number; low: string; high: string }
export type ComparisonSession = {
  id: string; token?: string; version: number; completed: boolean; feedback: string
  rounds: { game_id: string; level: string; candidates: { id: string; label: string }[] }[]
  reviews: ComparisonReview[]
}
export type ComparisonManifest = {
  title: string; round_count: number; candidate_count: number; rating_brackets: string[]; rating_systems: string[]
  criteria: ComparisonCriterion[]; scale: ComparisonScale; review_scope: string
}
export type ComparisonRound = {
  game_id: string; level: string; bracket: string
  position: { move_index: number; ply: number; san: string; fen_before: string; fen_after: string }
  candidates: { id: string; label: string; comment: string }[]
}
export type CriterionSummary = { n: number; mean: number | null; distribution: number[] }
export type ComparisonCell = {
  id: string; game_id: string; model: string; level: string; rated: number; skipped: number
  criteria: Record<string, CriterionSummary>
}
export type ComparisonResults = {
  title: string; started: number; completed: number; in_progress: number
  models: { id: string; label: string; provider: string }[]; levels: string[]
  criteria: ComparisonCriterion[]; scale: ComparisonScale
  games: { id: string; bracket: string }[]; cells: ComparisonCell[]
  notes: { game_id: string; level: string; text: string }[]
  /** Ratings split by the participant's reported rating group, per model and per comment level. */
  by_group?: { axis: 'model' | 'level'; value: string; group: string; criteria: Record<string, CriterionSummary> }[]
  participant_groups?: { id: string; min_elo: number; max_elo_exclusive: number }[]
  participants_by_group?: Record<string, number>
  legacy_reviews: number; feedback: string[]; provenance: Record<string, unknown>
}
