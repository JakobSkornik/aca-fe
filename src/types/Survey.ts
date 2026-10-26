export type RatingKey = 'clarity' | 'usefulness' | 'coherence' | 'presentation'
export type Ratings = Record<RatingKey, number | null>
export type SurveyReview = { game_id: string; skipped: boolean; ratings: Ratings; feedback: string }
export type SurveyManifest = {
  title: string
  questions: { id: RatingKey; text: string }[]
  games: { id: string; bracket: string }[]
  rating_brackets: string[]
  rating_system: string
}
export type SurveySession = {
  id: string; token?: string; rating: string; order: string[]; reviews: SurveyReview[]
  feedback: string; version: number; completed: boolean
}
export type SurveyResults = {
  title: string; started: number; completed: number; in_progress: number
  questions: SurveyManifest['questions']
  games: { id: string; bracket: string; skipped: number; feedback: string[]
    metrics: Record<RatingKey, { count: number; mean: number | null; distribution: number[]; cannot_judge: number }>
  }[]
  feedback: string[]
  provenance: Record<string, unknown>
}
