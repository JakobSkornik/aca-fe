import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { FeatureTableHelpers, FeatureDiff } from '@/helpers/featureTableHelpers'
import { Move } from '@/types/chess/Move'
import FeatureChart from './FeatureChart'

const FeatureTable: React.FC = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex } = state

  const getCurrentMove = (): Move | null => manager.getMainlineMove(currentMoveIndex)

  const getPreviousMove = (): Move | null => manager.getMainlineMove(currentMoveIndex - 1)

  const getAllMoves = (): Move[] => {
    const moves: Move[] = []
    const maxIndex = Math.max(currentMoveIndex, 20)
    for (let i = 0; i <= maxIndex; i++) {
      const move = manager.getMainlineMove(i)
      if (move) moves.push(move)
    }
    return moves
  }

  const currentMove = getCurrentMove()
  const previousMove = getPreviousMove()

  const featureDiffs: FeatureDiff[] =
    currentMove && previousMove ? FeatureTableHelpers.calculateFeatureDiffs(currentMove, previousMove) : []

  const allMoves = getAllMoves()
  const currentChartIndex = currentMoveIndex

  if (!currentMove || featureDiffs.length === 0) {
    return (
      <div className="p-4 bg-lightest-gray">
        <div className="text-sm text-gray-600">No feature data available</div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-lightest-gray h-full overflow-auto">
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '25%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '21%' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-3 font-semibold text-darkest-gray">Feature</th>
              <th className="text-right py-3 font-semibold text-darkest-gray">Current</th>
              <th className="text-right py-3 font-semibold text-darkest-gray">Prev</th>
              <th className="text-right py-3 font-semibold text-darkest-gray">W</th>
              <th className="text-right py-3 font-semibold text-darkest-gray">B</th>
              <th className="text-center py-3 font-semibold text-darkest-gray">Chart</th>
            </tr>
          </thead>
          <tbody>
            {featureDiffs.map((diff) => (
              <tr key={diff.name} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 text-darkest-gray font-medium text-xs">{diff.name}</td>
                <td className="py-3 text-right text-darkest-gray text-xs">{diff.currentValue.toFixed(2)}</td>
                <td className="py-3 text-right text-darkest-gray text-xs">{diff.previousValue.toFixed(2)}</td>
                <td className={`py-3 text-right font-medium text-xs ${FeatureTableHelpers.getDiffClasses(diff.whiteDiff)}`}>
                  {FeatureTableHelpers.formatDiff(diff.whiteDiff)}
                </td>
                <td className={`py-3 text-right font-medium text-xs ${FeatureTableHelpers.getDiffClasses(diff.blackDiff)}`}>
                  {FeatureTableHelpers.formatDiff(diff.blackDiff)}
                </td>
                <td className="text-center h-12 p-0">
                  <FeatureChart featureName={diff.name} moves={allMoves} currentIndex={currentChartIndex} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FeatureTable
