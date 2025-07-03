import { Chess } from 'chess.js'
import { Move } from '../types/chess/Move'
import { PgnHeaders } from '../types/chess/PgnHeaders'
import { MoveList, createMoveList, addMainlineMove, getMainlineMove, getPvMoves, setPvMoves, updateMainlineMove, convertLegacyMoveList, findMoveIndexByPosition, findAnyMoveIndexByPosition, convertMoveArrayToMoveList, integratePvsIntoMoveList, getCurrentPosition, getCapturesForMove, getMoveAnnotation, getMoveEvaluation, hasPvMoves, getMainlineMoveCount, getPositionForIndex, canGoToNext, canGoToPrevious, getNextMoveIndex, getPreviousMoveIndex, formatCapturesForDisplay, getMainlineMoves } from '../helpers/moveListUtils'
import webSocketService from '../services/WebSocketService'
import { ClientWsMessageType, ServerWsMessage, ServerWsMessageType, SessionMetadataServerPayload, ErrorServerPayload, MoveListServerPayload, NodeAnalysisUpdatePayload, AnalysisProgressServerPayload, FullAnalysisCompleteServerPayload } from '../types/WebSocketMessages'
import { CaptureCount } from '../types/chess/CaptureCount'

export type GameStateSnapshot = {
  game: Chess
  isLoaded: boolean
  moves: MoveList
  currentMoveIndex: number
  pgnHeaders: PgnHeaders | null
  isWsConnected: boolean
  wsError: string | null
  isAnalysisInProgress: boolean
  isFullyAnalyzed: boolean
  analysisProgress: number
  previewMode: boolean
  previewMoves: MoveList
  previewMoveIndex: number
}

export class GameStateManager {
  private state: GameStateSnapshot
  private listeners: (() => void)[] = []
  private previewSnapshot: GameStateSnapshot | null = null

