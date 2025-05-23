import { Move, MoveAnalysisNode } from './ws'
import { PgnHeaders } from './PgnHeaders'

// --- Message Type Enums ---
export enum ClientWsMessageType {
  GET_SESSION_METADATA = 'GET_SESSION_METADATA',
  GET_DETAILED_ANALYSIS = 'GET_DETAILED_ANALYSIS',
  GET_MOVE_LIST = 'GET_MOVE_LIST',
  GET_TRACE_TREE = 'GET_TRACE_TREE',
}

export enum ServerWsMessageType {
  ERROR = 'ERROR',
  SESSION_METADATA = 'SESSION_METADATA',
  MOVE_LIST = 'MOVE_LIST',
  ANALYSIS_UPDATE = 'ANALYSIS_UPDATE',
  TRACE_TREE_NODE = 'TRACE_TREE_NODE',
  TRACE_TREE_NODE_BATCH = 'TRACE_TREE_NODE_BATCH',
}

// --- Client Message Payloads ---
export interface GetSessionMetadataClientPayload {
  session_id: string
}

export interface RequestAnalysisClientPayload {
  move: Move
}

export interface RequestTraceTreeClientPayload {
  mainlineMoves: Move[]
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
}

export interface TraceTreeNodePayload {
  nodes: MoveAnalysisNode[]
}

// --- Generic Message Structures ---
export interface ClientWsMessage {
  type: ClientWsMessageType
  payload?:
    | GetSessionMetadataClientPayload
    | RequestAnalysisClientPayload
    | RequestTraceTreeClientPayload
}

export interface ServerWsMessage {
  type: ServerWsMessageType
  payload:
    | ErrorServerPayload
    | SessionMetadataServerPayload
    | MoveListServerPayload
    | NodeAnalysisUpdatePayload
    | TraceTreeNodePayload
}
