import { Chess } from 'chess.js'
import { Move, MoveAnalysisNode } from '../types/AnalysisResult'

export type GameState = {
  isLoaded: boolean
  game: Chess
  moves: Move[]
  currentMoveIndex: number
  moveTree: Record<string, MoveAnalysisNode> | null
}
