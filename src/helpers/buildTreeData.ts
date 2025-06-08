import { Move } from '@/types/chess/Move'
import { EchartsTreeNode } from '@/types/echarts/EchartsTreeNode'
import { PathHighlightOpts } from '@/types/PathHighlightOpts'

function isPvNodeInPath(
  pv: Move[],
  highlight: PathHighlightOpts
): boolean {
  return pv.some(move => 
    move.id === highlight.mainNodeId || 
    move.id === highlight.compareNodeId
  )
}

function buildPvBranch(
  pv: Move[],
  pvMoveIdx: number,
  currentDisplayDepthInPv: number,
  maxDisplayDepth: number,
  highlight: PathHighlightOpts,
  mainlineMoveIdForPv: number | undefined
): EchartsTreeNode | null {
  if (pvMoveIdx >= pv.length || currentDisplayDepthInPv > maxDisplayDepth) {
    return null
  }

  const move = pv[pvMoveIdx]
  const children: EchartsTreeNode[] = []

  const isParentMainlineHighlighted =
    mainlineMoveIdForPv !== undefined &&
    (mainlineMoveIdForPv === highlight.mainNodeId ||
      mainlineMoveIdForPv === highlight.compareNodeId)

  const isThisPvNodeMain = move.id === highlight.mainNodeId
  const isThisPvNodeCompare = move.id === highlight.compareNodeId
  
  // Check if any node in this PV is selected (main or compare)
  const isPvPathSelected = isPvNodeInPath(pv, highlight)

  // Expand full PV if:
  // 1. Its parent mainline node was selected, OR
  // 2. This PV node itself is selected, OR  
  // 3. Any node in this PV path is selected
  if (
    (isParentMainlineHighlighted || isThisPvNodeMain || isThisPvNodeCompare || isPvPathSelected) &&
    pvMoveIdx < pv.length - 1
  ) {
    const nextPvMoveNode = buildPvBranch(
      pv,
      pvMoveIdx + 1,
      currentDisplayDepthInPv + 1,
      maxDisplayDepth,
      highlight,
      mainlineMoveIdForPv
    )
    if (nextPvMoveNode) {
      children.push(nextPvMoveNode)
    }
  } else if (
    !(isParentMainlineHighlighted || isThisPvNodeMain || isThisPvNodeCompare || isPvPathSelected) &&
    pvMoveIdx > 0
  ) {
    return null
  }

  let itemStyle = {
    color: '#fff',
    borderColor: '#d3803c', // Default PV color
    borderWidth: 1,
    shadowBlur: 0,
    shadowColor: 'transparent',
  }
  let symbolSize = 35

  if (isThisPvNodeMain) {
    itemStyle = {
      color: '#fff',
      borderColor: '#1890ff', // Main node color
      borderWidth: 3,
      shadowBlur: 10,
      shadowColor: 'rgba(24, 144, 255, 0.7)',
    }
    symbolSize = 35
  } else if (isThisPvNodeCompare) {
    itemStyle = {
      color: '#fff',
      borderColor: '#ff4d4f', // Compare node color
      borderWidth: 3,
      shadowBlur: 10,
      shadowColor: 'rgba(255, 77, 79, 0.7)',
    }
    symbolSize = 35
  }

  const lineStyle = {
    color: '#d3803c', // PV line color
    width: 1,
  }

  return {
    name: move.move || 'PV',
    value: move.score ?? null,
    itemStyle,
    lineStyle,
    symbol: move.piece
      ? `image:///icons/chart_pieces/${move.piece.toLowerCase()}.svg`
      : 'circle',
    symbolSize,
    label: {
      position: 'inside',
      align: 'center',
      verticalAlign: 'middle',
      formatter: (params: { data: EchartsTreeNode }): string => {
        const analysisMove = params.data.analysisNode as Move
        const displayName = params.data.name
        return analysisMove?.score !== undefined && analysisMove?.score !== null
          ? `${displayName}\n${(analysisMove.score / 100).toFixed(2)}`
          : String(displayName)
      },
      fontSize: 10,
    },
    children,
    analysisNode: move,
    depth: currentDisplayDepthInPv,
  }
}