  constructor() {
    this.state = {
      game: new Chess(),
      isLoaded: false,
      moves: createMoveList(),
      currentMoveIndex: 0,
      pgnHeaders: null,
      isWsConnected: false,
      wsError: null,
      isAnalysisInProgress: false,
      isFullyAnalyzed: false,
      analysisProgress: 0,
      previewMode: false,
      previewMoves: createMoveList(),
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

  // --- Navigation ---
  moveNext() {
    if (canGoToNext(this.state.moves, this.state.currentMoveIndex)) {
      this.state.currentMoveIndex++
      this.notify()
    }
  }
  movePrev() {
    if (canGoToPrevious(this.state.currentMoveIndex)) {
      this.state.currentMoveIndex--
      this.notify()
    }
  }
  goToMove(index: number) {
    if (index >= 0 && index < getMainlineMoveCount(this.state.moves)) {
      this.state.currentMoveIndex = index
      this.notify()
    }
  }

  // --- PV Exploration ---
  getCurrentPvs(): Move[] {
    return getPvMoves(this.state.moves, this.state.currentMoveIndex)
  }
  goToPvMove(pvIndex: number) {
    // For now, treat as navigating to the first PV move at this position
    const pvs = this.getCurrentPvs()
    if (pvs && pvs[pvIndex]) {
      // Optionally, could update state to reflect PV exploration
      // For now, just notify
      this.notify()
    }
  }

  // --- Preview Mode ---
  enterPreviewMode() {
    if (!this.state.previewMode) {
      // Deep clone the mainline and index for restoration
      this.previewSnapshot = {
        ...this.state,
        moves: this.state.moves.map(moves => [...moves]),
        previewMoves: this.state.previewMoves.map(moves => [...moves]),
      }
      // Set previewMoves to mainline up to current index
      const mainlineUpTo = this.state.moves.slice(0, this.state.currentMoveIndex + 1).map(moves => [...moves])
      this.state.previewMoves = mainlineUpTo
      this.state.previewMoveIndex = this.state.currentMoveIndex
      this.state.previewMode = true
      this.notify()
    }
  }

  addPreviewMove(move: Move) {
    // Remove all moves after previewMoveIndex
    this.state.previewMoves = this.state.previewMoves.slice(0, this.state.previewMoveIndex + 1)
    // Add the new move as a new mainline move
    this.state.previewMoves.push([move])
    this.state.previewMoveIndex = this.state.previewMoves.length - 1
    this.notify()
  }

  setPreviewMoves(moves: MoveList, index: number) {
    this.state.previewMoves = moves.map(m => [...m])
    this.state.previewMoveIndex = index
    this.notify()
  }

  commitPreviewToMainline() {
    if (!this.state.previewMode) return
    // Replace mainline after preview start with previewMoves
    const previewStart = this.previewSnapshot ? this.previewSnapshot.currentMoveIndex : 0
    const newMainline = [
      ...this.state.moves.slice(0, previewStart + 1),
      ...this.state.previewMoves.slice(previewStart + 1)
    ]
    this.state.moves = newMainline
    this.state.currentMoveIndex = this.state.previewMoveIndex
    this.exitPreviewMode(false) // Don't notify twice
    this.notify()
  }

  exitPreviewMode(notify = true) {
    if (this.state.previewMode && this.previewSnapshot) {
      this.state = {
        ...this.previewSnapshot,
        previewMode: false
      }
      this.previewSnapshot = null
      if (notify) this.notify()
    }
  }

  // --- PV Preview Helper ---
  enterPvPreviewMode(mainlineIndex: number, pvIndex: number = 0) {
    if (!this.state.previewMode) {
      this.previewSnapshot = {
        ...this.state,
        moves: this.state.moves.map(moves => [...moves]),
        previewMoves: this.state.previewMoves.map(moves => [...moves]),
      }
    }
    // Mainline up to mainlineIndex
    const mainlineMoves = getMainlineMoves(this.state.moves).slice(0, mainlineIndex + 1)
    const previewMoves = createMoveList()
    mainlineMoves.forEach((move: any) => {
      previewMoves.push([move])
    })
    // Add the selected PV move for that index
    const pvs = getPvMoves(this.state.moves, mainlineIndex)
    if (pvs && pvs.length > pvIndex) {
      previewMoves.push([pvs[pvIndex]])
    }
    this.state.previewMoves = previewMoves
    this.state.previewMoveIndex = previewMoves.length - 1
    this.state.previewMode = true
    this.notify()
  }

  // --- Backend interaction ---
  connectToSession(sessionId: string) {
    this.state.isLoaded = false
    this.state.pgnHeaders = null
    this.state.moves = createMoveList()
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
    webSocketService.disconnect()
    this.state.isWsConnected = false
    this.state.isLoaded = false
    this.state.pgnHeaders = null
    this.notify()
  }
  requestMoveAnalysis(move: Move) {
    webSocketService.sendMessage({
      type: ClientWsMessageType.GET_DETAILED_ANALYSIS,
      payload: { move },
    })
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
        const moveList = convertLegacyMoveList(moveListPayload.moveList.map((move) => Array.isArray(move) ? move : [move]))
        this.state.moves = moveList
        this.state.isLoaded = true
        this.state.wsError = null
        this.notify()
        break
      case ServerWsMessageType.ANALYSIS_UPDATE:
        const analysisPayload = srvMsg.payload as NodeAnalysisUpdatePayload
        // Always update mainline moves
        let mainlineMoveIdx = findAnyMoveIndexByPosition(this.state.moves, analysisPayload.move.position)
        let newMainMoves = [...this.state.moves]
        if (mainlineMoveIdx) {
          const [mainIdx, mainSubIdx] = mainlineMoveIdx
          let updatedMainMoves = [...newMainMoves[mainIdx]]
          updatedMainMoves[mainSubIdx] = analysisPayload.move
          newMainMoves[mainIdx] = updatedMainMoves
          if (analysisPayload.pvs && analysisPayload.pvs.length > 0) {
            const flattenedPvs = analysisPayload.pvs.flat()
            newMainMoves = setPvMoves(newMainMoves, mainIdx, flattenedPvs)
          }
        } else {
          // Append as new mainline move
          newMainMoves.push([analysisPayload.move])
        }
        this.state.moves = newMainMoves
        // If in preview mode, also update previewMoves if the move exists, or append if not
        if (this.state.previewMode) {
          let previewMoveIdx = findAnyMoveIndexByPosition(this.state.previewMoves, analysisPayload.move.position)
          let newPreviewMoves = [...this.state.previewMoves]
          if (previewMoveIdx) {
            const [prevIdx, prevSubIdx] = previewMoveIdx
            let updatedPreviewMoves = [...newPreviewMoves[prevIdx]]
            updatedPreviewMoves[prevSubIdx] = analysisPayload.move
            newPreviewMoves[prevIdx] = updatedPreviewMoves
            if (analysisPayload.pvs && analysisPayload.pvs.length > 0) {
              const flattenedPvs = analysisPayload.pvs.flat()
              newPreviewMoves = setPvMoves(newPreviewMoves, prevIdx, flattenedPvs)
            }
          } else {
            // Append as new preview move
            newPreviewMoves.push([analysisPayload.move])
          }
          this.state.previewMoves = newPreviewMoves
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
  getMainlineMovesList() { return getMainlineMoves(this.state.moves) }
  getMainlineMove(index: number) { return getMainlineMove(this.state.moves, index) }
  getPvMoves(index: number) { return getPvMoves(this.state.moves, index) }
  getCurrentPosition(index: number) { return getCurrentPosition(this.state.moves, index) }
  getCapturesForMove(index: number) { return getCapturesForMove(this.state.moves, index) }
  getMoveAnnotation(index: number) { return getMoveAnnotation(this.state.moves, index) }
  getMoveEvaluation(index: number) { return getMoveEvaluation(this.state.moves, index) }
  hasPvMoves(index: number) { return hasPvMoves(this.state.moves, index) }
  getMainlineMoveCount() { return getMainlineMoveCount(this.state.moves) }
  formatCapturesForDisplay(captures: CaptureCount | undefined, isWhitePerspective: boolean) { return formatCapturesForDisplay(captures, isWhitePerspective) }

  // --- Preview accessors ---
  getPreviewPosition(index: number) {
    return getCurrentPosition(this.state.previewMoves, index)
  }
  getPreviewCaptures(index: number) {
    return getCapturesForMove(this.state.previewMoves, index)
  }

  updateMoveAnnotations(updatedMoves: MoveList) {
    this.state.moves = updatedMoves;
    this.notify();
  }
} 