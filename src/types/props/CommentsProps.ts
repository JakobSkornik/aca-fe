import { Move, MoveAnalysisNode } from '../ws'

export type CommentsProps = {
  moves: Move[]
  moveTree: Record<number, MoveAnalysisNode>
  currentMoveIndex: number
}
