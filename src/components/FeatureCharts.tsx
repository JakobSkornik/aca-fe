import React, { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useGameState } from '../contexts/GameStateContext'
import { parseTrace } from '@/helpers/traceParser'

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
]

const FeatureCharts: React.FC = () => {
  const { gameState } = useGameState()
  const { moves, currentMoveIndex } = gameState
  const [selected, setSelected] = useState<string[]>(availableFeatures)

  // Only show moves up to and including the current move
  const shownMoves = useMemo(
    () => moves.slice(0, currentMoveIndex + 1),
    [moves, currentMoveIndex]
  )

  // Prepare feature data for each chart using traceParser
  const getFeatureSeries = (feature: string) => {
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
      {/* Dropdown */}
      {/* <div style={{ marginBottom: 8 }}>
        <label>
          <strong>Show features:</strong>
        </label>
        <select
          multiple
          value={selected}
          onChange={handleDropdownChange}
          style={{ marginLeft: 8, minWidth: 150, height: 80 }}
        >
          {availableFeatures.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div> */}
      {/* Charts */}
      <div className="h-fill overflow-y-auto">
        {selected.map((feature) => (
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
