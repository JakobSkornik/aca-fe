import { MoveAnalysisNode } from '@/types/AnalysisResult'
import { MoveTreeConfig } from '@/types/MoveTreeConfig'

export function buildTreeData(
  node: MoveAnalysisNode,
  moveTree: Record<number, MoveAnalysisNode>,
  maxDepth: number,
  config: MoveTreeConfig
): any {
  if (!node || node.depth > maxDepth) return null

  let color = config.nodeColors.white
  if (node.context === 'mainline') color = config.nodeColors.mainlineWhite
  else if (node.context === 'pv') color = config.nodeColors.pv
  else if (node.context === 'alternative') color = config.nodeColors.alternative
  else if (node.depth % 2 === 1) color = config.nodeColors.white
  else color = config.nodeColors.black

  // Order children: white to move (odd depth) = descending, black to move (even depth) = ascending
  let children = Object.values(moveTree)
    .filter((n) => n.parent === node.id && n.context !== 'alternative')
    .sort((a, b) =>
      node.depth % 2 === 1
        ? (b.deep_score ?? 0) - (a.deep_score ?? 0)
        : (a.deep_score ?? 0) - (b.deep_score ?? 0)
    )
    .map((child) => buildTreeData(child, moveTree, maxDepth, config))
    .filter(Boolean)

  return {
    name: node.move,
    value: node.deep_score,
    layout: 'radial',
    label: {
      color: '#333',
      fontWeight: node.context === 'mainline' ? 700 : 500,
      fontFamily: config.fontFamily,
      position: 'inside',
      formatter: node.deep_score != null
        ? `${node.move}\n${node.deep_score}`
        : node.move,
      verticalAlign: 'middle',
      align: 'center',
    },
    itemStyle: { color },
    children,
    analysisNode: node,
    leaves: {
      label: {
        position: 'inside',
        verticalAlign: 'middle',
        align: 'center',
      },
    },
  }
}
