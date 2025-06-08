import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { Chess } from 'chess.js'

import webSocketService from '../services/WebSocketService'
import { GameState } from '../types/GameState'
import {
  ServerWsMessage,
  ClientWsMessageType,
  ServerWsMessageType,
  SessionMetadataServerPayload,
  ErrorServerPayload,
  MoveListServerPayload,
  NodeAnalysisUpdatePayload,
  AnalysisProgressServerPayload,
  FullAnalysisCompleteServerPayload,
} from '../types/WebSocketMessages'
import { Move } from '@/types/chess/Move'
import { PgnHeaders } from '@/types/chess/PgnHeaders'

interface GameStateContextType {
  gameState: GameState

  setIsLoaded: (isLoaded: boolean) => void
  setMoves: (moves: Move[]) => void
  setMovePvs: (moveIndex: number, pvs: Move[][]) => void
  setCurrentMoveIndex: (index: number) => void
  setPgnHeaders: (headers: PgnHeaders | null) => void
  setIsWsConnected: (isConnected: boolean) => void
  setWsError: (error: string | null) => void
  setGameInstance: (game: Chess) => void

  resetGameState: () => void // Resetter

  // WebSocket related actions
  connectToAnalysisSession: (sessionId: string) => void
  disconnectAnalysisSession: () => void
  requestPgnHeaders: () => void
  requestMoveList: () => void
  requestMoveAnalysis: (move: Move) => void
  requestFullGameAnalysis: () => void // New

  // Preview related actions
  setPreviewMode: (previewMode: boolean) => void
  setPreviewMoves: (previewMoves: Move[]) => void
  setPreviewPvs: (pvs: Record<number, Move[][]>) => void
  setPreviewMoveIndex: (index: number) => void
  addPreviewMove: (move: Move) => void

  // Annotation related actions
  updateMoveAnnotations: (updatedMoves: Move[]) => void
  updateMoveAnnotation: (moveIndex: number, annotation: string) => void
}

export const initialGameState: GameState = {
  game: new Chess(),
  isLoaded: false,
  moves: [],
  movePvs: {},
  currentMoveIndex: 0,
  pgnHeaders: null,
  isWsConnected: false,
  wsError: null,
  previewMode: false,
  previewMoves: [],
  previewMovePvs: {},
  previewMoveIndex: 0,
  // New analysis states
  isAnalysisInProgress: false,
  analysisProgress: 0,
  isFullyAnalyzed: false,
}

