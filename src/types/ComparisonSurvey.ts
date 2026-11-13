import type { CommentLink } from '@/types/GameJson'

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
  /** Statement-checking tasks after the rating rounds (version studies only). */
  tasks?: { id: string }[]
  task_answers?: ComparisonTaskAnswer[]
}
/** An item asked after a task; without `options` it uses the 1-5 agreement scale. */
export type ComparisonTaskItem = { id: 'could_check' | 'trust'; label: string; statement: string; options?: string[] }
export type ComparisonTaskAnswer = {
  task_id: string
  /** Ply of the line after which the statement first holds; null: "I cannot tell". */
  answer_ply: number | null
  could_check: number; trust: number; elapsed_ms: number
}
export type ComparisonTask = {
  id: string; level: string; position: { ply: number; san: string }
  comment: string; fragment: string; statement: string; line: 'played' | 'alternative'
  start_fen: string; san: string[]; fens: string[]; squares: string[]
  series: { label: string; values: number[] } | null
}
export type ComparisonManifest = {
  title: string; round_count: number; candidate_count: number; rating_brackets: string[]; rating_systems: string[]
  criteria: ComparisonCriterion[]; scale: ComparisonScale; review_scope: string
  task_count?: number; task_items?: ComparisonTaskItem[]; duration?: string
  /** Rating rounds show the engine lines without the rule statements (version studies). */
  lines_only?: boolean
}
export type ComparisonRound = {
  game_id: string; level: string; bracket: string
  position: { move_index: number; ply: number; san: string; fen_before: string; fen_after: string }
  candidates: { id: string; label: string; comment: string; links?: CommentLink[] }[]
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
  games: { id: string; bracket: string; type?: string | null; level?: string | null }[]; cells: ComparisonCell[]
  /** Statement-checking tasks: per task, answers scored against the study's key. */
  tasks?: ComparisonTaskSummary[]; task_key?: string | null
  /** The study compares versions of one system, not language models. */
  versions?: boolean
  notes: { game_id: string; level: string; text: string }[]
  /** Ratings split by the participant's reported rating group, per model and per comment level. */
  by_group?: { axis: 'model' | 'level'; value: string; group: string; criteria: Record<string, CriterionSummary> }[]
  participant_groups?: { id: string; min_elo: number; max_elo_exclusive: number }[]
  participants_by_group?: Record<string, number>
  legacy_reviews: number; feedback: string[]; provenance: Record<string, unknown>
}
export type ComparisonTaskSummary = {
  id: string; game_id: string; line: string; statement: string; line_plies: number
  n: number; correct: number; cannot_tell: number; could_check_mean: number | null
  trust_distribution: number[]; median_seconds: number | null
}
