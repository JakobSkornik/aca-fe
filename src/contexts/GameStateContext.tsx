import React, { createContext, useContext, useState } from 'react'
import { Chess } from 'chess.js'
import { CaptureCount } from '../types/AnalysisResult'
import { GameState } from '../types/GameState'
import { GameStateContextType } from '../types/GameStateContextType'

const defaultCaptureCount: CaptureCount = {
  p: 0,
  n: 0,
  b: 0,
  r: 0,
  q: 0,
  k: 0,
}

const initialGameState: GameState = {
  game: new Chess(),
  isLoaded: false,
  moves: [
    {
      move: '',
      position: 'start',
      shallow_score: 0,
      deep_score: 0,
      bestContinuations: [],
      capturedByWhite: defaultCaptureCount,
      capturedByBlack: defaultCaptureCount,
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
