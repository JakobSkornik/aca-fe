import { MoveAnalysisNode } from '../AnalysisResult'

export interface PosInfoProps {
  node: MoveAnalysisNode | null
  tree: Record<number, MoveAnalysisNode>
  compareNode?: MoveAnalysisNode | null
  onClose?: () => void
  highlight?: boolean
}