function buildTreeRecursive(
  currentMainlineMove: Move,
  allMainlineMoves: Move[],
  allMainlinePvs: Record<number, Move[][]>,
  maxDisplayDepth: number,
  highlight: PathHighlightOpts,
  currentDisplayDepth: number
): EchartsTreeNode | null {
  if (currentDisplayDepth > maxDisplayDepth) {
    return null
  }

  const children: EchartsTreeNode[] = []
  const isMainNode = currentMainlineMove.id === highlight.mainNodeId
  const isCompareNode = currentMainlineMove.id === highlight.compareNodeId

  const currentMainlineIndex = allMainlineMoves.findIndex(
    (m) => m.id === currentMainlineMove.id
  )

  // Add PVs for the NEXT mainline move as children of the current move
  // This is because PVs represent alternatives from the current position
  if (
    currentMainlineIndex !== -1 &&
    currentMainlineIndex + 1 < allMainlineMoves.length
  ) {
    const nextMainlineMove = allMainlineMoves[currentMainlineIndex + 1]
    
    // Fix: Use the next move's INDEX instead of ID to access PVs
    const nextMoveIndex = currentMainlineIndex + 1
    const pvsForNextMove = allMainlinePvs[nextMoveIndex] || []
    
    pvsForNextMove.forEach((pvBranchMoves: Move[]) => {
      if (pvBranchMoves.length > 0) {
        const pvBranchRoot = buildPvBranch(
          pvBranchMoves,
          0,
          currentDisplayDepth + 1,
          maxDisplayDepth,
          highlight,
          currentMainlineMove.id
        )
        if (pvBranchRoot) {
          children.push(pvBranchRoot)
        }
      }
    })

    // Add the actual next mainline move as a child
    const nextMainlineNode = buildTreeRecursive(
      nextMainlineMove,
      allMainlineMoves,
      allMainlinePvs,
      maxDisplayDepth,
      highlight,
      currentDisplayDepth + 1
    )
    if (nextMainlineNode) {
      children.push(nextMainlineNode)
    }
  }

  let itemStyle: EchartsTreeNode['itemStyle'] = {
    color: '#fff',
    borderColor: '#ccc', // Default mainline border
    borderWidth: 2,
    shadowBlur: 0,
    shadowColor: 'transparent',
  }
  let symbolSize = 40
  const lineStyleColor = '#bbb'

  if (isMainNode) {
    itemStyle = {
      color: '#fff',
      borderColor: '#1890ff', // Main node color
      borderWidth: 3,
      shadowBlur: 10,
      shadowColor: 'rgba(24, 144, 255, 0.7)',
    }
    symbolSize = 55
  } else if (isCompareNode) {
    itemStyle = {
      color: '#fff',
      borderColor: '#ff4d4f', // Compare node color
      borderWidth: 3,
      shadowBlur: 10,
      shadowColor: 'rgba(255, 77, 79, 0.7)',
    }
    symbolSize = 55
  }

  return {
    name: currentMainlineMove.move || 'Start', // SAN of the move
    value: currentMainlineMove.score ?? null,
    itemStyle,
    lineStyle: { color: lineStyleColor, width: 1.5 },
    symbol: currentMainlineMove.piece
      ? `image:///icons/chart_pieces/${currentMainlineMove.piece.toLowerCase()}.svg`
      : currentMainlineMove.move === 'Start' // Handle potential "Start" node
      ? 'image:///icons/chart_pieces/start.svg'
      : 'circle',
    symbolSize,
    label: {
      position: 'inside',
      formatter: (params: { data: EchartsTreeNode }): string => {
        const analysisMove = params.data.analysisNode as Move
        const displayName = params.data.name
        return analysisMove?.score !== undefined && analysisMove?.score !== null
          ? `${displayName}\n${(analysisMove.score / 100).toFixed(2)}`
          : String(displayName)
      },
      color: '#333',
      fontWeight: 400,
      fontSize: 12,
    },
    children,
    analysisNode: currentMainlineMove,
    depth: currentDisplayDepth,
  }
}

export function buildTreeData(
  rootMainlineNodeForDisplay: Move,
  allMainlineMoves: Move[],
  allMainlinePvs: Record<number, Move[][]>,
  maxDisplayDepth: number,
  highlight: PathHighlightOpts
): EchartsTreeNode | null {
  if (!rootMainlineNodeForDisplay) {
    return null
  }
  return buildTreeRecursive(
    rootMainlineNodeForDisplay,
    allMainlineMoves,
    allMainlinePvs,
    maxDisplayDepth,
    highlight,
    0
  )
}
