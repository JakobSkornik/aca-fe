import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

import { buildTreeData } from '@/helpers/buildTreeData'
import { getNodeById } from '@/helpers/tree'
import { MoveAnalysisNode } from '@/types/ws'
import { MoveTreeProps } from '@/types/props/MoveTreeProps'

type ChartProps = {
  moveTree: MoveTreeProps['moveTree']
  maxDepth: number
  onClickNode: (node: MoveAnalysisNode | null) => void
  mainNode?: MoveAnalysisNode | null
  compareNode?: MoveAnalysisNode | null
}

const Chart: React.FC<ChartProps> = ({
  moveTree,
  maxDepth,
  onClickNode,
  mainNode,
  compareNode,
}) => {
  const rootNode = useMemo(() => {
    if (mainNode) return mainNode
    return Object.values(moveTree).find((node) => node.parent === -1)
  }, [moveTree, mainNode])

  // Find path between mainNode and compareNode
  const pathNodeIds = useMemo(() => {
    if (!mainNode || !compareNode) return []
    const path: number[] = []
    let current: MoveAnalysisNode | undefined = compareNode
    while (current) {
      path.push(current.id)
      if (current.id === mainNode.id) break
      current = getNodeById(moveTree, current.parent)
    }
    if (!path.includes(mainNode.id)) return []
    return path
  }, [mainNode, compareNode, moveTree])

  // Pass highlight info to buildTreeData
  const treeData = useMemo(() => {
    return rootNode
      ? [
          buildTreeData(rootNode, moveTree, maxDepth, {
            mainNodeId: mainNode?.id,
            compareNodeId: compareNode?.id,
            pathNodeIds,
          }),
        ]
      : []
  }, [rootNode, moveTree, maxDepth, mainNode, compareNode, pathNodeIds])

  const option = useMemo(
    () => ({
      backgroundColor: 'rgba(0,0,0,0)',
      series: [
        {
          type: 'tree',
          layout: 'orthogonal',
          nodeGap: 40,
          data: treeData,
          symbol: 'circle',
          symbolSize: 60,
          roam: true,
          initialTreeDepth: maxDepth,
          label: {
            position: 'inside',
            verticalAlign: 'middle',
            align: 'center',
          },
          leaves: {
            label: {
              position: 'inside',
              verticalAlign: 'middle',
              align: 'center',
            },
          },
          lineStyle: {
            color: '#bbb',
            width: 2,
            curveness: 0.2,
          },
          emphasis: {
            focus: 'ancestor',
          },
          expandAndCollapse: false,
          animationDuration: 0,
          animationDurationUpdate: 0,
          scaleLimit: {
            min: 0.3,
            max: 5,
          },
          // center: ['40%', '50%'], // Center the tree in the chart area
        },
      ],
      tooltip: {
        show: false,
      },
    }),
    [treeData, maxDepth]
  )


  type EChartsTreeNodeParams = {
    componentType: string
    data?: {
      analysisNode?: MoveAnalysisNode
      [key: string]: unknown
    }
    [key: string]: unknown
  }

  const onEvents = {
    click: (params: EChartsTreeNodeParams) => {
      const node = params.data?.analysisNode as MoveAnalysisNode | undefined
      if (node) onClickNode(node)
    },
  }

  if (!rootNode) return null

  return (
    <div
      className="w-full h-full overflow-hidden"
    >
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        notMerge={true}
        lazyUpdate
        onEvents={onEvents}
      />
    </div>
  )
}

export default React.memo(Chart)
