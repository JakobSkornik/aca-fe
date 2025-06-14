import { Move } from './chess/Move'
import { PgnHeaders } from './chess/PgnHeaders'

// --- Message Type Enums ---
export enum ClientWsMessageType {
  GET_SESSION_METADATA = 'GET_SESSION_METADATA',
  GET_DETAILED_ANALYSIS = 'GET_DETAILED_ANALYSIS',
  GET_MOVE_LIST = 'GET_MOVE_LIST',
  GET_GAME_ANALYSIS = 'GET_GAME_ANALYSIS',
}

export enum ServerWsMessageType {
  ERROR = 'ERROR',
  SESSION_METADATA = 'SESSION_METADATA',
  MOVE_LIST = 'MOVE_LIST',
  ANALYSIS_UPDATE = 'ANALYSIS_UPDATE',
  ANALYSIS_PROGRESS = 'ANALYSIS_PROGRESS',
  FULL_ANALYSIS_COMPLETE = 'FULL_ANALYSIS_COMPLETE',
}

// --- Client Message Payloads ---
export interface GetSessionMetadataClientPayload {
  session_id: string
}

export interface RequestAnalysisClientPayload {
  move: Move
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

// --- Generic Message Structures ---
export interface ClientWsMessage {
  type: ClientWsMessageType
  payload?:
    | GetSessionMetadataClientPayload
    | RequestAnalysisClientPayload
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
}
