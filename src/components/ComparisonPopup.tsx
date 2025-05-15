import React from 'react'
import { Chessboard } from 'react-chessboard'
import { MoveAnalysisNode } from '../types/AnalysisResult'

interface ComparisonPopupProps {
  earlierNode: MoveAnalysisNode
  laterNode: MoveAnalysisNode
  scoreDiff: number
  filterTraceData: (trace: Record<string, any>, phase: string) => Record<string, number | string>
  onClose: () => void
}

export const ComparisonPopup: React.FC<ComparisonPopupProps> = ({
  earlierNode,
  laterNode,
  scoreDiff,
  filterTraceData,
  onClose,
}) => {
  const earlierPhase = earlierNode.phase || 'mid';
  const laterPhase = laterNode.phase || 'mid';
  
  const earlierTrace = filterTraceData(earlierNode.trace || {}, earlierPhase);
  const laterTrace = filterTraceData(laterNode.trace || {}, laterPhase);
  
  // Get all unique keys
  const allKeys = Array.from(
    new Set([...Object.keys(earlierTrace), ...Object.keys(laterTrace)])
  ).sort();
  
  return (
    <div className="comparison-popup">
      <div className="popup-header">
        <h3>Position Comparison</h3>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>
      
      <div className="positions-container">
        <div className="position-column">
          <h4>First Position</h4>
          <Chessboard
            position={earlierNode.fen}
            boardWidth={200}
            customDarkSquareStyle={{ backgroundColor: '#666666' }}
            customLightSquareStyle={{ backgroundColor: '#eaeaea' }}
          />
          <p className="position-move">
            {earlierNode.move !== 'start' ? earlierNode.move : 'Start'}
          </p>
          <p className="position-score">
            Score: {(earlierNode.shallow_score / 100).toFixed(2)}
          </p>
        </div>
        
        <div className="position-column">
          <h4>Second Position</h4>
          <Chessboard
            position={laterNode.fen}
            boardWidth={200}
            customDarkSquareStyle={{ backgroundColor: '#666666' }}
            customLightSquareStyle={{ backgroundColor: '#eaeaea' }}
          />
          <p className="position-move">{laterNode.move}</p>
          <p className="position-score">
            Score: {(laterNode.shallow_score / 100).toFixed(2)}
          </p>
        </div>
      </div>
      
      {/* Score difference */}
      <div className="score-difference">
        <p className={scoreDiff > 0 ? 'positive' : 'negative'}>
          Score Change: {(scoreDiff / 100).toFixed(2)}
        </p>
      </div>
      
      {/* Trace comparison */}
      <div className="trace-comparison">
        <h4>
          Evaluation Comparison:
          <span className="phase-info">
            (Earlier: {earlierPhase} phase, Later: {laterPhase} phase)
          </span>
        </h4>
        
        <div className="trace-table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Earlier</th>
                <th>Later</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map(key => {
                const earlierValue = typeof earlierTrace[key] === 'number' ? earlierTrace[key] : null;
                const laterValue = typeof laterTrace[key] === 'number' ? laterTrace[key] : null;
                const diff = laterValue !== null && earlierValue !== null ? laterValue - earlierValue : null;
                const hasChange = diff !== null && Math.abs(diff) > 0.01;
                
                return (
                  <tr key={key}>
                    <td>{key}</td>
                    <td className="value-cell">
                      {earlierValue !== null ? earlierValue.toFixed(2) : '-'}
                    </td>
                    <td className="value-cell">
                      {laterValue !== null ? laterValue.toFixed(2) : '-'}
                    </td>
                    <td className={`value-cell ${hasChange ? (diff! > 0 ? 'positive' : 'negative') : ''}`}>
                      {diff !== null ? (diff > 0 ? '+' : '') + diff.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
