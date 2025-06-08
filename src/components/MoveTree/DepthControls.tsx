import React from 'react'
import { DepthControlsProps } from '@/types/props/DepthControlsProps'

const DepthControls: React.FC<DepthControlsProps> = ({
  maxDepth,
  setMaxDepth,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <button
        className="hvr-shadow"
        onClick={() => setMaxDepth((prev) => Math.max(1, prev - 1))}
        disabled={maxDepth <= 1}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '4px',
          backgroundColor: '#e5e7eb',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          opacity: maxDepth <= 1 ? 0.5 : 1,
        }}
      >
        -
      </button>
      <span style={{ fontSize: '14px' }}>Nr. of plies: {maxDepth}</span>
      <button
        className="hvr-shadow"
        onClick={() => setMaxDepth((prev) => prev + 1)}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '4px',
          backgroundColor: '#e5e7eb',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        +
      </button>
    </div>
  )
}

export default DepthControls
