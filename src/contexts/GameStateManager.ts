import { Chess } from 'chess.js'
import { Move } from '../types/chess/Move'
import { PgnHeaders } from '../types/chess/PgnHeaders'
import { MoveList, createMoveList, getMainlineMoves, getMainlineMove, getPvMoves, getCurrentPosition, getCapturesForMove, getMoveAnnotation, getMoveEvaluation, hasPvMoves, getMainlineMoveCount, getPositionForIndex, canGoToNext, canGoToPrevious, getNextMoveIndex, getPreviousMoveIndex, formatCapturesForDisplay, convertMoveArrayToMoveList, integratePvsIntoMoveList, getNextAvailableId } from '../helpers/moveListUtils'
import webSocketService from '../services/WebSocketService'
import { ClientWsMessageType, ServerWsMessage, ServerWsMessageType, SessionMetadataServerPayload, ErrorServerPayload, MoveListServerPayload, NodeAnalysisUpdatePayload, AnalysisProgressServerPayload, FullAnalysisCompleteServerPayload } from '../types/WebSocketMessages'
import { CaptureCount } from '../types/chess/CaptureCount'

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

  enterPreviewModeWithMove(move: Move, currentIndex: number) {
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
        this.notify()
        break

      case ServerWsMessageType.ANALYSIS_UPDATE:
        const analysisPayload = srvMsg.payload as NodeAnalysisUpdatePayload
        
        if (analysisPayload.move.context == "mainline") {
          // Update mainline moves (annotation is now handled in MoveList)
          this.state.moves.handleWsNodeAnalysisUpdatePayload(analysisPayload)
        } else {
          // Update preview moves (annotation is now handled in MoveList)
          this.state.previewMoves.handleWsNodeAnalysisUpdatePayload(analysisPayload)
        }

        this.notify()
        break

      case ServerWsMessageType.ANALYSIS_PROGRESS:
        const progressPayload = srvMsg.payload as AnalysisProgressServerPayload
        this.state.analysisProgress = progressPayload.percentage
        this.notify()
        break

      case ServerWsMessageType.FULL_ANALYSIS_COMPLETE:
        const completePayload = srvMsg.payload as FullAnalysisCompleteServerPayload
        const convertedMoves = convertMoveArrayToMoveList(completePayload.moves)
        const finalMoves = completePayload.pvs ? integratePvsIntoMoveList(convertedMoves, completePayload.pvs) : convertedMoves
        
        // Apply classifications to the new move list
        finalMoves.applyClassificationsToAllMoves()
        
        this.state.moves = finalMoves
        this.state.isAnalysisInProgress = false
        this.state.analysisProgress = 100
        this.state.isFullyAnalyzed = true
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

  // --- Utility accessors for UI ---
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
    return this.state.moves.getCurrentPosition(index)
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