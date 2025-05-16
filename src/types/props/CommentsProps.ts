import { MoveAnalysisNode } from '../AnalysisResult'

export type CommentsProps = {
  moveTree: Record<number, MoveAnalysisNode>
  currentMoveIndex: number
}
