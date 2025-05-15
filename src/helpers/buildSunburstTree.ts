import { getNodeColor } from './getNodeColor'
import { MoveAnalysisNode } from '@/types/AnalysisResult'
import { MoveTreeConfig } from '@/types/MoveTreeConfig'

// Helper: count leaves in the subtree rooted at node
function countLeaves(
  node: MoveAnalysisNode,
  moveTree: Record<number, MoveAnalysisNode>
): number {
  const children = Object.values(moveTree).filter(
    (n) => n.parent === node.id && n.context !== 'alternative'
  )
  if (children.length === 0) return 1
  return children.reduce((sum, child) => sum + countLeaves(child, moveTree), 0)
}

export function buildSunburstTree(
  node: MoveAnalysisNode,
  moveTree: Record<number, MoveAnalysisNode>,
  maxDepth: number,
  config: MoveTreeConfig
): {
  name: string
  value: number
  itemStyle: {
    color: string
    borderColor: string
    borderWidth: number
  }
  label: {
    show: boolean
    fontFamily: string
    fontWeight: number
    fontSize: number
    color: string
  }
  analysisNode: MoveAnalysisNode
  children?: ReturnType<typeof buildSunburstTree>[]
} {
  const childrenSource = Object.values(moveTree)
    .filter(
      (n) => n.parent === node.id && n.context !== 'alternative' // Ensure alternatives are handled if they should be colored differently by getNodeColor
    )
    .sort(
      (a, b) =>
        node.depth % 2 === 1
          ? a.shallow_score - b.shallow_score // White to play, prefers higher scores
          : b.shallow_score - a.shallow_score // Black to play, prefers lower scores (as scores are from white's POV)
    )

  const value = countLeaves(node, moveTree)

  // Determine color: mainline gets specific orange, others via getNodeColor
  // Assuming getNodeColor handles other contexts (pv, alternative) and default depth-based colors.
  // If getNodeColor itself sets mainline to orange, this explicit check might be redundant,
  // but this ensures mainline is config.nodeColors.mainline.
  const nodeColor = getNodeColor(node, config)

  return {
    name: node.move,
    value,
    itemStyle: {
      color: nodeColor ?? config.nodeColors.white, // Default to white if color is not set
      borderColor: 'rgba(150, 150, 150, 0.25)', // A subtle, consistent border for all nodes
      borderWidth: 1, // A consistent, thin border width
    },
    label: {
      show: node.depth >= 0, // Ensure label visibility logic is as intended
      fontFamily: config.fontFamily,
      fontWeight: 500, // Adjust as needed
      fontSize: 12, // Adjust as needed
      color: '#333', // Adjust as needed
    },
    analysisNode: node,
    children:
      node.depth < maxDepth && childrenSource.length > 0
        ? childrenSource.map((child) =>
            buildSunburstTree(child, moveTree, maxDepth, config)
          )
        : undefined,
  }
}
