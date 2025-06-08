import { Chess } from 'chess.js'
import { Move } from './chess/Move'
import { PgnHeaders } from './chess/PgnHeaders'

export type GameState = {
  game: Chess
  isLoaded: boolean
  moves: Move[]
  movePvs: Record<number, Move[][]>
  currentMoveIndex: number
  pgnHeaders: PgnHeaders | null
  isWsConnected: boolean
  wsError: string | null

  isAnalysisInProgress: boolean
  isFullyAnalyzed: boolean
  analysisProgress: number

  previewMode: boolean
  previewMoves: Move[]
  previewMovePvs: Record<number, Move[][]>
  previewMoveIndex: number
}
