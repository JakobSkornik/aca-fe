import React from 'react'
import { Chessboard } from 'react-chessboard'
import { Arrow, Square } from 'react-chessboard/dist/chessboard/types'
import { MoveAnalysisNode } from '../types/AnalysisResult'

interface NodePopupProps {
  node: MoveAnalysisNode
  filterTraceData: (trace: Record<string, any>, phase: string) => Record<string, number | string>
}

export const NodePopup: React.FC<NodePopupProps> = ({ node, filterTraceData }) => {
  const phase = node.phase || 'mid';
  const phaseClass = 
    phase === 'early' ? 'phase-early' : 
    phase === 'mid' ? 'phase-mid' : 
    'phase-end';
  
  return (
    <div className="node-popup">
      <h3 className="popup-title">
        {node.move !== 'start' ? node.move : 'Starting Position'}
      </h3>
      <div className="node-info">
        ID: {node.id} | Parent ID: {node.parent} | 
        Phase: <span className={`phase-indicator ${phaseClass}`}>{phase}</span>
      </div>
      <div className="board-container">
        <Chessboard
          position={node.fen}
          boardWidth={270}
          customDarkSquareStyle={{ backgroundColor: '#666666' }}
          customLightSquareStyle={{ backgroundColor: '#eaeaea' }}
          customArrows={
            node.move !== 'start'
              ? ([
                  [
                    node.move.slice(0, 2) as Square,
                    node.move.slice(2, 4) as Square,
                  ],
                ] as Arrow[])
              : []
          }
        />
      </div>
      
      {node.trace && Object.keys(filterTraceData(node.trace, phase)).length > 0 && (
        <div className="trace-container">
          <h4>
            Analysis Trace ({phase === 'end' ? 'Endgame' : 'Middlegame'} values):
          </h4>
          <div className="trace-table-container">
            <table className="trace-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(filterTraceData(node.trace, phase))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td className="value-cell">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
