import { Chess } from 'chess.js'
import webSocketService from '../services/WebSocketService'
import { Move } from '../types/chess/Move'
import { PgnHeaders } from '../types/chess/PgnHeaders'
import { MoveList, formatCapturesForDisplay, convertMoveArrayToMoveList, integratePvsIntoMoveList } from '../helpers/moveListUtils'
import { applyCaptureFromMoveResult, cloneCaptureCount, emptyCaptureCount } from '../helpers/captureUtils'
import { ClientWsMessageType, ServerWsMessage, ServerWsMessageType, SessionMetadataServerPayload, ErrorServerPayload, MoveListServerPayload, NodeAnalysisUpdatePayload, AnalysisProgressServerPayload, FullAnalysisCompleteServerPayload, AiCommentUpdateServerPayload, AiGenerationStatusServerPayload, ModelParamsUpdatedServerPayload, SetModelParamsClientPayload, EpisodeNarrativeServerPayload, GameNarrativeServerPayload, GameSummaryServerPayload } from '../types/WebSocketMessages'
import { jobService } from '../services/JobService'
import { CaptureCount } from '../types/chess/CaptureCount'
import { chessPositionManager } from '../helpers/ChessPositionManager'
import { GameJson, GameMove } from '../types/GameJson'
import { isEngineKeyMomentScoreComment } from '../helpers/commentaryText'
import type { AiCommentLlmDebug, GameSummaryDigest, ResolvedAnnotationToken } from '../types/WebSocketMessages'
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types'

/** Retrieved master-game annotation reference (Chroma RAG). */
export type RagRef = {
  source: string
  fen: string
  text: string
  score: number
  san?: string
  phase?: string
}

/** Commentary for a mainline move; optional PV line for hover boards (from AI payload). */
export type MainlineComment = {
  moveId: number
  moveIndex: number
  text: string
  pvLine?: { san: string; fen: string }[]
  resolvedTokens?: ResolvedAnnotationToken[]
  ragRefs?: RagRef[]
  llmDebug?: AiCommentLlmDebug
}

/** Transient highlights on the main board from annotation hover (arrows + square tint). */
export type CommentaryBoardOverlay = {
  arrows: Arrow[]
  squareStyles: CustomSquareStyles
} | null

export type GameStateSnapshot = {
  game: Chess
  isLoaded: boolean
  pgnHeaders: PgnHeaders | null
  isWsConnected: boolean
  wsError: string | null
  isAnalysisInProgress: boolean
  isFullyAnalyzed: boolean
  analysisProgress: number
  // Move state
  moves: MoveList
  currentMoveIndex: number
  commentsMainline: MainlineComment[]
  pendingComments: { moveId: number; context: 'mainline' | 'preview'; text: string }[]
  aiComments: { moveId: number; moveIndex: number; context: 'mainline' | 'preview'; data: Record<string, unknown> }[]
  modelParams: { model: 'gpt-5.4-mini' | 'gpt-5.4'; effort: 'low' | 'medium' | 'high'; temperature?: number; maxTokens?: number }
  aiGeneration: Record<number, { context: 'mainline' | 'preview'; startedAt: number; model?: string; effort?: string }>
  episodeNarratives: { episodeIndex: number; title: string; narrative: string }[]
  gameNarrative: string | null
  /** Whole-game digest streamed before per-move commentary (`GAME_SUMMARY`). */
  gameSummary: GameSummaryDigest | null
  commentaryComplete: boolean
  /** Hover-driven overlay from inline commentary tokens (merged in MainlineChessboard). */
  commentaryBoardOverlay: CommentaryBoardOverlay
}

const getPieceFromSan = (san: string, color: 'w' | 'b'): string => {
  // Common piece letters in SAN (English)
  // N = Knight, B = Bishop, R = Rook, Q = Queen, K = King
  // If no letter, it's a Pawn (P)
  const firstChar = san.charAt(0);
  let pieceChar = 'P';
  if (['N', 'B', 'R', 'Q', 'K'].includes(firstChar)) {
    pieceChar = firstChar;
  }
  // Check for castling
  if (san.startsWith('O-O')) {
    pieceChar = 'K';
  }
  
  return `${color}${pieceChar}`;
}

export class GameStateManager {
  private state: GameStateSnapshot
  private listeners: (() => void)[] = []
  private jobCommentaryWs: WebSocket | null = null

  constructor() {
    this.state = {
      game: new Chess(),
      isLoaded: false,
      pgnHeaders: null,
      isWsConnected: false,
      wsError: null,
      isAnalysisInProgress: false,
      isFullyAnalyzed: false,
      analysisProgress: 0,
      moves: new MoveList(),
      currentMoveIndex: 0,
      commentsMainline: [],
      pendingComments: [],
      aiComments: [],
      modelParams: { model: 'gpt-5.4', effort: 'medium', temperature: 0.2, maxTokens: 120 },
      aiGeneration: {},
      episodeNarratives: [],
      gameNarrative: null,
      gameSummary: null,
      commentaryComplete: true,
      commentaryBoardOverlay: null,
    }
  }

  // --- State subscription ---
  subscribe(listener: () => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(l => l())
  }

  // --- State access ---
  getState(): GameStateSnapshot {
    return { ...this.state }
  }

  // --- Move Index Helper ---
  findMoveIndexById(id: number): number {
    return this.state.moves.getMoveIdxById(id)
  }

  // --- Load from JSON ---
  loadGameFromJson(data: GameJson) {
    this.disconnectJobCommentaryWs()
    this.state.isLoaded = false;
    this.state.isAnalysisInProgress = false;
    this.state.isFullyAnalyzed = true;
    this.state.analysisProgress = 100;
    this.state.wsError = null;
    this.state.commentsMainline = [];
    this.state.commentaryBoardOverlay = null;
    this.state.episodeNarratives = (data.episodes || [])
      .filter((e) => e.narrative)
      .map((e) => ({
        episodeIndex: e.episode_index,
        title: e.title,
        narrative: e.narrative as string,
      }));
    this.state.gameNarrative = data.game_narrative ?? null;
    this.state.gameSummary = data.game_summary ?? null;
    this.state.commentaryComplete = !!data.game_narrative;

    // Set headers
    this.state.pgnHeaders = {
      whiteName: data.metadata.white,
      blackName: data.metadata.black,
      whiteElo: data.metadata.whiteElo ?? 0,
      blackElo: data.metadata.blackElo ?? 0,
      result: data.metadata.result,
      opening: data.metadata.opening || '',
      event: data.metadata.eventId || ''
    };

    // Reconstruct Moves
    const moveList = new MoveList();
    const chess = new Chess(); // Replay mainline; PVs use position before each move
    let capW = emptyCaptureCount()
    let capB = emptyCaptureCount()

    data.moves.forEach((gm: GameMove, index: number) => {
        // Mainline move
        const move: Move = {
            id: index + 1, // Simple ID
            depth: data.analysis_info.depth, // Use global depth for now
            position: gm.fen,
            move: gm.san, // Use SAN for display
            isAnalyzed: true,
            context: 'mainline',
            score: gm.score ? (gm.score.mate ? (gm.score.mate > 0 ? 100000 - gm.score.mate : -100000 - gm.score.mate) : gm.score.cp || 0) : undefined,
            annotation: gm.comment || undefined,
            piece: getPieceFromSan(gm.san, gm.color),
            hiddenFeatures: {}
        };

        // AI commentary list only (exclude engine key-moment + score lines)
        if (gm.comment && !isEngineKeyMomentScoreComment(gm.comment)) {
            this.state.commentsMainline.push({
                moveId: move.id,
                moveIndex: index,
                text: gm.comment,
            })
        }

        // PVs (from position before this mainline move)
        const pvs: Move[][] = [];
        
        gm.variations.forEach(variation => {
             const pvLine: Move[] = [];
             const pvChess = new Chess(chess.fen()); // Clone state before move
             
             variation.line.forEach((pvMoveStr, pvIndex) => {
                 try {
                     // pvMoveStr is SAN from backend
                     const result = pvChess.move(pvMoveStr);
                     if (result) {
                         const pvMove: Move = {
                             id: (index + 1) * 1000 + pvIndex,
                             depth: data.analysis_info.depth,
                             position: pvChess.fen(),
                             move: result.san, // Store SAN
                             isAnalyzed: true,
                             context: `pv${variation.rank}`,
                             score: pvIndex === 0 ? (variation.score ? (variation.score.mate ? (variation.score.mate > 0 ? 100000 : -100000) : variation.score.cp || 0) : undefined) : undefined,
                             piece: getPieceFromSan(result.san, result.color)
                         };
                         pvLine.push(pvMove);
                     }
                 } catch (e) {
                     console.warn("Failed to replay PV move", pvMoveStr, e);
                 }
             });
             if (pvLine.length > 0) {
                pvs.push(pvLine);
             }
        });

        const pv1 = pvs.length > 0 ? pvs[0] : [];
        const pv2 = pvs.length > 1 ? pvs[1] : [];

        // Advance mainline and track material captured
        let last: ReturnType<Chess['move']> | null = null
        try {
            last = chess.move(gm.san)
        } catch {
             try {
                last = chess.move(gm.uci)
             } catch (e) {
                 console.error("Failed to make move", gm.san, gm.uci, e);
             }
        }
        if (last?.captured) {
          const u = applyCaptureFromMoveResult(capW, capB, last.captured, last.color)
          capW = u.capW
          capB = u.capB
        }
        move.capturedByWhite = cloneCaptureCount(capW)
        move.capturedByBlack = cloneCaptureCount(capB)

        moveList.addMove(move, pv1, pv2);
    });
    
    // Apply classifications
    moveList.applyClassificationsToAllMoves();

    this.state.moves = moveList;
    this.state.isLoaded = true;
    this.notify();
  }

