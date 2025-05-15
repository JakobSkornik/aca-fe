import { MoveAnalysisNode } from '../AnalysisResult'

export interface NodeProps {
  node: MoveAnalysisNode
  diameter: number
  depth?: number
  color?: string
}
