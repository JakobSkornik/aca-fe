import React, { useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { buildTreeData } from '@/helpers/buildTreeData'
import { MoveTreeProps } from '@/types/props/MoveTreeProps'
import { MoveAnalysisNode } from '@/types/AnalysisResult'

const config = {
  nodeColors: {
    white: '#f0f0f0',
    black: '#999',
    mainlineWhite: '#FFECAC',
    mainlineBlack: '#C5BDAC',
    pv: '#3b82f6',
    alternative: '#999999',
  },
  fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  bandColors: {
    white: '',
    black: '',
  },
}

type ChartProps = {
  moveTree: MoveTreeProps['moveTree']
  maxDepth: number
  onHoverNode: (node: MoveAnalysisNode | null) => void
}

const Chart: React.FC<ChartProps> = ({ moveTree, maxDepth, onHoverNode }) => {
  const lastHoveredId = useRef<string | number | null>(null)
  const rootNode = useMemo(
    () => Object.values(moveTree).find((node) => node.parent === -1),
    [moveTree]
  )
  const treeData = useMemo(() => {
    return rootNode ? [buildTreeData(rootNode, moveTree, maxDepth, config)] : []
  }, [rootNode, moveTree, maxDepth])

  const option = useMemo(
    () => ({
      backgroundColor: 'rgba(0,0,0,0)',
      series: [
        {
          type: 'tree',
          data: treeData,
          symbol: 'circle',
          symbolSize: 10,
          roam: true,
          initialTreeDepth: maxDepth,
          label: {
            position: 'inside',
            verticalAlign: 'middle',
            align: 'center',
            fontFamily: config.fontFamily,
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
          expandAndCollapse: true,
          animationDuration: 0,
          animationDurationUpdate: 0,
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
    mouseover: (params: EChartsTreeNodeParams) => {
      const node = params.data?.analysisNode as MoveAnalysisNode | undefined
      if (
        params.componentType === 'series' &&
        node &&
        node.id !== lastHoveredId.current
      ) {
        onHoverNode(node)
        lastHoveredId.current = node.id
      }
    },
    mouseout: () => {
      onHoverNode(null)
      lastHoveredId.current = null
    },
  }

  if (!rootNode) return null

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height: '100%' }}
      notMerge={false}
      lazyUpdate
      onEvents={onEvents}
    />
  )
}

export default React.memo(Chart)