  // --- Unified Move Analysis ---
  requestMoveAnalysis(move: Move) {
    webSocketService.sendMessage({
      type: ClientWsMessageType.GET_DETAILED_ANALYSIS,
      payload: { move },
    })
  }

  // --- Current Move Analysis Check ---
  checkAndRequestCurrentMoveAnalysis() {
    const currentMove = this.getCurrentMove()
    if (currentMove && !currentMove.isAnalyzed) {
      this.requestMoveAnalysis(currentMove)
    }
  }

  // --- Unified Navigation ---
  goToMove(index: number) {
    if (index >= 0 && index < this.state.moves.getMainlineMoveCount()) {
      this.state.currentMoveIndex = index
      this.state.commentaryBoardOverlay = null
      this.checkAndRequestCurrentMoveAnalysis()
      this.notify()
    }
  }

  moveNext() {
    const nextIndex = this.state.currentMoveIndex + 1
    if (nextIndex < this.state.moves.getMainlineMoveCount()) {
      this.state.currentMoveIndex = nextIndex
      this.state.commentaryBoardOverlay = null
      this.checkAndRequestCurrentMoveAnalysis()
      this.notify()
    }
  }

  movePrev() {
    const prevIndex = this.state.currentMoveIndex - 1
    if (prevIndex >= 0) {
      this.state.currentMoveIndex = prevIndex
      this.state.commentaryBoardOverlay = null
      this.checkAndRequestCurrentMoveAnalysis()
      this.notify()
    }
  }

  goToFirst() {
    this.state.currentMoveIndex = 0
    this.state.commentaryBoardOverlay = null
    this.checkAndRequestCurrentMoveAnalysis()
    this.notify()
  }

  goToLast() {
    this.state.currentMoveIndex = this.state.moves.getMainlineMoveCount() - 1
    this.state.commentaryBoardOverlay = null
    this.checkAndRequestCurrentMoveAnalysis()
    this.notify()
  }

  getCurrentMove(): Move | null {
    return this.state.moves.getMoveAtIndex(this.state.currentMoveIndex)
  }

  getCurrentPositionUnified(): string | null {
    return this.state.moves.getCurrentPosition(this.state.currentMoveIndex)
  }

