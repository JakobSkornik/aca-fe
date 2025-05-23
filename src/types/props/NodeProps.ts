import { MoveAnalysisNode } from '../ws'

export interface NodeProps {
  node: MoveAnalysisNode
  diameter: number
  depth?: number
  color?: string
}
