import { Chess } from 'chess.js'
import { Move, MoveAnalysisNode } from './ws'
import { PgnHeaders } from './PgnHeaders'

export type GameState = {
  game: Chess
  isLoaded: boolean
  moves: Move[]
  currentMoveIndex: number
  moveTree: Record<number, MoveAnalysisNode>
  pgnHeaders: PgnHeaders | null
  isWsConnected: boolean
  wsError: string | null

  previewMode: boolean
  previewMoves: Move[]
  previewMoveIndex: number
}
