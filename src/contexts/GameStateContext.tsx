import React, { createContext, useContext, useState } from 'react'
import { Chess } from 'chess.js'

type Move = {
  move: string
  comment: string
  position: string
  score: number
  bestContinuations: string[]
  capturedByWhite: Record<string, number>
  capturedByBlack: Record<string, number>
}

type MoveAnalysisNode = {
  id: number
  depth: number
  parent: number
  move: string
  fen: string
  shallow_score: number
  deep_score: number
  trace: Record<string, Record<string, number>>
}

type GameState = {
  isLoaded: boolean
  isAnnotated: boolean
  game: Chess
  moves: Move[]
  currentMoveIndex: number
  // Add moveTree attribute to hold our move graph.
  moveTree: Record<number, MoveAnalysisNode> | null
}

type GameStateContextType = {
  gameState: GameState
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
}

const initialGameState: GameState = {
  game: new Chess(),
  isLoaded: false,
  isAnnotated: false,
  moves: [
    {
      move: '',
      position: 'start',
      comment: '',
      score: 0,
      bestContinuations: [],
      capturedByWhite: {},
      capturedByBlack: {},
    },
  ],
  currentMoveIndex: 0,
  moveTree: null, // initially no move tree is loaded
}

const GameStateContext = createContext<GameStateContextType | undefined>(
  undefined
)

export const GameStateProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [gameState, setGameState] = useState(initialGameState)

  return (
    <GameStateContext.Provider value={{ gameState, setGameState }}>
      {children}
    </GameStateContext.Provider>
  )
}

export const useGameState = () => {
  const context = useContext(GameStateContext)
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider')
  }
  return context
}
