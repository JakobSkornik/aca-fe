export type ComparisonDecision = 'ranked' | 'similar' | 'cannot_judge' | 'skipped'
export type ComparisonReview = {
  game_id: string; decision: ComparisonDecision; best: string | null; worst: string | null
  best_reason: string; worst_reason: string; feedback: string
}
export type ComparisonSession = {
  id: string; token?: string; version: number; completed: boolean; feedback: string
  rounds: { game_id: string; level: string; candidates: { id: string; label: string }[] }[]
  reviews: ComparisonReview[]
}
export type ComparisonManifest = {
  title: string; round_count: number; candidate_count: number; rating_brackets: string[]; review_scope: string
}
export type ComparisonRound = {
  game_id: string; level: string; bracket: string
  position: { move_index: number; ply: number; san: string; fen_before: string; fen_after: string }
  candidates: { id: string; label: string; comment: string }[]
}
export type ComparisonCell = {
  id: string; game_id: string; model: string; level: string; ranked: number; best: number; worst: number
  similar: number; cannot_judge: number; skipped: number; best_rate: number | null; worst_rate: number | null
}
export type ComparisonResults = {
  title: string; started: number; completed: number; in_progress: number
  models: { id: string; label: string; provider: string }[]; levels: string[]
  games: { id: string; bracket: string }[]; cells: ComparisonCell[]
  reasons: { model: string; game_id: string; level: string; choice: string; text: string }[]
  feedback: string[]; provenance: Record<string, unknown>
}