  getCurrentCaptures() {
    return this.state.moves.getCapturesForMove(this.state.currentMoveIndex)
  }

  /** FEN after the move at `index` (start position when `index` is 0 or negative). */
  getPositionForIndex(index: number): string {
    return this.state.moves.getPositionForIndex(index)
  }

  // --- Backend interaction ---
  connectToSession(sessionId: string) {
    this.state.isLoaded = false
    this.state.pgnHeaders = null
    this.state.moves = new MoveList()
    this.state.currentMoveIndex = 0
    this.state.wsError = null
    this.notify()
    webSocketService.connect(sessionId, {
      onOpen: this.handleWsOpen,
      onMessage: this.handleWsMessage,
      onError: this.handleWsError,
      onClose: this.handleWsClose,
    })
  }

  disconnectSession() {
    this.disconnectJobCommentaryWs()
    webSocketService.disconnect()
    this.state.isWsConnected = false
    this.state.isLoaded = false
    this.state.isAnalysisInProgress = false
    this.state.analysisProgress = 0
    this.state.isFullyAnalyzed = false
    this.state.pgnHeaders = null
    this.state.moves = new MoveList()
    this.state.currentMoveIndex = 0
    this.notify()
  }

  requestFullGameAnalysis() {
    if (this.state.isAnalysisInProgress) return
    this.state.isAnalysisInProgress = true
    this.state.analysisProgress = 0
    this.notify()
    webSocketService.sendMessage({
      type: ClientWsMessageType.GET_GAME_ANALYSIS,
    })
  }

  private applyAiCommentUpdatePayload(aiPayload: AiCommentUpdateServerPayload) {
    const idx = this.state.moves.findMoveIndexById(aiPayload.moveId)
    if (idx === -1) return
    this.state.aiComments = [
      ...this.state.aiComments,
      {
        moveId: aiPayload.moveId,
        moveIndex: idx,
        context: aiPayload.context,
        data: aiPayload.data,
      },
    ]
    try {
      const raw = aiPayload.data as Record<string, unknown>
      const summary = String(raw?.summary || raw?.commentary || '')
      const bullets = Array.isArray(raw?.bullets) ? (raw.bullets as unknown[]).map(String) : []
      const text = [summary, ...bullets.map((b) => `- ${b}`)].filter(Boolean).join('\n')
      const commentItem: MainlineComment = { moveId: aiPayload.moveId, moveIndex: idx, text }
      const pvRaw = raw?.pv_line
      if (Array.isArray(pvRaw)) {
        const parsed = pvRaw.filter(
          (x): x is { san: string; fen: string } =>
            typeof x === 'object' &&
            x !== null &&
            typeof (x as { san?: string }).san === 'string' &&
            typeof (x as { fen?: string }).fen === 'string'
        )
        if (parsed.length > 0) commentItem.pvLine = parsed
      }
      const rtRaw = raw?.resolved_tokens
      if (Array.isArray(rtRaw) && rtRaw.length > 0) {
        commentItem.resolvedTokens = rtRaw as ResolvedAnnotationToken[]
      }
      const ragRaw = raw?.rag_refs
      if (Array.isArray(ragRaw) && ragRaw.length > 0) {
        const parsed: RagRef[] = ragRaw
          .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
          .map((x) => {
            const sc = x.score
            const score = typeof sc === 'number' && !Number.isNaN(sc) ? sc : 0
            return {
              source: String(x.source ?? ''),
              fen: String(x.fen ?? ''),
              text: String(x.text ?? ''),
              score,
              san: typeof x.san === 'string' ? x.san : undefined,
              phase: typeof x.phase === 'string' ? x.phase : undefined,
            }
          })
          .filter((r) => r.source && r.fen && r.text)
        if (parsed.length > 0) commentItem.ragRefs = parsed
      }
      const ldRaw = raw?.llm_debug
      if (ldRaw && typeof ldRaw === 'object' && ldRaw !== null) {
        commentItem.llmDebug = ldRaw as AiCommentLlmDebug
        console.groupCollapsed(`[LLM debug] move ${aiPayload.moveId}`)
        console.log('move_category', (ldRaw as AiCommentLlmDebug).move_category)
        console.log('key_moment_type', (ldRaw as AiCommentLlmDebug).key_moment_type)
        console.log('tier', (ldRaw as AiCommentLlmDebug).tier)
        console.log('passes', (ldRaw as AiCommentLlmDebug).passes)
        console.log('token_usage_total', (ldRaw as AiCommentLlmDebug).token_usage_total)
        console.log('rag_query', (ldRaw as AiCommentLlmDebug).rag_query)
        console.log('rationale', (ldRaw as AiCommentLlmDebug).rationale)
        console.log('system_prompts', (ldRaw as AiCommentLlmDebug).system_prompts)
        console.log('user_text', (ldRaw as AiCommentLlmDebug).user_text)
        console.groupEnd()
      }
      this.state.commentsMainline = [...this.state.commentsMainline, commentItem]
    } catch {
      /* ignore */
    }
    if (this.state.aiGeneration[aiPayload.moveId]) {
      const nextGen = { ...this.state.aiGeneration }
      delete nextGen[aiPayload.moveId]
      this.state.aiGeneration = nextGen
    }
    this.notify()
  }

