import React, { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useGameState } from '../contexts/GameStateContext'
import { parseTrace } from '@/helpers/traceParser'
import { getMainlineMoves } from '@/helpers/moveListUtils'
import { PosFeature } from '@/types/chess/Trace'
import {
  materialDescription,
  mobilityDescription,
  imbalanceDescription,
  spaceDescription,
  threatsDescription,
  kingSafetyDescription,
  queensDescription,
  rooksDescription,
  knightsDescription,
  bishopsDescription,
  passedPawnsDescription,
} from '@/helpers/featureDescriptions'

const availableFeatures = [
  'Material',
  'Mobility',
  'Imbalance',
  'Space',
  'Threats',
  'King Safety',
  'Queens',
  'Rooks',
  'Knights',
  'Bishops',
  'Passed Pawns',
  'Winnable',
] as PosFeature[]

// Map features to their descriptions
const featureDescriptions: Record<PosFeature, string> = {
  Material: materialDescription,
  Mobility: mobilityDescription,
  Imbalance: imbalanceDescription,
  Space: spaceDescription,
  Threats: threatsDescription,
  'King Safety': kingSafetyDescription,
  Queens: queensDescription,
  Rooks: rooksDescription,
  Knights: knightsDescription,
  Bishops: bishopsDescription,
  'Passed Pawns': passedPawnsDescription,
  Winnable:
    'Measures the winnability of the position - how likely it is that the position can be converted to a win.',
  Total: 'Overall positional evaluation combining all features.',
}

const FeatureCharts: React.FC = () => {
  const { state } = useGameState()
  const { moves, previewMoves, previewMode, currentMoveIndex } = state
  const [selected] = useState<PosFeature[]>(availableFeatures)
  const [hoveredFeature, setHoveredFeature] = useState<PosFeature | null>(null)

  // Only show moves up to and including the current move
  const shownMoves = useMemo(
    () => (!previewMode ? moves : previewMoves).slice(0, currentMoveIndex + 1),
    [previewMode, moves, previewMoves, currentMoveIndex]
  )

  // Prepare feature data for each chart using traceParser
  const getFeatureSeries = (feature: PosFeature) => {
    const values: number[] = []
    let lastValue = 0
    for (const move of getMainlineMoves(shownMoves)) {
      const trace = parseTrace(move)
      if (!trace) {
        values.push(lastValue)
        continue
      }
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
    <div className="h-full w-full overflow-auto flex flex-row relative space-x-2">
      {/* Tooltip */}
      {hoveredFeature && (
        <div className="absolute top-2 left-2 right-2 z-10 bg-black bg-opacity-90 text-white text-xs p-3 rounded shadow-lg pointer-events-none">
          <div className="font-semibold mb-1">{hoveredFeature}</div>
          <div className="leading-relaxed">
            {featureDescriptions[hoveredFeature]}
          </div>
        </div>
      )}

      {/* Charts */}
      {selected.map((feature: PosFeature) => (
        <div
          key={feature}
          className="my-2 relative"
          style={{ height: 'calc(10vh - 16px)', minWidth: '200px' }}
          onMouseEnter={() => setHoveredFeature(feature)}
          onMouseLeave={() => setHoveredFeature(null)}
        >
          <ReactECharts
            style={{ height: '100%', width: '100%' }}
            option={{
              title: {
                text: feature,
                left: 'center',
                textStyle: {
                  color: '#333',
                  fontSize: 12,
                },
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
              grid: {
                show: true,
                left: '0%',
                bottom: '0%',
                right: '0%',
                top: '0%',
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
  )
}

export default FeatureCharts