const GameStateContext = createContext<GameStateContextType | undefined>(
  undefined
)

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState)

  // --- Granular Setters ---
  const setIsLoaded = useCallback((isLoaded: boolean) => {
    setGameState((prev) => ({ ...prev, isLoaded }))
  }, [])

  const setMoves = useCallback((moves: Move[]) => {
    setGameState((prev) => ({ ...prev, moves }))
  }, [])

  const setMovePvs = useCallback((moveIndex: number, pvs: Move[][]) => {
    setGameState((prev) => ({
      ...prev,
      movePvs: { ...prev.movePvs, [moveIndex]: pvs },
    }))
  }, [])

  const setCurrentMoveIndex = useCallback((index: number) => {
    setGameState((prev) => ({ ...prev, currentMoveIndex: index }))
  }, [])

  const setPgnHeaders = useCallback((headers: PgnHeaders | null) => {
    setGameState((prev) => ({ ...prev, pgnHeaders: headers }))
  }, [])

  const setIsWsConnected = useCallback((isConnected: boolean) => {
    setGameState((prev) => ({ ...prev, isWsConnected: isConnected }))
  }, [])

  const setWsError = useCallback((error: string | null) => {
    setGameState((prev) => ({ ...prev, wsError: error }))
  }, [])

  const setGameInstance = useCallback((game: Chess) => {
    setGameState((prev) => ({ ...prev, game }))
  }, [])

  const resetGameState = useCallback(() => {
    setGameState(initialGameState)
    // Also consider disconnecting WebSocket if a full reset implies ending the session
    if (webSocketService.isConnected()) {
      webSocketService.disconnect()
    }
  }, [])

  const setPreviewMode = (previewMode: boolean) => {
    setGameState((prev) => ({
      ...prev,
      previewMode,
      ...(previewMode === false && {
        previewMoves: [],
        previewStartIndex: null,
        previewFen: null,
      }),
    }))
  }

  const setPreviewMoves = (previewMoves: Move[]) => {
    setGameState((prev) => ({
      ...prev,
      previewMoves,
    }))
  }

  const setPreviewPvs = (pvs: Record<number, Move[][]>) => {
    setGameState((prev) => ({
      ...prev,
      previewMovePvs: pvs,
    }))
  }

  const addPreviewMove = (move: Move) => {
    setGameState((prev) => ({
      ...prev,
      previewMoves: [...prev.previewMoves, move],
    }))
  }

  const setPreviewMoveIndex = (index: number) => {
    setGameState((prev) => ({
      ...prev,
      previewMoveIndex: index,
    }))
  }

  // --- Annotation Functions ---
  const updateMoveAnnotation = useCallback(
    (moveIndex: number, annotation: string) => {
      setGameState((prev) => {
        const newMoves = [...prev.moves]
        if (moveIndex >= 0 && moveIndex < newMoves.length) {
          newMoves[moveIndex] = {
            ...newMoves[moveIndex],
            annotation,
          }
        }
        return { ...prev, moves: newMoves }
      })
    },
    []
  )

  const updateMoveAnnotations = useCallback((updatedMoves: Move[]) => {
    setGameState((prevState) => ({
      ...prevState,
      moves: updatedMoves,
    }))
  }, [])

  const requestPgnHeaders = useCallback(() => {
    webSocketService.sendMessage({
      type: ClientWsMessageType.GET_SESSION_METADATA,
    })
  }, [])

  const requestMoveList = useCallback(() => {
    webSocketService.sendMessage({
      type: ClientWsMessageType.GET_MOVE_LIST,
    })
  }, [])

  const requestMoveAnalysis = useCallback((move: Move) => {
    webSocketService.sendMessage({
      type: ClientWsMessageType.GET_DETAILED_ANALYSIS,
      payload: { move: move },
    })
  }, [])

  // New function for full game analysis
  const requestFullGameAnalysis = useCallback(() => {
    if (gameState.isAnalysisInProgress) return

    setGameState((prev) => ({
      ...prev,
      isAnalysisInProgress: true,
      analysisProgress: 0,
    }))

    webSocketService.sendMessage({
      type: ClientWsMessageType.GET_GAME_ANALYSIS,
    })
  }, [gameState.isAnalysisInProgress])

  // --- WebSocket Event Handlers ---
  const handleWsOpen = useCallback(() => {
    setIsWsConnected(true)
    setWsError(null)

    requestPgnHeaders()
    requestMoveList()
  }, [requestMoveList, requestPgnHeaders, setIsWsConnected, setWsError])

  const handleWsMessage = useCallback(
    (srvMsg: ServerWsMessage) => {
      switch (srvMsg.type) {
        case ServerWsMessageType.ERROR:
          const errorPayload = srvMsg.payload as ErrorServerPayload
          console.error('WebSocket error:', errorPayload)
          setWsError(errorPayload.message)
          setIsLoaded(false)
          // Reset analysis state on error
          setGameState((prev) => ({
            ...prev,
            isAnalysisInProgress: false,
            analysisProgress: 0,
          }))
          break

        case ServerWsMessageType.SESSION_METADATA:
          const metadataPayload = srvMsg.payload as SessionMetadataServerPayload
          setPgnHeaders(metadataPayload.headers)
          setIsLoaded(true)
          setWsError(null)
          break

        case ServerWsMessageType.MOVE_LIST:
          const moveListPayload = srvMsg.payload as MoveListServerPayload
          setMoves(moveListPayload.moveList)
          setIsLoaded(true)
          setWsError(null)
          break

        case ServerWsMessageType.ANALYSIS_UPDATE:
          const analysisPayload = srvMsg.payload as NodeAnalysisUpdatePayload
          setGameState((prevGameState) => {
            const isPreview = prevGameState.previewMode
            const currentMoves = isPreview
              ? prevGameState.previewMoves
              : prevGameState.moves

            const moveIndex = currentMoves.findIndex(
              (move) => move.position === analysisPayload.move.position
            )

            if (moveIndex === -1) {
              console.warn(
                'ANALYSIS_UPDATE: Could not find move to update with FEN:',
                analysisPayload.move.position
              )
              return prevGameState
            }

            const newMoves = [...currentMoves]
            const newMovePvs = { ...prevGameState.movePvs }

            newMoves[moveIndex] = analysisPayload.move
            if (analysisPayload.pvs) {
              newMovePvs[moveIndex] = analysisPayload.pvs
            }

            if (isPreview) {
              return {
                ...prevGameState,
                previewMoves: newMoves,
                previewMovePvs: newMovePvs,
              }
            } else {
              return {
                ...prevGameState,
                moves: newMoves,
                movePvs: newMovePvs,
              }
            }
          })
          break

        // New case for analysis progress
        case ServerWsMessageType.ANALYSIS_PROGRESS:
          const progressPayload =
            srvMsg.payload as AnalysisProgressServerPayload
          setGameState((prev) => ({
            ...prev,
            analysisProgress: progressPayload.percentage,
          }))
          break

        // New case for full analysis completion
        case ServerWsMessageType.FULL_ANALYSIS_COMPLETE:
          const completePayload =
            srvMsg.payload as FullAnalysisCompleteServerPayload

          setGameState((prev) => ({
            ...prev,
            moves: completePayload.moves,
            movePvs: completePayload.pvs,
            isAnalysisInProgress: false,
            analysisProgress: 100,
            isFullyAnalyzed: true,
          }))
          break

        default:
          console.warn('Received unknown WS message type:', srvMsg.type)
      }
    },
    [setPgnHeaders, setIsLoaded, setWsError, setMoves]
  )

  const handleWsError = useCallback(() => {
    setIsWsConnected(false)
    setWsError('WebSocket connection error.')
    setIsLoaded(false)
    // Reset analysis state on connection error
    setGameState((prev) => ({
      ...prev,
      isAnalysisInProgress: false,
      analysisProgress: 0,
    }))
  }, [setIsWsConnected, setWsError, setIsLoaded])

  const handleWsClose = useCallback(() => {
    setIsWsConnected(false)
    setIsLoaded(false)
  }, [setIsWsConnected, setIsLoaded])

  // --- WebSocket Actions ---
  const connectToAnalysisSession = useCallback(
    (sessionId: string) => {
      setPgnHeaders(null)
      setMoves(initialGameState.moves)
      setCurrentMoveIndex(0)
      setIsLoaded(false)
      setWsError(null)

      webSocketService.connect(sessionId, {
        onOpen: handleWsOpen,
        onMessage: handleWsMessage,
        onError: handleWsError,
        onClose: handleWsClose,
      })
    },
    [
      handleWsOpen,
      handleWsMessage,
      handleWsError,
      handleWsClose,
      setPgnHeaders,
      setMoves,
      setCurrentMoveIndex,
      setIsLoaded,
      setWsError,
    ]
  )

  const disconnectAnalysisSession = useCallback(() => {
    webSocketService.disconnect()
    setIsWsConnected(false)
    setIsLoaded(false)
    setPgnHeaders(null)
  }, [setIsWsConnected, setIsLoaded, setPgnHeaders])

  useEffect(() => {
    return () => {
      webSocketService.disconnect()
    }
  }, [])

  return (
    <GameStateContext.Provider
      value={{
        gameState,
        setIsLoaded,
        setMoves,
        setMovePvs,
        setCurrentMoveIndex,
        setPgnHeaders,
        setIsWsConnected,
        setWsError,
        setGameInstance,
        resetGameState,
        connectToAnalysisSession,
        disconnectAnalysisSession,
        requestPgnHeaders,
        requestMoveList,
        requestMoveAnalysis,
        requestFullGameAnalysis, // New
        setPreviewMode,
        setPreviewMoves,
        setPreviewPvs,
        setPreviewMoveIndex,
        addPreviewMove,
        updateMoveAnnotations,
        updateMoveAnnotation,
      }}
    >
      {children}
    </GameStateContext.Provider>
  )
}

export const useGameState = (): GameStateContextType => {
  const context = useContext(GameStateContext)
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider')
  }
  return context
}
