import { MoveAnalysisNode } from '../ws'

export type CommentsProps = {
  moveTree: Record<number, MoveAnalysisNode>
  currentMoveIndex: number
}
