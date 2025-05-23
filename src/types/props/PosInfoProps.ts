import { MoveAnalysisNode } from '../ws'

export interface PosInfoProps {
  node: MoveAnalysisNode | null
  tree: Record<number, MoveAnalysisNode>
  compareNode?: MoveAnalysisNode | null
  onClose?: () => void
  highlight?: boolean
}
