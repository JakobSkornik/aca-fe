import { Chess } from 'chess.js'
import { Move } from './chess/Move'
import { PgnHeaders } from './chess/PgnHeaders'
import { MoveList } from '../helpers/moveListUtils'

export type GameState = {
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
