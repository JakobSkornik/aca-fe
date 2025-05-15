import { MoveAnalysisNode } from '@/types/AnalysisResult'
import { MoveTreeConfig } from '@/types/MoveTreeConfig'

export function buildGraphTree(
  rootNode: MoveAnalysisNode | undefined,
  moveTree: Record<number, MoveAnalysisNode>,
  maxDepth: number,
  config: MoveTreeConfig
): { nodes: any[]; links: any[] } {
  if (!rootNode) return { nodes: [], links: [] }

  const nodes: any[] = []
  const links: any[] = []

  function traverse(node: MoveAnalysisNode, depth: number) {
    if (depth > maxDepth) return

    // Color logic
    let color = config.nodeColors.white
    if (node.context === 'mainline') color = '#FFECAC'
    else if (node.context === 'pv') color = config.nodeColors.pv
    else if (node.context === 'alternative') color = config.nodeColors.alternative
    else if (node.depth % 2 === 0) color = config.nodeColors.white
    else color = config.nodeColors.black

    nodes.push({
      id: String(node.id),
      name: node.move,
      value: node.shallow_score,
      symbolSize: 40 - depth * 2,
      itemStyle: { color },
      label: {
        show: true,
        fontSize: 14,
        fontWeight: node.context === 'mainline' ? 700 : 500,
        color: '#333',
        formatter: node.shallow_score != null
          ? `${node.move}\n${node.shallow_score}`
          : node.move,
      },
      analysisNode: node,
      depth,
    })

    Object.values(moveTree)
      .filter((n) => n.parent === node.id && n.context !== 'alternative')
      .forEach((child) => {
        links.push({
          source: String(node.id),
          target: String(child.id),
          lineStyle: {
            color: node.context === 'mainline' && child.context === 'mainline'
              ? '#ff9900'
              : '#bbb',
            width: node.context === 'mainline' && child.context === 'mainline'
              ? 2.5
              : 1,
          },
        })
        traverse(child, depth + 1)
      })
  }

  traverse(rootNode, 0)
  return { nodes, links }
}
