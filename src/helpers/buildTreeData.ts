import { MoveAnalysisNode } from '@/types/AnalysisResult'

interface TreeNode {
  name: string
  value: number | null
  layout: string
  label: {
    color: string
    fontWeight: number
    position: string
    formatter: string | ((params: unknown) => string)
    verticalAlign: string
    align: string
  }
  itemStyle: {
    borderColor?: string
    borderWidth?: number
    color: string
  }
  lineStyle: {
    color: string
    width: number
  }
  symbol: string
  symbolSize: number
  children: (TreeNode | null)[]
  analysisNode: MoveAnalysisNode
  leaves: {
    label: {
      position: string
      verticalAlign: string
      align: string
    }
  }
}

export function buildTreeData(
  node: MoveAnalysisNode,
  moveTree: Record<number, MoveAnalysisNode>,
  maxDepth: number,
  highlight?: {
    mainNodeId?: number
    compareNodeId?: number
    pathNodeIds: number[]
  }
): TreeNode | null {
  if (!node || node.depth > maxDepth) return null

  // Order children: white to move (odd depth) = descending, black to move (even depth) = ascending
  let edgeColor = '#bbb'
  let edgeWidth = 1
  const parentIdx = node.parent

  if (
    highlight?.pathNodeIds.includes(node.id) &&
    highlight?.pathNodeIds.includes(parentIdx)
  ) {
    edgeColor = '#c7711a'
    edgeWidth = 2
  } else if (node.context === 'mainline') {
    edgeColor = '#b8e38c'
    edgeWidth = 2
  }

  const children = Object.values(moveTree)
    .filter((n) => n.parent === node.id && n.context !== 'alternative')
    .sort((a, b) =>
      node.depth % 2 === 1
        ? (b.deep_score ?? 0) - (a.deep_score ?? 0)
        : (a.deep_score ?? 0) - (b.deep_score ?? 0)
    )
    .map((child) => buildTreeData(child, moveTree, maxDepth, highlight))
    .filter(Boolean)

  let symbol: string | undefined = undefined
  if (node.move == 'start') {
    symbol = 'image:///icons/pieces/start.svg'
  }
  if (node.piece && node.piece.length === 1) {
    const color = node.depth % 2 === 0 ? 'w' : 'b'
    symbol = `image:///icons/pieces/${color}${node.piece}.svg`
  }

  return {
    name: node.move,
    value: node.deep_score,
    layout: 'radial',
    symbol: symbol || 'circle',
    symbolSize: 50,
    label: {
      color: '#333',
      fontWeight: 700,
      position: 'inside',
      formatter:
        node.deep_score != null
          ? `${node.move}\n${node.deep_score}`
          : node.move,
      verticalAlign: 'middle',
      align: 'center',
    },
    itemStyle: {
      color: '#fff',
      borderColor:
        node.id === highlight?.mainNodeId
          ? '#76081B'
          : node.id === highlight?.compareNodeId
          ? '#76081B'
          : highlight?.pathNodeIds?.includes(node.id)
          ? '#76081B'
          : undefined,
      borderWidth:
        node.id === highlight?.mainNodeId ||
        node.id === highlight?.compareNodeId
          ? 4
          : 2,
    },
    children,
    analysisNode: node,
    leaves: {
      label: {
        position: 'inside',
        verticalAlign: 'middle',
        align: 'center',
      },
    },
    lineStyle: {
      color: edgeColor,
      width: edgeWidth,
    },
  }
}
