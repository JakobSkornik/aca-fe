import { MoveAnalysisNode } from '@/types/AnalysisResult'
import { MoveTreeConfig } from '@/types/MoveTreeConfig'

export function getNodeColor(node: MoveAnalysisNode, config: MoveTreeConfig) {
  if (node.move === 'start') return '#e0e0e0'

  // if (node.context === 'pv') return config.nodeColors.pv
  // if (node.context === 'alternative') return config.nodeColors.alternative
  if (node.context === 'mainline') {
    return node.depth % 2 === 1
      ? config.nodeColors.mainlineWhite
      : config.nodeColors.mainlineBlack
  }
  return node.depth % 2 === 1
    ? config.nodeColors.white
    : config.nodeColors.black
}
