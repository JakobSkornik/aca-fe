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
    if (node?.move && typeof node.move === 'string' && node.move.length === 4) {
      return [[node.move.slice(0, 2), node.move.slice(2, 4), 'var(--orange)']]
    }
    return []
  }, [node])

  const compareFen = compareNode?.fen
  const compareArrow = useMemo(() => {
    if (
      compareNode?.move &&
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
    if (node) {
      setFen(node.fen)
    } else {
      setFen('start')
    }
  }, [node])

  // If no node, return null
  if (!node) return null

  // Find parent node for feature diff
  const trace = parseTrace(node)
  const baseTrace = compareNode
    ? parseTrace(compareNode)
    : parseTrace(getParent(tree, node)!)

  const isWhite = node.depth % 2 === 1 ? true : false

  // Helper to get diff and color
  function getDiffAndColor(key: PosFeature) {
    const prev = baseTrace[key]
    const curr = trace[key]
    let diff = prev - curr

    if (!isWhite) {
      diff = -diff
    }

    let color = ''
    if (diff > 0) color = 'green'
    if (diff < 0) color = 'red'

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
    <div
      style={{
        background: 'var(--lightest-gray)',
        border: '1px solid #ccc',
        borderRadius: 8,
        boxShadow: '0 0px 12px 12px rgba(0,0,0,0.15)',
        padding: 8,
        minWidth: 270,
        maxWidth: 520,
        position: 'relative',
      }}
    >
      {/* X Button */}
      {onClose && (
        <button
          className="hvr-shadow"
          onClick={onClose}
          style={{
            zIndex: 1000,
            width: 24,
            height: 24,
            background: 'var(--dark-gray)',
            borderRadius: '8px',
            border: 'none',
            fontSize: 16,
            cursor: 'pointer',
            color: '#888',
          }}
          aria-label="Close"
        >
          ×
        </button>
      )}
      {/* Chessboards */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
          justifyContent: 'center',
        }}
      >
        <div>
          <Chessboard
            position={fen}
            boardWidth={224}
            customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
            customArrows={lastMoveArrow as Arrow[]}
          />
          <div style={{ textAlign: 'center', fontSize: 11, marginTop: 2 }}>
            Main ({node.move})
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
            <div style={{ textAlign: 'center', fontSize: 11, marginTop: 2 }}>
              Compare ({compareNode.move})
            </div>
          </div>
        )}
      </div>

      {/* Move Info */}
      <div
        style={{
          fontSize: 13,
          marginBottom: 8,
          display: compareNode ? 'flex' : 'block',
          justifyContent: compareNode ? 'center' : 'flex-start',
          gap: compareNode ? 24 : 0,
        }}
      >
        {/* Main Node Info */}
        <div>
          <div style={{ marginBottom: 2 }}>
            <strong>Move:</strong> {node?.move || 'N/A'}
          </div>
          <div style={{ marginBottom: 2 }}>
            <strong>Context:</strong> {node?.context || 'N/A'}
            {node?.context?.startsWith('pv') && (
              <>
                {' ('}
                {getPVLine(tree, node).join(', ')}
                {')'}
              </>
            )}
          </div>
          <div style={{ marginBottom: 2 }}>
            <strong>Depth:</strong> {node?.depth || 'N/A'}
          </div>
          <div style={{ marginBottom: 2 }}>
            <strong>Phase:</strong> {node?.phase || 'N/A'}
          </div>
          <div style={{ marginBottom: 2 }}>
            <strong>Score:</strong> {node?.deep_score || 'N/A'}
          </div>
        </div>
        {/* Compare Node Info */}
        {compareNode && (
          <div>
            <div style={{ marginBottom: 2 }}>
              <strong>Move:</strong> {compareNode.move || 'N/A'}
            </div>
            <div style={{ marginBottom: 2 }}>
              <strong>Context:</strong> {compareNode?.context || 'N/A'}
              {compareNode?.context?.startsWith('pv') && (
                <>
                  {' ('}
                  {getPVLine(tree, compareNode).join(', ')}
                  {')'}
                </>
              )}
            </div>
            <div style={{ marginBottom: 2 }}>
              <strong>Depth:</strong> {compareNode.depth || 'N/A'}
            </div>
            <div style={{ marginBottom: 2 }}>
              <strong>Phase:</strong> {compareNode.phase || 'N/A'}
            </div>
            <div style={{ marginBottom: 2 }}>
              <strong>Score:</strong> {compareNode.deep_score || 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* Features Table */}
      {node.move !== 'start' && (
        <div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '2px 4px',
                    fontWeight: 600,
                  }}
                >
                  Feature
                </th>
                {compareNode && (
                  <>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '2px 4px',
                        fontWeight: 600,
                      }}
                    >
                      Main Value
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '2px 4px',
                        fontWeight: 600,
                      }}
                    >
                      Compare Value
                    </th>
                  </>
                )}
                {!compareNode && (
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '2px 4px',
                      fontWeight: 600,
                    }}
                  >
                    Value
                  </th>
                )}
                <th
                  style={{
                    textAlign: 'right',
                    padding: '2px 4px',
                    fontWeight: 600,
                  }}
                >
                  Change
                </th>
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
                      <td style={{ padding: '2px 4px' }}>{key}</td>
                      {compareNode ? (
                        <>
                          <td
                            style={{ padding: '2px 4px', textAlign: 'right' }}
                          >
                            {typeof value === 'number' ? value.toFixed(2) : ''}
                          </td>
                          <td
                            style={{ padding: '2px 4px', textAlign: 'right' }}
                          >
                            {typeof compareValue === 'number'
                              ? compareValue.toFixed(2)
                              : ''}
                          </td>
                        </>
                      ) : (
                        <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                          {typeof value === 'number' ? value.toFixed(2) : ''}
                        </td>
                      )}
                      <td
                        style={{
                          padding: '2px 4px',
                          textAlign: 'right',
                          color,
                          fontWeight: 600,
                        }}
                      >
                        {formatted}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
            {/* {totalScore !== undefined && (
              <tfoot>
                <tr>
                  <td style={{ padding: '2px 4px', fontWeight: 700 }}>Total</td>
                  <td
                    style={{
                      padding: '2px 4px',
                      textAlign: 'right',
                      fontWeight: 700,
                    }}
                    colSpan={compareNode ? 3 : 2}
                  >
                    {totalScore}
                  </td>
                </tr>
              </tfoot>
            )} */}
          </table>
        </div>
      )}
    </div>
  )
}

export default PosInfo
