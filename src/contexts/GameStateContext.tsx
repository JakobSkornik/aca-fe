import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { GameStateManager, GameStateSnapshot } from './GameStateManager'

interface GameStateContextType {
  state: GameStateSnapshot
  manager: GameStateManager
}

const GameStateContext = createContext<GameStateContextType | null>(null)

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const managerRef = useRef<GameStateManager>(null)
  if (!managerRef.current) {
    managerRef.current = new GameStateManager()
  }
  const manager = managerRef.current
  const [state, setState] = useState<GameStateSnapshot>(manager.getState())

  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      setState(manager.getState())
    })
    return unsubscribe
  }, [manager])

  return (
    <GameStateContext.Provider value={{ state, manager }}>
      {children}
    </GameStateContext.Provider>
  )
}

export const useGameState = (): GameStateContextType => {
  const context = useContext(GameStateContext)
  if (context === null) {
    throw new Error('useGameState must be used within a GameStateProvider')
  }
  return context
}