  /** Streamed LLM commentary for job-based analysis (`/jobs/{id}/ws`). */
  connectToJobCommentaryWs(jobId: string) {
    if (this.state.commentaryComplete) return
    this.disconnectJobCommentaryWs()
    const url = jobService.getCommentaryWsUrl(jobId)
    const ws = new WebSocket(url)
    this.jobCommentaryWs = ws
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { type: string; payload: unknown }
        this.handleJobCommentaryMessage(msg)
      } catch {
        /* ignore */
      }
    }
    ws.onerror = () => {
      console.warn('Job commentary WebSocket error')
    }
    ws.onclose = () => {
      this.jobCommentaryWs = null
    }
  }

  disconnectJobCommentaryWs() {
    if (this.jobCommentaryWs) {
      this.jobCommentaryWs.close()
      this.jobCommentaryWs = null
    }
  }

  private handleJobCommentaryMessage(msg: { type: string; payload: unknown }) {
    switch (msg.type) {
      case 'AI_GENERATION_STATUS': {
        const p = msg.payload as AiGenerationStatusServerPayload
        if (p.status === 'start') {
          this.state.aiGeneration = {
            ...this.state.aiGeneration,
            [p.moveId]: {
              context: p.context,
              startedAt: p.startedAt || Date.now() / 1000,
              model: p.model,
              effort: p.effort,
            },
          }
        } else if (p.status === 'end') {
          const nextGen = { ...this.state.aiGeneration }
          delete nextGen[p.moveId]
          this.state.aiGeneration = nextGen
        }
        this.notify()
        break
      }
      case 'AI_COMMENT_UPDATE':
        this.applyAiCommentUpdatePayload(msg.payload as AiCommentUpdateServerPayload)
        break
      case 'EPISODE_NARRATIVE': {
        const p = msg.payload as EpisodeNarrativeServerPayload
        this.state.episodeNarratives = [
          ...this.state.episodeNarratives.filter((e) => e.episodeIndex !== p.episode_index),
          { episodeIndex: p.episode_index, title: p.title, narrative: p.narrative },
        ]
        this.notify()
        break
      }
      case 'GAME_NARRATIVE': {
        const p = msg.payload as GameNarrativeServerPayload
        this.state.gameNarrative = p.narrative
        this.state.commentaryComplete = true
        this.disconnectJobCommentaryWs()
        this.notify()
        break
      }
      case 'GAME_SUMMARY': {
        const p = msg.payload as GameSummaryServerPayload
        this.state.gameSummary = p.digest
        this.notify()
        break
      }
      default:
        break
    }
  }

  // --- WebSocket Handlers ---
  private handleWsOpen = () => {
    this.state.isWsConnected = true
    this.state.wsError = null
    this.notify()
    this.requestPgnHeaders()
    this.requestMoveList()
  }

  private handleWsMessage = (srvMsg: ServerWsMessage) => {
    // message dispatch
    switch (srvMsg.type) {
      case ServerWsMessageType.ERROR:
        const errorPayload = srvMsg.payload as ErrorServerPayload
        this.state.wsError = errorPayload.message
        this.state.isLoaded = false
        this.state.isAnalysisInProgress = false
        this.state.analysisProgress = 0
        this.notify()
        break

      case ServerWsMessageType.SESSION_METADATA:
        const metadataPayload = srvMsg.payload as SessionMetadataServerPayload
        this.state.pgnHeaders = metadataPayload.headers
        this.state.isLoaded = true
        this.state.wsError = null
        this.notify()
        break

      case ServerWsMessageType.MOVE_LIST:
        const moveListPayload = srvMsg.payload as MoveListServerPayload
        this.state.moves.handleWsMoveListPayload(moveListPayload)
        this.state.isLoaded = true
        this.state.wsError = null
        // Try to resolve any pending comments now that moves exist
        this._flushPendingComments()
        this.notify()
        break

      case ServerWsMessageType.ANALYSIS_UPDATE:
        const analysisPayload = srvMsg.payload as NodeAnalysisUpdatePayload
        if (analysisPayload.move.context == "mainline") {
          this.state.moves.handleWsNodeAnalysisUpdatePayload(analysisPayload)
        }
        this._flushPendingComments()
        this.notify()
        break

      case ServerWsMessageType.ANALYSIS_PROGRESS:
        const progressPayload = srvMsg.payload as AnalysisProgressServerPayload
        this.state.analysisProgress = progressPayload.percentage
        this.notify()
        break

      case ServerWsMessageType.FULL_ANALYSIS_COMPLETE:
        const completePayload = srvMsg.payload as FullAnalysisCompleteServerPayload
        // full analysis complete
        const convertedMoves = convertMoveArrayToMoveList(completePayload.moves)
        const finalMoves = completePayload.pvs ? integratePvsIntoMoveList(convertedMoves, completePayload.pvs) : convertedMoves

        // Apply classifications to the new move list
        finalMoves.applyClassificationsToAllMoves()

        this.state.moves = finalMoves
        this.state.isAnalysisInProgress = false
        this.state.analysisProgress = 100
        this.state.isFullyAnalyzed = true
        this._flushPendingComments()
        this.notify()
        break

      case ServerWsMessageType.COMMENT_UPDATE:
        // Engine/heuristic comments from commenting_service; list is AI-only (AI_COMMENT_UPDATE).
        break

      case ServerWsMessageType.AI_COMMENT_UPDATE:
        this.applyAiCommentUpdatePayload(srvMsg.payload as AiCommentUpdateServerPayload)
        break

      case ServerWsMessageType.AI_GENERATION_STATUS:
        const genPayload = srvMsg.payload as AiGenerationStatusServerPayload
        if (genPayload.status === 'start') {
          this.state.aiGeneration = {
            ...this.state.aiGeneration,
            [genPayload.moveId]: {
              context: genPayload.context,
              startedAt: genPayload.startedAt || Date.now() / 1000,
              model: genPayload.model,
              effort: genPayload.effort,
            },
          }
        } else if (genPayload.status === 'end') {
          const nextGen = { ...this.state.aiGeneration }
          delete nextGen[genPayload.moveId]
          this.state.aiGeneration = nextGen
        }
        this.notify()
        break

      case ServerWsMessageType.MODEL_PARAMS_UPDATED:
        const paramsPayload = srvMsg.payload as ModelParamsUpdatedServerPayload
        this.state.modelParams = {
          model: paramsPayload.model,
          effort: paramsPayload.effort,
          temperature: paramsPayload.temperature,
          maxTokens: paramsPayload.maxTokens,
        }
        // New model settings invalidate existing AI-generated commentary
        this.state.commentsMainline = []
        this.state.aiComments = []
        this.state.pendingComments = []
        this.state.episodeNarratives = []
        this.state.gameNarrative = null
        this.state.gameSummary = null
        this.state.commentaryComplete = false
        this.notify()
        break

      case ServerWsMessageType.GAME_SUMMARY: {
        const p = srvMsg.payload as GameSummaryServerPayload
        this.state.gameSummary = p.digest
        this.notify()
        break
      }

      default:
        break
    }
  }

  private handleWsError = () => {
    this.state.isWsConnected = false
    this.state.wsError = 'WebSocket connection error.'
    this.state.isLoaded = false
    this.state.isAnalysisInProgress = false
    this.state.analysisProgress = 0
    this.notify()
  }

  private handleWsClose = () => {
    this.state.isWsConnected = false
    this.state.isLoaded = false
    this.notify()
  }

  requestPgnHeaders() {
    webSocketService.sendMessage({ type: ClientWsMessageType.GET_SESSION_METADATA })
  }

  requestMoveList() {
    webSocketService.sendMessage({ type: ClientWsMessageType.GET_MOVE_LIST })
  }

  // --- Model Params Controls ---
  setModelParams(params: Partial<SetModelParamsClientPayload>) {
    webSocketService.sendMessage({ type: ClientWsMessageType.SET_MODEL_PARAMS, payload: params })
  }

  getModelParams() {
    return this.state.modelParams
  }

  // --- Utility accessors for UI ---
  getCommentsForDisplay() {
    return this.state.commentsMainline
  }

  getCommentsMainline() {
    return this.state.commentsMainline
  }
  getMainlineMovesList() {
    return this.state.moves.getMainlineMoves()
  }

  getDisplayedMovesList() {
    return this.state.moves.getMainlineMoves()
  }

  getDisplayedPreviewMovesList() {
    return []
  }

  getMainlineMove(index: number) {
    return this.state.moves.getMoveAtIndex(index)
  }

  getPvMoves(index: number) {
    return this.state.moves.getPvMoves(index)
  }

  getPv1(index: number) {
    return this.state.moves.getPv1(index)
  }

  getPv2(index: number) {
    return this.state.moves.getPv2(index)
  }

  getCurrentPosition(index: number) {
    const position = this.state.moves.getCurrentPosition(index)

    // Update chess position manager with the current position
    if (position) {
      chessPositionManager.updatePositionFromFen(position)
    } else {
      chessPositionManager.resetToStart()
    }

    return position
  }

  getCapturesForMove(index: number) {
    return this.state.moves.getCapturesForMove(index)
  }

  getMoveAnnotation(index: number) {
    return this.state.moves.getMoveAnnotation(index)
  }

  getMoveEvaluation(index: number) {
    return this.state.moves.getMoveEvaluation(index)
  }

  hasPvMoves(index: number) {
    return this.state.moves.hasPvMoves(index)
  }

  getMainlineMoveCount() {
    return this.state.moves.getMainlineMoveCount()
  }

  formatCapturesForDisplay(captures: CaptureCount | undefined, isWhitePerspective: boolean) {
    return formatCapturesForDisplay(captures, isWhitePerspective)
  }

  setCommentaryBoardOverlay(overlay: CommentaryBoardOverlay) {
    this.state.commentaryBoardOverlay = overlay
    this.notify()
  }

  clearCommentaryBoardOverlay() {
    if (this.state.commentaryBoardOverlay === null) return
    this.state.commentaryBoardOverlay = null
    this.notify()
  }

  updateMoveAnnotations(updatedMoves: MoveList) {
    this.state.moves = updatedMoves
    this.notify()
  }

  // --- ID Management ---
  getNextId(): number {
    return this.state.moves.getNextId()
  }

  // Resolve buffered comments that arrived before moves were present
  private _flushPendingComments() {
    if (this.state.pendingComments.length === 0) return
    const remaining: typeof this.state.pendingComments = []
    for (const pending of this.state.pendingComments) {
      const idx = this.state.moves.findMoveIndexById(pending.moveId)
      if (idx !== -1) {
        const commentItem: MainlineComment = { moveId: pending.moveId, moveIndex: idx, text: pending.text }
        this.state.commentsMainline = [...this.state.commentsMainline, commentItem]
      } else {
        remaining.push(pending)
      }
    }
    this.state.pendingComments = remaining
  }

}
