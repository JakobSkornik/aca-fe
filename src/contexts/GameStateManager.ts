import { Chess } from 'chess.js'
import webSocketService from '../services/WebSocketService'
import { Move } from '../types/chess/Move'
import { PgnHeaders } from '../types/chess/PgnHeaders'
import { MoveList, createMoveList, formatCapturesForDisplay, convertMoveArrayToMoveList, integratePvsIntoMoveList, getNextAvailableId } from '../helpers/moveListUtils'
import { ClientWsMessageType, ServerWsMessage, ServerWsMessageType, SessionMetadataServerPayload, ErrorServerPayload, MoveListServerPayload, NodeAnalysisUpdatePayload, AnalysisProgressServerPayload, FullAnalysisCompleteServerPayload, CommentUpdateServerPayload, AiCommentUpdateServerPayload, AiGenerationStatusServerPayload, ModelParamsUpdatedServerPayload, SetModelParamsClientPayload } from '../types/WebSocketMessages'
import { CaptureCount } from '../types/chess/CaptureCount'
import { chessPositionManager } from '../helpers/ChessPositionManager'
import { GameJson, GameMove } from '../types/GameJson'

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
  previewMode: boolean
  previewMoves: MoveList
  previewMoveIndex: number
  commentsMainline: { moveId: number; moveIndex: number; text: string }[]
  commentsPreview: { moveId: number; moveIndex: number; text: string }[]
  pendingComments: { moveId: number; context: 'mainline' | 'preview'; text: string }[]
  aiComments: { moveId: number; moveIndex: number; context: 'mainline' | 'preview'; data: Record<string, unknown> }[]
  modelParams: { model: 'gpt-5-mini' | 'gpt-5'; effort: 'low' | 'medium' | 'high'; temperature?: number; maxTokens?: number }
  aiGeneration: Record<number, { context: 'mainline' | 'preview'; startedAt: number; model?: string; effort?: string }>
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
      previewMode: false,
      previewMoves: new MoveList(),
      previewMoveIndex: 0,
      commentsMainline: [],
      commentsPreview: [],
      pendingComments: [],
      aiComments: [],
      modelParams: { model: 'gpt-5-mini', effort: 'low', temperature: 0.2, maxTokens: 120 },
      aiGeneration: {},
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
    this.state.isLoaded = false;
    this.state.isAnalysisInProgress = false;
    this.state.isFullyAnalyzed = true;
    this.state.analysisProgress = 100;
    this.state.wsError = null;
    this.state.commentsMainline = [];
    this.state.commentsPreview = [];
    
    // Set headers
    this.state.pgnHeaders = {
      whiteName: data.metadata.white,
      blackName: data.metadata.black,
      whiteElo: data.metadata.whiteElo?.toString() || '',
      blackElo: data.metadata.blackElo?.toString() || '',
      result: data.metadata.result,
      opening: data.metadata.opening || '',
      event: data.metadata.eventId || ''
    };

    // Reconstruct Moves
    const moveList = new MoveList();
    const chess = new Chess(); // Used to replay game and PVs for FEN generation

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
            // Map hiddenFeatures if available in JSON (currently not in schema explicitly, but if added later)
            // Or assume some features need to be calculated/mocked if they are missing
            hiddenFeatures: {} 
        };

        // Populate comments
        if (gm.comment) {
            this.state.commentsMainline.push({
                moveId: move.id,
                moveIndex: index, // In MoveList, indices start from 0 (move 1 white)
                text: gm.comment
            });
        }

        // PVs
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

        moveList.addMove(move, pv1, pv2);
        
        // Advance internal chess state
        try {
            chess.move(gm.san); 
        } catch {
             // Fallback if SAN fails
             try {
                chess.move(gm.uci);
             } catch (e) {
                 console.error("Failed to make move", gm.san, gm.uci, e);
             }
        }
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
    if (this.state.previewMode) {
      // In preview mode, navigate within preview moves
      // Convert grid index to preview move index
      const previewIndex = index - this.state.currentMoveIndex
      if (previewIndex >= 0 && previewIndex < this.state.previewMoves.getLength()) {
        this.state.previewMoveIndex = previewIndex
        this.checkAndRequestCurrentMoveAnalysis()
        this.notify()
      }
    } else {
      // In mainline mode, navigate within mainline moves
      if (index >= 0 && index < this.state.moves.getMainlineMoveCount()) {
        this.state.currentMoveIndex = index
        this.checkAndRequestCurrentMoveAnalysis()
        this.notify()
      }
    }
  }

  moveNext() {
    if (this.state.previewMode) {
      // In preview mode, move to next preview move
      const nextIndex = this.state.previewMoveIndex + 1
      if (nextIndex < this.state.previewMoves.getLength()) {
        this.state.previewMoveIndex = nextIndex
        this.checkAndRequestCurrentMoveAnalysis()
        this.notify()
      }
    } else {
      // In mainline mode, move to next mainline move
      const nextIndex = this.state.currentMoveIndex + 1
      if (nextIndex < this.state.moves.getMainlineMoveCount()) {
        this.state.currentMoveIndex = nextIndex
        this.checkAndRequestCurrentMoveAnalysis()
        this.notify()
      }
    }
  }

  movePrev() {
    if (this.state.previewMode) {
      // In preview mode, move to previous preview move
      const prevIndex = this.state.previewMoveIndex - 1
      if (prevIndex >= 0) {
        this.state.previewMoveIndex = prevIndex
        this.checkAndRequestCurrentMoveAnalysis()
        this.notify()
      }
    } else {
      // In mainline mode, move to previous mainline move
      const prevIndex = this.state.currentMoveIndex - 1
      if (prevIndex >= 0) {
        this.state.currentMoveIndex = prevIndex
        this.checkAndRequestCurrentMoveAnalysis()
        this.notify()
      }
    }
  }

  goToFirst() {
    if (this.state.previewMode) {
      this.state.previewMoveIndex = 0
    } else {
      this.state.currentMoveIndex = 0
    }
    this.checkAndRequestCurrentMoveAnalysis()
    this.notify()
  }

  goToLast() {
    if (this.state.previewMode) {
      this.state.previewMoveIndex = this.state.previewMoves.getLength() - 1
    } else {
      this.state.currentMoveIndex = this.state.moves.getMainlineMoveCount() - 1
    }
    this.checkAndRequestCurrentMoveAnalysis()
    this.notify()
  }

  // --- Current Move Access (works in both modes) ---
  getCurrentMove(): Move | null {
    if (this.state.previewMode) {
      return this.state.previewMoves.getMoveAtIndex(this.state.previewMoveIndex)
    } else {
      return this.state.moves.getMoveAtIndex(this.state.currentMoveIndex)
    }
  }

  getCurrentPositionUnified(): string | null {
    if (this.state.previewMode) {
      return this.state.previewMoves.getCurrentPosition(this.state.previewMoveIndex)
    } else {
      return this.state.moves.getCurrentPosition(this.state.currentMoveIndex)
    }
  }

  getCurrentCaptures() {
    if (this.state.previewMode) {
      return this.state.previewMoves.getCapturesForMove(this.state.previewMoveIndex)
    } else {
      return this.state.moves.getCapturesForMove(this.state.currentMoveIndex)
    }
  }

  // --- Preview Mode Management ---
  enterPreviewMode(index?: number) {
    if (this.state.previewMode) return
    // Use provided index or current move index
    const targetIndex = index !== undefined ? index : this.state.currentMoveIndex
    // Load whole PV1 starting at target index into preview moves
    const pv1Moves = this.state.moves.getPv1(targetIndex)
    if (pv1Moves && pv1Moves.length > 0) {
      // Create new preview moves list
      this.state.previewMoves = new MoveList()

      // Add all PV1 moves
      pv1Moves.forEach(move => {
        this.state.previewMoves.addMove(move)
      })

      this.state.previewMode = true
      this.state.previewMoveIndex = 0 // Start at 0 for the first PV move
      this.checkAndRequestCurrentMoveAnalysis()
      this.notify()
    }
  }

  exitPreviewMode(notify = true) {
    if (!this.state.previewMode) return
    this.state.previewMode = false
    this.state.previewMoves = new MoveList() // Clear preview moves
    this.state.previewMoveIndex = 0
    // Clear preview comments when exiting preview
    this.state.commentsPreview = []
    if (notify) this.notify()
  }

  // --- Preview Move Management ---
  addPreviewMove(move: Move) {
    if (!this.state.previewMode) {
      // If not in preview mode, enter it first
      this.enterPreviewMode()
    }

    // Add move to preview moves
    this.state.previewMoves.addMove(move)

    // Set preview move index to the newly added move
    this.state.previewMoveIndex = this.state.previewMoves.getLength() - 1

    // Request analysis for the new move
    if (!move.isAnalyzed) {
      this.requestMoveAnalysis(move)
    }

    this.notify()
  }

  enterPreviewModeWithMove(move: Move) {
    // Create new preview moves list with ONLY the new move
    this.state.previewMoves = new MoveList()

    // Add only the new move (not the entire mainline)
    this.state.previewMoves.addMove(move)

    // Enter preview mode
    this.state.previewMode = true
    this.state.previewMoveIndex = 0 // Show the played move (first and only move)

    // Request analysis for the new move
    if (!move.isAnalyzed) {
      this.requestMoveAnalysis(move)
    }

    this.notify()
  }

  clearPreviewMovesFromIndex(index: number) {
    if (!this.state.previewMode) return

    // Get current preview moves
    const currentMoves = this.state.previewMoves.getMainlineMoves()

    // Keep only moves up to the specified index
    const movesToKeep = currentMoves.slice(0, index)

    // Create new preview moves list
    this.state.previewMoves = new MoveList()
    movesToKeep.forEach(move => {
      this.state.previewMoves.addMove(move)
    })

    // Ensure preview move index is within bounds
    if (this.state.previewMoveIndex >= this.state.previewMoves.getLength()) {
      this.state.previewMoveIndex = this.state.previewMoves.getLength() - 1
    }

    this.notify()
  }

  loadPvToPreview(pvMoves: Move[], upToIndex: number) {
    if (!this.state.previewMode) {
      // If not in preview mode, enter it first
      this.enterPreviewMode()
    }

    // Create new preview moves list
    this.state.previewMoves = new MoveList()

    // Add mainline moves up to current index
    const mainlineMoves = this.state.moves.getMainlineMoves().slice(0, this.state.currentMoveIndex)
    mainlineMoves.forEach(move => {
      this.state.previewMoves.addMove(move)
    })

    // Add PV moves up to the specified index
    const pvMovesToAdd = pvMoves.slice(0, upToIndex + 1)
    pvMovesToAdd.forEach(move => {
      this.state.previewMoves.addMove(move)
    })

    // Set preview move index to current move index (doesn't change)
    this.state.previewMoveIndex = this.state.currentMoveIndex

    this.notify()
  }

  setPreviewMoveIndex(index: number) {
    if (this.state.previewMode && index >= 0 && index < this.state.previewMoves.getLength()) {
      this.state.previewMoveIndex = index
      this.notify()
    }
  }

  // --- Backend interaction ---
  connectToSession(sessionId: string) {
    this.state.isLoaded = false
    this.state.pgnHeaders = null
    this.state.moves = new MoveList()
    this.state.currentMoveIndex = 0
    this.state.previewMode = false
    this.state.previewMoves = new MoveList()
    this.state.previewMoveIndex = 0
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
    webSocketService.disconnect()
    this.state.isWsConnected = false
    this.state.isLoaded = false
    this.state.isAnalysisInProgress = false
    this.state.analysisProgress = 0
    this.state.isFullyAnalyzed = false
    this.state.pgnHeaders = null
    this.state.moves = new MoveList()
    this.state.previewMoves = new MoveList()
    this.state.currentMoveIndex = 0
    this.state.previewMode = false
    this.state.previewMoveIndex = 0
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
        // analysis update
        if (analysisPayload.move.context == "mainline") {
          // Update mainline moves (annotation is now handled in MoveList)
          this.state.moves.handleWsNodeAnalysisUpdatePayload(analysisPayload)
        } else {
          // Update preview moves (annotation is now handled in MoveList)
          this.state.previewMoves.handleWsNodeAnalysisUpdatePayload(analysisPayload)
        }

        // Try to resolve any pending comments
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
        const commentPayload = srvMsg.payload as CommentUpdateServerPayload
        // Map moveId to moveIndex
        const moveIndex = this.state.moves.findMoveIndexById(commentPayload.moveId)
        //
        if (moveIndex !== -1) {
          const commentItem = { moveId: commentPayload.moveId, moveIndex, text: commentPayload.text }
          if (commentPayload.context === 'preview') {
            this.state.commentsPreview = [...this.state.commentsPreview, commentItem]
          } else {
            this.state.commentsMainline = [...this.state.commentsMainline, commentItem]
          }
          this.notify()
        } else {
          // Buffer until moves are available
          this.state.pendingComments.push({ moveId: commentPayload.moveId, context: commentPayload.context, text: commentPayload.text })
        }
        break

      case ServerWsMessageType.AI_COMMENT_UPDATE:
        const aiPayload = srvMsg.payload as AiCommentUpdateServerPayload
        {
          const idx = this.state.moves.findMoveIndexById(aiPayload.moveId)
          if (idx !== -1) {
            this.state.aiComments = [...this.state.aiComments, { moveId: aiPayload.moveId, moveIndex: idx, context: aiPayload.context, data: aiPayload.data }]
            // Build a text string from AI JSON
            try {
              const summary = String(aiPayload.data?.summary || '')
              const bullets = Array.isArray(aiPayload.data?.bullets) ? (aiPayload.data.bullets as unknown[]).map(String) : []
              const text = [summary, ...bullets.map(b => `- ${b}`)].filter(Boolean).join('\n')
              const commentItem = { moveId: aiPayload.moveId, moveIndex: idx, text }
              if (aiPayload.context === 'preview') {
                this.state.commentsPreview = [...this.state.commentsPreview, commentItem]
              } else {
                this.state.commentsMainline = [...this.state.commentsMainline, commentItem]
              }
            } catch { }
            // Clear generation status if lingering (immutable update)
            if (this.state.aiGeneration[aiPayload.moveId]) {
              const nextGen = { ...this.state.aiGeneration }
              delete nextGen[aiPayload.moveId]
              this.state.aiGeneration = nextGen
            }
            this.notify()
          }
        }
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
        this.notify()
        break

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
    return this.state.previewMode ? this.state.commentsPreview : this.state.commentsMainline
  }

  getCommentsMainline() {
    return this.state.commentsMainline
  }

  getCommentsPreview() {
    return this.state.commentsPreview
  }
  getMainlineMovesList() {
    return this.state.moves.getMainlineMoves()
  }

  getDisplayedMovesList() {
    if (this.state.previewMode) {
      // In preview mode, show mainline moves up to current index
      return this.state.moves.getMainlineMoves().slice(0, this.state.currentMoveIndex + 1)
    } else {
      // In normal mode, show all mainline moves
      return this.state.moves.getMainlineMoves()
    }
  }

  getDisplayedPreviewMovesList() {
    if (this.state.previewMode) {
      // In preview mode, show preview moves
      return this.state.previewMoves.getMainlineMoves()
    } else {
      // In normal mode, return empty array since MoveList handles PV display directly
      return []
    }
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

  // --- Preview accessors ---
  getPreviewPosition(index: number) {
    return this.state.previewMoves.getCurrentPosition(index)
  }

  getPreviewCaptures(index: number) {
    return this.state.previewMoves.getCapturesForMove(index)
  }

  updateMoveAnnotations(updatedMoves: MoveList) {
    this.state.moves = updatedMoves
    this.notify()
  }

  // --- ID Management ---
  getNextId(): number {
    return getNextAvailableId(this.state.moves, this.state.previewMoves)
  }

  // Resolve buffered comments that arrived before moves were present
  private _flushPendingComments() {
    if (this.state.pendingComments.length === 0) return
    const remaining: typeof this.state.pendingComments = []
    for (const pending of this.state.pendingComments) {
      const idx = this.state.moves.findMoveIndexById(pending.moveId)
      if (idx !== -1) {
        const commentItem = { moveId: pending.moveId, moveIndex: idx, text: pending.text }
        if (pending.context === 'preview') {
          this.state.commentsPreview = [...this.state.commentsPreview, commentItem]
        } else {
          this.state.commentsMainline = [...this.state.commentsMainline, commentItem]
        }
      } else {
        remaining.push(pending)
      }
    }
    this.state.pendingComments = remaining
  }

  enterPreviewModeWithPvSequence(pvSequence: Move[], startIndex: number = 0) {
    // Create new preview moves list with mainline moves up to start index
    this.state.previewMoves = createMoveList()

    // Add the entire PV sequence
    pvSequence.forEach(move => {
      this.state.previewMoves.addMove(move)
    })

    // Enter preview mode
    this.state.previewMode = true
    this.state.previewMoveIndex = startIndex // Point to the first PV move

    this.notify()
  }

  addPvSequenceToPreview(pvSequence: Move[], startIndex: number) {
    if (!this.state.previewMode) return

    // Clear any moves after the start index
    this.clearPreviewMovesFromIndex(startIndex + 1)

    // Add the entire PV sequence
    pvSequence.forEach(move => {
      this.state.previewMoves.addMove(move)
    })

    // Set preview move index to the first PV move
    this.state.previewMoveIndex = startIndex + 1

    // Request analysis for all PV moves
    pvSequence.forEach(move => {
      if (!move.isAnalyzed) {
        this.requestMoveAnalysis(move)
      }
    })

    this.notify()
  }
}
