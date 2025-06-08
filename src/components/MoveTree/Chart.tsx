import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

import { useGameState } from '@/contexts/GameStateContext'
import { buildTreeData } from '@/helpers/buildTreeData'

import { ChartProps } from '@/types/props/ChartProps'
import { PathHighlightOpts } from '@/types/PathHighlightOpts'
import { EChartsClickParams } from '@/types/echarts/EChartsClickParams'

const Chart: React.FC<ChartProps> = ({
  maxDepth,
  onClickNode,
  mainNode,
  compareNode,
}) => {
  const { gameState } = useGameState()
  const { moves, movePvs, previewMode, previewMoves, previewMovePvs, currentMoveIndex } =
    gameState

  const shownMoves = previewMode ? previewMoves : moves
  const shownPvs = previewMode ? previewMovePvs : movePvs

  const rootNode = useMemo(
    () => (shownMoves.length > 0 && currentMoveIndex >= 0 && currentMoveIndex < shownMoves.length 
      ? shownMoves[currentMoveIndex] 
      : shownMoves[0] || null),
    [shownMoves, currentMoveIndex]
  )

  const treeData = useMemo(() => {
    if (!shownMoves.length || !rootNode) {
      return []
    }

    const highlightOptions: PathHighlightOpts = {
      mainNodeId: mainNode?.id,
      compareNodeId: compareNode?.id,
    }

    const data = buildTreeData(
      rootNode,
      shownMoves,
      shownPvs,
      maxDepth,
      highlightOptions
    )
    return data ? [data] : []
  }, [
    shownMoves,
    rootNode,
    mainNode?.id,
    compareNode?.id,
    shownPvs,
    maxDepth,
  ])

  const option = useMemo(
    () => ({
      backgroundColor: 'rgba(0,0,0,0)',
      series: [
        {
          type: 'tree',
          layout: 'orthogonal',
          nodeGap: 30,
          edgeForkPosition: '75%',
          initialTreeDepth: maxDepth,
          data: treeData,
          symbol: 'circle',
          symbolSize: 40,
          roam: true,
          label: {
            position: 'inside',
            verticalAlign: 'middle',
            align: 'center',
            color: '#333',
            fontSize: 12,
          },
          leaves: {
            label: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left',
            },
          },
          lineStyle: {
            color: '#bbb',
            width: 1.5,
          },
          emphasis: {
            focus: 'ancestor',
            lineStyle: {
              width: 2,
            },
          },
          expandAndCollapse: false,
          animationDuration: 300,
          animationDurationUpdate: 300,
          scaleLimit: {
            min: 0.2,
            max: 5,
          },
        },
      ],
    }),
    [treeData, maxDepth]
  )

  const onEvents = {
    click: (params: EChartsClickParams) => {
      const clickedAnalysisNode = params.data?.analysisNode
      if (clickedAnalysisNode) {
        onClickNode(clickedAnalysisNode)
      }
    },
  }

  if (shownMoves.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading tree or no moves to display...
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        notMerge={true}
        lazyUpdate={true}
        onEvents={onEvents}
      />
    </div>
  )
}

export default React.memo(Chart)
