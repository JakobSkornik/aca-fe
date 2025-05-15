import { GameState } from './GameState'

export type GameStateContextType = {
  gameState: GameState
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
}
