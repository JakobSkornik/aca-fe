export type JobStatus = 'waiting' | 'processing' | 'engine_complete' | 'completed' | 'failed'

/** Mirrors backend `PgnMetadata`. */
export interface JobPgnHeaders {
  whiteName: string
  blackName: string
  whiteElo: number | null
  blackElo: number | null
  event: string
  opening: string
  result: string
}

export interface JobResponse {
  job_id: string
  status: JobStatus
  queue_position: number | null
  progress: number | null
  message: string | null
  created_at: number
  pgn_headers: JobPgnHeaders | null
  move_count: number | null
  llm_model: string | null
  llm_effort: string | null
  error: string | null
  queued_ahead: number | null
  pgn_preview: string | null
}
