import React, { useState, useEffect, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { PosInfoProps } from '@/types/props/PosInfoProps'
import { Arrow } from 'react-chessboard/dist/chessboard/types'

const PADDING_PX = 16
const MAX_BOARD_SIZE = 440

const PosInfo: React.FC<PosInfoProps> = ({ node }) => {
  const [fen, setFen] = useState<string>('start')
  const [totalScore, setTotalScore] = useState<number | null>(null)

  // Compute arrow for last move (if available)
  const lastMoveArrow = useMemo(() => {
    if (node?.move && typeof node.move === 'string' && node.move.length === 4) {
      return [[node.move.slice(0, 2), node.move.slice(2, 4)]]
    }
    return []
  }, [node])

  useEffect(() => {
    if (node) {
      setFen(node.fen)
      setTotalScore(node.deep_score)
    } else {
      setFen('start')
      setTotalScore(null)
    }
  }, [node])

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        padding: 16,
        minWidth: 440,
        maxWidth: 440,
      }}
    >
      {/* Chessboard */}
      <div
        style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}
      >
        <div style={{ width: MAX_BOARD_SIZE, maxWidth: '100%' }}>
          <Chessboard
            position={fen}
            boardWidth={MAX_BOARD_SIZE - 2 * PADDING_PX}
            customDarkSquareStyle={{ backgroundColor: '#666666' }}
            customLightSquareStyle={{ backgroundColor: '#eaeaea' }}
            customArrows={lastMoveArrow as Arrow[]}
          />
        </div>
      </div>

      {/* Move Info */}
      <div
        style={{
          fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Move Info</div>
        <div style={{ marginBottom: 4 }}>
          <strong>Move:</strong> {node?.move || 'N/A'}
        </div>
        <div style={{ marginBottom: 4 }}>
          <strong>Context:</strong> {node?.context || 'N/A'}
        </div>
        <div style={{ marginBottom: 4 }}>
          <strong>Depth:</strong> {node?.depth || 'N/A'}
        </div>
        <div style={{ marginBottom: 4 }}>
          <strong>Score:</strong> {node?.deep_score || 'N/A'}
        </div>
      </div>

      {/* Features Table */}
      <div>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '4px 8px',
                  fontWeight: 600,
                }}
              >
                Feature
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '4px 8px',
                  fontWeight: 600,
                }}
              >
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {node?.trace &&
              Object.entries(node.trace).map(([key, value]) => (
                <tr key={key}>
                  <td style={{ padding: '4px 8px' }}>{key}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    {value.mg != null ? value.mg.toFixed(2) : 'N/A'}
                  </td>
                </tr>
              ))}
          </tbody>
          {totalScore !== undefined && (
            <tfoot>
              <tr>
                <td style={{ padding: '4px 8px', fontWeight: 700 }}>Total</td>
                <td
                  style={{
                    padding: '4px 8px',
                    textAlign: 'right',
                    fontWeight: 700,
                  }}
                  colSpan={1}
                >
                  {totalScore}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default PosInfo
