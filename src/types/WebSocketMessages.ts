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
  model?: 'gpt-5-mini' | 'gpt-5'
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

export interface AiCommentUpdateServerPayload {
  moveId: number
  context: 'mainline' | 'preview'
  data: Record<string, unknown>
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
  model: 'gpt-5-mini' | 'gpt-5'
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
  | AiGenerationStatusServerPayload
  | ModelParamsUpdatedServerPayload
}
