import { MoveAnalysisNode } from '@/types/ws'

interface TreeNode {
  name: string
  value: number | null
  layout: string
  label: {
    color: string
    fontWeight: number
    position: string
    fontSize: number
    formatter: string | ((params: MoveAnalysisNode) => string)
    verticalAlign?: string
    align?: string
  }
  itemStyle: {
    borderColor?: string
    borderWidth?: number
    shadowBlur: number
    shadowColor: string
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

  // Determine if this is a main or compare node
  const isMainNode = node.id === highlight?.mainNodeId
  const isCompareNode = node.id === highlight?.compareNodeId
  const isHighlightedPath = highlight?.pathNodeIds?.includes(node.id) || false

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
  } else if (node.move.context === 'mainline') {
    edgeColor = '#b8e38c'
    edgeWidth = 2
  }

  const children = Object.values(moveTree)
    .filter((n) => n.parent === node.id && n.move.context !== 'alternative')
    .sort((a, b) =>
      node.depth % 2 === 1
        ? (b.move.score ?? 0) - (a.move.score ?? 0)
        : (a.move.score ?? 0) - (b.move.score ?? 0)
    )
    .map((child) => {
      let currentChildMaxDepth = maxDepth
      const isParentMainline = node.move.context === 'mainline'
      const isChildVariationStart = child.move.context !== 'mainline'

      // Determine if this child's branch should be fully expanded
      // because the child itself is selected, or it's on the path to a selected node.
      const shouldExpandBranchForHighlight =
        child.id === highlight?.mainNodeId ||
        child.id === highlight?.compareNodeId ||
        highlight?.pathNodeIds?.includes(child.id)

      // If the parent is mainline, the child starts a new variation,
      // and this child's branch is NOT needed for the current highlight,
      // then limit the depth for this child's branch to only show the child itself.
      if (
        isParentMainline &&
        isChildVariationStart &&
        !shouldExpandBranchForHighlight
      ) {
        currentChildMaxDepth = child.depth
      }
      return buildTreeData(child, moveTree, currentChildMaxDepth, highlight)
    })
    .filter(Boolean)

  let symbol: string | undefined = undefined
  if (node.move.move == 'Start') {
    symbol = 'image:///icons/pieces/start.svg'
  }
  if (node.piece) {
    symbol = `image:///icons/pieces/${node.piece.toLowerCase()}.svg`
  }

  // Enhance node styling based on its role
  const nodeName =
    typeof node.move.move === 'string' ? node.move.move : String(node.move.move)

  // Apply different stylings that work with your SVG icons
  const nodeColor = '#fff'
  let borderColor = undefined
  let borderWidth = 2
  let symbolSize = 30

  // Instead of changing the name (which might interfere with your SVG),
  // create a distinctive visual appearance with borders and background
  if (isMainNode) {
    borderColor = '#1890ff'
    borderWidth = 4
    symbolSize = 65
  } else if (isCompareNode) {
    borderColor = '#ff4d4f'
    borderWidth = 4
    symbolSize = 65
  } else if (isHighlightedPath) {
    borderColor = '#76081B'
    borderWidth = 3
    symbolSize = 45
  }

  return {
    name: nodeName,
    value: node.move.score ?? null,
    layout: 'radial',
    symbol: symbol || 'circle',
    symbolSize: symbolSize,
    label: {
      color: '#333',
      fontWeight: 400,
      fontSize: 12,
      position: 'inside',
      formatter: node.move.score
        ? `${node.move.move}\n${node.move.score}`
        : node.move.move,
    },
    itemStyle: {
      color: nodeColor,
      borderColor: borderColor,
      borderWidth: borderWidth,
      shadowBlur: isMainNode || isCompareNode ? 10 : 0,
      shadowColor: isMainNode
        ? 'rgba(24, 144, 255, 0.9)'
        : isCompareNode
        ? 'rgba(255, 77, 79, 0.9)'
        : 'rgba(0,0,0,0)',
    },
    children,
    analysisNode: node,
    leaves: {
      label: {
        position: 'right',
        verticalAlign: 'middle',
        align: 'left',
      },
    },
    lineStyle: {
      color: edgeColor,
      width: edgeWidth,
    },
  }
}
