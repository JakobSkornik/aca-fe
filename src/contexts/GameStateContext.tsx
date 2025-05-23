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
  TraceTreeNodePayload,
  RequestTraceTreeClientPayload,
} from '../types/WebSocketMessages'
import { Move, MoveAnalysisNode } from '@/types/ws'
import { PgnHeaders } from '@/types/PgnHeaders'

interface GameStateContextType {
  gameState: GameState

  setIsLoaded: (isLoaded: boolean) => void
  setMoves: (moves: Move[]) => void
  setCurrentMoveIndex: (index: number) => void
  setMoveTree: (tree: Record<number, MoveAnalysisNode>) => void
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
  requestTraceTree: (mainlineMoves: Move[]) => void

  // Preview related actions
  setPreviewMode: (previewMode: boolean) => void
  setPreviewMoves: (previewMoves: Move[]) => void
  setPreviewMoveIndex: (index: number) => void
  addPreviewMove: (move: Move) => void
}

export const initialGameState: GameState = {
  game: new Chess(),
  isLoaded: false,
  moves: [],
  currentMoveIndex: 0,
  moveTree: {},
  pgnHeaders: null,
  isWsConnected: false,
  wsError: null,
  previewMode: false,
  previewMoves: [],
  previewMoveIndex: 0,
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

  const setCurrentMoveIndex = useCallback((index: number) => {
    setGameState((prev) => ({ ...prev, currentMoveIndex: index }))
  }, [])

  const setMoveTree = useCallback((tree: Record<number, MoveAnalysisNode>) => {
    setGameState((prev) => ({ ...prev, moveTree: tree }))
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

  const requestTraceTree = useCallback(
    (mainlineMoves: Move[]) => {
      if (webSocketService.isConnected()) {
        const payload: RequestTraceTreeClientPayload = { mainlineMoves }
        webSocketService.sendMessage({
          type: ClientWsMessageType.GET_TRACE_TREE,
          payload,
        })
        // Clear existing tree when a new request is made
        setMoveTree({})
      } else {
        console.warn('Cannot request trace tree: WebSocket not connected.')
      }
    },
    [setMoveTree]
  )

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
            const newMoves = prevGameState.previewMode
              ? [...prevGameState.previewMoves]
              : [...prevGameState.moves]

            const moveIndex = newMoves.findIndex(
              (move) => move.position === analysisPayload.move.position
            )

            if (moveIndex !== -1) {
              newMoves[moveIndex] = analysisPayload.move
            }

            if (prevGameState.previewMode) {
              return {
                ...prevGameState,
                previewMoves: newMoves,
              }
            }
            return { ...prevGameState, moves: newMoves }
          })
          break
        case ServerWsMessageType.TRACE_TREE_NODE_BATCH:
          const tracePayload = srvMsg.payload as TraceTreeNodePayload
          const nodes = tracePayload.nodes as MoveAnalysisNode[]

          // Process the batch of nodes
          setGameState((prev) => {
            // Create a new tree object with all existing nodes
            const updatedTree = { ...prev.moveTree }

            // Add each node from the batch to the tree
            nodes.forEach((node) => {
              updatedTree[node.id] = node
            })

            return {
              ...prev,
              moveTree: updatedTree,
            }
          })
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
      setMoveTree({})
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
      setMoveTree,
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
        setCurrentMoveIndex,
        setMoveTree,
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
        requestTraceTree,
        setPreviewMode,
        setPreviewMoves,
        setPreviewMoveIndex,
        addPreviewMove,
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
