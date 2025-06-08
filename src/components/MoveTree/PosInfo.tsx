import React, { useState, useEffect, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { Arrow } from 'react-chessboard/dist/chessboard/types'

import { PosInfoProps } from '@/types/props/PosInfoProps'
import { parseTrace } from '@/helpers/traceParser'
import { PosFeature } from '@/types/chess/Trace'

const PosInfo: React.FC<PosInfoProps> = ({
  mainNode,
  compareNode,
  onClose,
}) => {
  const [fen, setFen] = useState<string>('start')

  // Compute arrows for last move (if available)
  const lastMoveArrow = useMemo(() => {
    if (
      mainNode?.move &&
      typeof mainNode.move === 'string' &&
      mainNode.move.length === 4
    ) {
      return [
        [
          mainNode.move.slice(0, 2),
          mainNode.move.slice(2, 4),
          'var(--orange)',
        ],
      ]
    }
    return []
  }, [mainNode])

  const compareArrow = useMemo(() => {
    if (
      compareNode &&
      compareNode.move &&
      typeof compareNode.move === 'string' &&
      compareNode.move.length === 4
    ) {
      return [
        [
          compareNode.move.slice(0, 2),
          compareNode.move.slice(2, 4),
          'var(--orange)',
        ],
      ]
    }
    return []
  }, [compareNode])

  useEffect(() => {
    if (mainNode) {
      setFen(mainNode.position || 'start')
    } else {
      setFen('start')
    }
  }, [mainNode])

  // Parse traces
  const mainTrace = mainNode ? parseTrace(mainNode) : null
  const compareTrace = compareNode ? parseTrace(compareNode) : null

  // Filter features to only show meaningful differences
  const filteredFeatures = useMemo(() => {
    if (!mainTrace) return []
    
    const entries = Object.entries(mainTrace)
    
    // If no comparison, show all features
    if (!compareNode || !compareTrace) {
      return entries
    }
    
    // Filter out features with no meaningful change
    return entries.filter(([key, mainValue]) => {
      const compareValue = compareTrace[key as PosFeature]
      
      // Keep if either value is not a number (e.g., strings)
      if (typeof mainValue !== 'number' || typeof compareValue !== 'number' || isNaN(mainValue) || isNaN(compareValue)) {
        return true
      }
      
      const diff = Math.abs(mainValue - compareValue)
      
      // Filter out if difference is 0, NaN, or very small (less than 0.001)
      return !isNaN(diff) && diff >= 0.001
    })
  }, [mainTrace, compareTrace, compareNode])

  // If no main node, return null
  if (!mainNode) return null

  // Helper to get diff and color when comparing
  function getDiffAndColor(key: PosFeature) {
    if (!compareTrace) {
      return {
        diff: 0,
        color: '',
        formatted: '0.00'
      }
    }

    const mainValue = mainTrace ? mainTrace[key] : 0
    const compareValue = compareTrace ? compareTrace[key] : 0
    const diff = mainValue - compareValue

    let color = ''
    if (diff > 0) color = 'text-green-600'
    if (diff < 0) color = 'text-red-600'

    return {
      diff,
      color,
      formatted:
        diff === 0
          ? '0.00'
          : diff > 0
          ? `+${diff.toFixed(2)}`
          : `${diff.toFixed(2)}`,
    }
  }

  return (
    <div className="bg-lightest-gray p-2 min-w-[270px] max-w-[520px] relative h-full w-full shadow-lg rounded-lg">
      {/* X Button */}
      {onClose && (
        <button
          className="hvr-shadow z-[1000] w-6 h-6 bg-dark-gray rounded-lg border-none text-base cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      )}

      {/* Chessboards */}
      <div className="flex gap-2 mb-2 justify-center">
        <div>
          <Chessboard
            position={fen}
            boardWidth={164}
            customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
            customArrows={lastMoveArrow as Arrow[]}
          />
          <div className="text-center text-xs mt-0.5">
            Main ({String(mainNode.move)})
          </div>
        </div>

        {compareNode && (
          <div>
            <Chessboard
              position={compareNode.position}
              boardWidth={164}
              customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
              customLightSquareStyle={{
                backgroundColor: 'var(--lightest-gray)',
              }}
              customArrows={compareArrow as Arrow[]}
            />
            <div className="text-center text-xs mt-0.5">
              Compare ({String(compareNode.move)})
            </div>
          </div>
        )}
      </div>

      {/* Features Table */}
      {mainTrace && (
        <div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left p-1 font-semibold">Feature</th>
                <th className="text-right p-1 font-semibold">Main</th>
                {compareNode && (
                  <>
                    <th className="text-right p-1 font-semibold">Compare</th>
                    <th className="text-right p-1 font-semibold">Diff</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map(([key, mainValue]) => {
                const { color, formatted } = getDiffAndColor(key as PosFeature)
                const compareValue = compareTrace?.[key as PosFeature]
                
                return (
                  <tr key={key}>
                    <td className="p-1">{key}</td>
                    <td className="p-1 text-right">
                      {typeof mainValue === 'number' ? mainValue.toFixed(2) : String(mainValue)}
                    </td>
                    {compareNode && (
                      <>
                        <td className="p-1 text-right">
                          {typeof compareValue === 'number' ? compareValue.toFixed(2) : String(compareValue)}
                        </td>
                        <td className={`p-1 text-right font-semibold ${color}`}>
                          {formatted}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PosInfo
