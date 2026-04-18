import { Move } from './chess/Move'
import { PgnHeaders } from './chess/PgnHeaders'

// --- Message Type Enums ---
export enum ClientWsMessageType {
  GET_SESSION_METADATA = 'GET_SESSION_METADATA',
  GET_DETAILED_ANALYSIS = 'GET_DETAILED_ANALYSIS',
  GET_MOVE_LIST = 'GET_MOVE_LIST',
  GET_GAME_ANALYSIS = 'GET_GAME_ANALYSIS',
  SET_MODEL_PARAMS = 'SET_MODEL_PARAMS',
}

export enum ServerWsMessageType {
  ERROR = 'ERROR',
  SESSION_METADATA = 'SESSION_METADATA',
  MOVE_LIST = 'MOVE_LIST',
  ANALYSIS_UPDATE = 'ANALYSIS_UPDATE',
  ANALYSIS_PROGRESS = 'ANALYSIS_PROGRESS',
  FULL_ANALYSIS_COMPLETE = 'FULL_ANALYSIS_COMPLETE',
  COMMENT_UPDATE = 'COMMENT_UPDATE',
  COMMENT_HISTORY = 'COMMENT_HISTORY',
  AI_COMMENT_UPDATE = 'AI_COMMENT_UPDATE',
  EPISODE_NARRATIVE = 'EPISODE_NARRATIVE',
  GAME_NARRATIVE = 'GAME_NARRATIVE',
  GAME_SUMMARY = 'GAME_SUMMARY',
  AI_GENERATION_STATUS = 'AI_GENERATION_STATUS',
  MODEL_PARAMS_UPDATED = 'MODEL_PARAMS_UPDATED',
}

// --- Client Message Payloads ---
export interface GetSessionMetadataClientPayload {
  session_id: string
}

export interface RequestAnalysisClientPayload {
  move: Move
}

export interface SetModelParamsClientPayload {
  model?: 'gpt-5.4-mini' | 'gpt-5.4'
  effort?: 'low' | 'medium' | 'high'
  temperature?: number
  maxTokens?: number
}

// --- Server Message Payloads ---
export interface SessionMetadataServerPayload {
  headers: PgnHeaders
  session_id: string
}

export interface MoveListServerPayload {
  moveList: Move[]
}

export interface ErrorServerPayload {
  message: string
  details?: Record<string, string>
}

export interface NodeAnalysisUpdatePayload {
  move: Move
  pvs: Move[][]
}

export interface AnalysisProgressServerPayload {
  current_move: number
  total_moves: number
  percentage: number
  current_phase: string
  current_move_san: string
}

export interface FullAnalysisCompleteServerPayload {
  moves: Move[]
  pvs: Record<number, Move[][]>
}

export interface CommentUpdateServerPayload {
  moveId: number
  context: 'mainline' | 'preview'
  text: string
  featuresUsed: string[]
  hiddenFeatures?: Record<string, unknown>
  analysisVersion?: number
  generatedAt?: string
}

export interface CommentHistoryServerPayload {
  items: CommentUpdateServerPayload[]
}

/** Optional structured PV for hover boards in commentary (from job analysis). */
export interface AiCommentPvLineEntry {
  san: string
  fen: string
}

/** Backend-resolved inline annotation token (see annotation_tokens.py). */
export interface ResolvedAnnotationToken {
  type: string
  raw: string
  content: string
  start: number
  end: number
  data: Record<string, unknown> | null
}

/** Chroma RAG reference (master-game position + snippet) streamed with AI commentary. */
export interface AiCommentRagRef {
  source: string
  fen: string
  text: string
  score: number
  san?: string
  phase?: string
}

/** Full LLM + RAG debug (mirrors server `llm_debug` on AI_COMMENT_UPDATE). */
export interface AiCommentLlmDebug {
  move_category: string | null
  key_moment_type: string | null
  tier: { steps: number; effort: string; max_tokens?: number }
  rag_query: Record<string, unknown>
  rationale: Record<string, unknown>
  system_prompts: { name: string; text: string }[]
  user_text: string
  passes: { name: string; effort: string }[]
  token_usage_total: number | null
}

export interface AiCommentUpdateServerPayload {
  moveId: number
  context: 'mainline' | 'preview'
  data: Record<string, unknown> & {
    summary?: string
    commentary?: string
    bullets?: string[]
    pv_line?: AiCommentPvLineEntry[]
    resolved_tokens?: ResolvedAnnotationToken[]
    rag_refs?: AiCommentRagRef[]
    llm_debug?: AiCommentLlmDebug
  }
}

export interface EpisodeNarrativeServerPayload {
  episode_index: number
  title: string
  narrative: string
}

export interface GameNarrativeServerPayload {
  narrative: string
}

/** Whole-game digest from pre-move LLM pass (see `GAME_SUMMARY` WS event). */
export interface GameSummaryDigest {
  overall_story: string
  opening_character: string
  phase_story: { phase: string; summary: string }[]
  turning_points: { ply: number; san: string; why: string }[]
  winning_side_plan: string
  losing_side_mistakes: string
}

export interface GameSummaryServerPayload {
  digest: GameSummaryDigest
}

export interface AiGenerationStatusServerPayload {
  moveId: number
  context: 'mainline' | 'preview'
  status: 'start' | 'end'
  startedAt?: number
  endedAt?: number
  model?: string
  effort?: string
}

export interface ModelParamsUpdatedServerPayload {
  model: 'gpt-5.4-mini' | 'gpt-5.4'
  effort: 'low' | 'medium' | 'high'
  temperature?: number
  maxTokens?: number
}

// --- Generic Message Structures ---
export interface ClientWsMessage {
  type: ClientWsMessageType
  payload?:
  | GetSessionMetadataClientPayload
  | RequestAnalysisClientPayload
  | SetModelParamsClientPayload
}

export interface ServerWsMessage {
  type: ServerWsMessageType
  payload:
  | ErrorServerPayload
  | SessionMetadataServerPayload
  | MoveListServerPayload
  | NodeAnalysisUpdatePayload
  | AnalysisProgressServerPayload
  | FullAnalysisCompleteServerPayload
  | CommentUpdateServerPayload
  | CommentHistoryServerPayload
  | AiCommentUpdateServerPayload
  | EpisodeNarrativeServerPayload
  | GameNarrativeServerPayload
  | GameSummaryServerPayload
  | AiGenerationStatusServerPayload
  | ModelParamsUpdatedServerPayload
}
