import React, { useState } from 'react'
import Chart from './Chart'
import PosInfo from './PosInfo'
import DepthControls from './DepthControls'
import { MoveTreeProps } from '@/types/props/MoveTreeProps'
import { MoveAnalysisNode } from '@/types/AnalysisResult'

const MoveTree: React.FC<MoveTreeProps> = ({ moveTree, onClose }) => {
  const [maxDepth, setMaxDepth] = useState(10)
  const [hoveredNode, setHoveredNode] = useState<MoveAnalysisNode | null>(null)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          width: '95vw',
          height: '90vh',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            overflow: 'visible',
            alignItems: 'center',
          }}
        >
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              margin: '0 auto',
              fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
            }}
          >
            Move Tree
          </h2>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Chart (70%) */}
          <div
            style={{
              width: '70%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Chart
              moveTree={moveTree}
              maxDepth={maxDepth}
              onHoverNode={setHoveredNode}
            />
            <DepthControls maxDepth={maxDepth} setMaxDepth={setMaxDepth} />
          </div>
          {/* PosInfo (30%) */}
          <div
            style={{
              width: '40%',
              height: '100%',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '32px 16px 16px 16px',
              boxSizing: 'border-box',
            }}
          >
            <PosInfo node={hoveredNode} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MoveTree
