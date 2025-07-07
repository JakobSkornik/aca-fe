import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { FeatureTableHelpers, FeatureDiff } from '@/helpers/featureTableHelpers'
import { Move } from '@/types/chess/Move'
import FeatureChart from './FeatureChart'

const FeatureTable: React.FC = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, previewMode, previewMoves, previewMoveIndex } = state

  // Get current and previous moves based on mode
  const getCurrentMove = (): Move | null => {
    if (previewMode) {
      return previewMoves.getMoveAtIndex(previewMoveIndex) || null
    } else {
      return manager.getMainlineMove(currentMoveIndex)
    }
  }

  const getPreviousMove = (): Move | null => {
    if (previewMode) {
      // In preview mode, previous move is the mainline move at currentMoveIndex
      return manager.getMainlineMove(currentMoveIndex)
    } else {
      // In normal mode, previous move is the mainline move at currentMoveIndex - 1
      return manager.getMainlineMove(currentMoveIndex - 1)
    }
  }

  // Get all moves for charts based on current mode
  const getAllMoves = (): Move[] => {
    const moves: Move[] = []
    
    if (previewMode) {
      // In preview mode, join mainline moves up to currentMoveIndex with preview moves
      // First, get mainline moves up to currentMoveIndex
      for (let i = 0; i <= currentMoveIndex; i++) {
        const move = manager.getMainlineMove(i)
        if (move) {
          moves.push(move)
        }
      }
      
      // Then add preview moves
      const previewMovesList = previewMoves.getMainlineMoves()
      for (let i = 0; i < previewMovesList.length; i++) {
        const move = previewMovesList[i]
        if (move) {
          moves.push(move)
        }
      }
    } else {
      // In normal mode, use mainline moves
      const maxIndex = Math.max(currentMoveIndex, 20) // Get at least 20 moves for charts
      
      for (let i = 0; i <= maxIndex; i++) {
        const move = manager.getMainlineMove(i)
        if (move) {
          moves.push(move)
        }
      }
    }
    
    return moves
  }

  // Get the current index for charts
  const getCurrentChartIndex = (): number => {
    if (previewMode) {
      // In preview mode, the current index is the mainline moves count plus preview move index
      return currentMoveIndex + previewMoveIndex
    } else {
      return currentMoveIndex
    }
  }

  const currentMove = getCurrentMove()
  const previousMove = getPreviousMove()

  // Calculate feature differences
  const featureDiffs: FeatureDiff[] = currentMove && previousMove 
    ? FeatureTableHelpers.calculateFeatureDiffs(currentMove, previousMove)
    : []

  const allMoves = getAllMoves()
  const currentChartIndex = getCurrentChartIndex()

  if (!currentMove || featureDiffs.length === 0) {
    return (
      <div className="p-4 bg-lightest-gray">
        <div className="text-sm text-gray-600">
          No feature data available
        </div>
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
              <th className="text-right py-3 font-semibold text-darkest-gray">
                {previewMode ? 'Preview' : 'Current'}
              </th>
              <th className="text-right py-3 font-semibold text-darkest-gray">
                {previewMode ? 'Current' : 'Prev'}
              </th>
              <th className="text-right py-3 font-semibold text-darkest-gray">W</th>
              <th className="text-right py-3 font-semibold text-darkest-gray">B</th>
              <th className="text-center py-3 font-semibold text-darkest-gray">Chart</th>
            </tr>
          </thead>
          <tbody>
            {featureDiffs.map((diff) => (
              <tr key={diff.name} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 text-darkest-gray font-medium text-xs">
                  {diff.name}
                </td>
                <td className="py-3 text-right text-darkest-gray text-xs">
                  {diff.currentValue.toFixed(2)}
                </td>
                <td className="py-3 text-right text-darkest-gray text-xs">
                  {diff.previousValue.toFixed(2)}
                </td>
                <td className={`py-3 text-right font-medium text-xs ${FeatureTableHelpers.getDiffClasses(diff.whiteDiff)}`}>
                  {FeatureTableHelpers.formatDiff(diff.whiteDiff)}
                </td>
                <td className={`py-3 text-right font-medium text-xs ${FeatureTableHelpers.getDiffClasses(diff.blackDiff)}`}>
                  {FeatureTableHelpers.formatDiff(diff.blackDiff)}
                </td>
                <td className="text-center h-12 p-0">
                  <FeatureChart
                    featureName={diff.name}
                    moves={allMoves}
                    currentIndex={currentChartIndex}
                  />
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