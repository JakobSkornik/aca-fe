import React, { useState, useEffect, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { Arrow } from 'react-chessboard/dist/chessboard/types'

import { getParent, getPVLine } from '@/helpers/tree'
import { PosInfoProps } from '@/types/props/PosInfoProps'
import { parseTrace } from '@/helpers/traceParser'
import { PosFeature } from '@/types/Trace'

const PosInfo: React.FC<PosInfoProps> = ({
  node,
  tree,
  compareNode,
  onClose,
}) => {
  const [fen, setFen] = useState<string>('start')

  // Compute arrows for last move (if available)
  const lastMoveArrow = useMemo(() => {
    if (
      node?.move.move &&
      typeof node.move.move === 'string' &&
      node.move.move.length === 4
    ) {
      return [
        [
          node.move.move.slice(0, 2),
          node.move.move.slice(2, 4),
          'var(--orange)',
        ],
      ]
    }
    return []
  }, [node])

  const compareFen = compareNode?.move.position
  const compareArrow = useMemo(() => {
    if (
      compareNode &&
      compareNode?.move &&
      typeof compareNode.move.move === 'string' &&
      compareNode.move.move.length === 4
    ) {
      return [
        [
          compareNode.move.move.slice(0, 2),
          compareNode.move.move.slice(2, 4),
          'var(--orange)',
        ],
      ]
    }
    return []
  }, [compareNode])

  useEffect(() => {
    if (node) {
      setFen(node.move.position)
    } else {
      setFen('start')
    }
  }, [node])

  // If no node, return null
  if (!node) return null

  // Find parent node for feature diff
  const trace = parseTrace(node.move)
  const baseTrace = compareNode
    ? parseTrace(compareNode.move)
    : parseTrace(getParent(tree, node)!.move)

  const isWhite = node.depth % 2 === 1 ? true : false

  // Helper to get diff and color
  function getDiffAndColor(key: PosFeature) {
    console.log('key', key, baseTrace, trace)
    const prev = baseTrace[key]
    const curr = trace[key]
    let diff = prev - curr

    if (!isWhite) {
      diff = -diff
    }

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
            boardWidth={224}
            customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
            customArrows={lastMoveArrow as Arrow[]}
          />
          <div className="text-center text-xs mt-0.5">
            Main ({String(node.move.move)})
          </div>
        </div>

        {compareNode && (
          <div>
            <Chessboard
              position={compareFen}
              boardWidth={224}
              customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
              customLightSquareStyle={{
                backgroundColor: 'var(--lightest-gray)',
              }}
              customArrows={compareArrow as Arrow[]}
            />
            <div className="text-center text-xs mt-0.5">
              Compare ({String(compareNode.move.move)})
            </div>
          </div>
        )}
      </div>

      {/* Move Info */}
      <div
        className={`text-sm mb-2 ${
          compareNode ? 'flex justify-center gap-6' : 'block'
        }`}
      >
        {/* Main Node Info */}
        <div>
          <div className="mb-0.5">
            <strong>Move:</strong> {String(node?.move.move) || 'N/A'}
          </div>
          <div className="mb-0.5">
            <strong>Context:</strong> {node?.move.context || 'N/A'}
            {node?.move.context?.startsWith('pv') && (
              <>
                {' ('}
                {getPVLine(tree, node).join(', ')}
                {')'}
              </>
            )}
          </div>
          <div className="mb-0.5">
            <strong>Depth:</strong> {node?.depth || 'N/A'}
          </div>
          <div className="mb-0.5">
            <strong>Phase:</strong> {node?.move.phase || 'N/A'}
          </div>
          <div className="mb-0.5">
            <strong>Score:</strong> {node?.move.score || 'N/A'}
          </div>
        </div>

        {/* Compare Node Info */}
        {compareNode && (
          <div>
            <div className="mb-0.5">
              <strong>Move:</strong> {String(compareNode.move.move) || 'N/A'}
            </div>
            <div className="mb-0.5">
              <strong>Context:</strong> {compareNode?.move.context || 'N/A'}
              {compareNode?.move.context?.startsWith('pv') && (
                <>
                  {' ('}
                  {getPVLine(tree, compareNode).join(', ')}
                  {')'}
                </>
              )}
            </div>
            <div className="mb-0.5">
              <strong>Depth:</strong> {compareNode.depth || 'N/A'}
            </div>
            <div className="mb-0.5">
              <strong>Phase:</strong> {compareNode.move.phase || 'N/A'}
            </div>
            <div className="mb-0.5">
              <strong>Score:</strong> {compareNode.move.score || 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* Features Table */}
      {node.move.move !== 'Start' && (
        <div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="text-left p-1 font-semibold">Feature</th>
                {compareNode && (
                  <>
                    <th className="text-right p-1 font-semibold">Main Value</th>
                    <th className="text-right p-1 font-semibold">
                      Compare Value
                    </th>
                  </>
                )}
                {!compareNode && (
                  <th className="text-right p-1 font-semibold">Value</th>
                )}
                <th className="text-right p-1 font-semibold">Change</th>
              </tr>
            </thead>
            <tbody>
              {trace &&
                Object.entries(trace).map(([key, value]) => {
                  const { color, formatted } = getDiffAndColor(
                    key as PosFeature
                  )
                  const compareValue = compareNode
                    ? baseTrace[key as PosFeature]
                    : undefined
                  return (
                    <tr key={key}>
                      <td className="p-1">{key}</td>
                      {compareNode ? (
                        <>
                          <td className="p-1 text-right">
                            {typeof value === 'number' ? value.toFixed(2) : ''}
                          </td>
                          <td className="p-1 text-right">
                            {typeof compareValue === 'number'
                              ? compareValue.toFixed(2)
                              : ''}
                          </td>
                        </>
                      ) : (
                        <td className="p-1 text-right">
                          {typeof value === 'number' ? value.toFixed(2) : ''}
                        </td>
                      )}
                      <td className={`p-1 text-right font-semibold ${color}`}>
                        {formatted}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
            {/* Table footer commented out in original code */}
          </table>
        </div>
      )}
    </div>
  )
}

export default PosInfo
