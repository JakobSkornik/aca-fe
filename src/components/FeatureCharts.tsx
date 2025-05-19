import React, { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useGameState } from '../contexts/GameStateContext'
import { parseTrace } from '@/helpers/traceParser'
import { PosFeature } from '@/types/Trace'

const availableFeatures = [
  'Bishops',
  'Imbalance',
  'King Safety',
  'Knights',
  'Material',
  'Mobility',
  'Passed Pawns',
  'Queens',
  'Rooks',
  'Space',
  'Threats',
  'Winnable',
] as PosFeature[]

const FeatureCharts: React.FC = () => {
  const { gameState } = useGameState()
  const { moves, currentMoveIndex } = gameState
  const [selected] = useState<PosFeature[]>(availableFeatures)

  // Only show moves up to and including the current move
  const shownMoves = useMemo(
    () => moves.slice(0, currentMoveIndex + 1),
    [moves, currentMoveIndex]
  )

  // Prepare feature data for each chart using traceParser
  const getFeatureSeries = (feature: PosFeature) => {
    const values: number[] = []
    let lastValue = 0
    for (const move of shownMoves) {
      const trace = parseTrace(move)
      if (typeof trace[feature] === 'number') {
        lastValue = trace[feature]
        values.push(lastValue)
      } else {
        // In check or mate, propagate previous value
        values.push(lastValue)
      }
    }
    return values
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 300,
      }}
    >
      {/* Charts */}
      <div className="h-fill overflow-y-auto">
        {selected.map((feature: PosFeature) => (
          <div key={feature} className="h-[120px] mb-1">
            <ReactECharts
              style={{ height: 80, width: '100%' }}
              option={{
                title: {
                  text: feature,
                  left: 'center',
                  textStyle: { fontSize: 12 },
                },
                xAxis: {
                  show: false,
                  type: 'category',
                  boundaryGap: false,
                  data: shownMoves.map((_, i) => i),
                },
                yAxis: {
                  show: false,
                  type: 'value',
                  min: -2,
                  max: 2,
                },
                series: [
                  {
                    type: 'line',
                    data: getFeatureSeries(feature),
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                      color: '#888',
                      width: 2,
                    },
                    areaStyle: {
                      color: '#88888833',
                    },
                  },
                ],
                tooltip: { show: false },
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeatureCharts
