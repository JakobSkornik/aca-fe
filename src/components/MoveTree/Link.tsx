import React from 'react'
import { LinkProps } from '@/types/props/LinkProps'

const Link: React.FC<LinkProps> = ({ 
  spacing, 
  color = '#999',
  vertical = 0  // Default to horizontal line
}) => {
  // If there's a vertical offset, render a diagonal or L-shaped line
  if (vertical !== 0) {
    return (
      <svg
        style={{
          position: 'absolute',
          left: `-${spacing}px`,
          top: '50%',
          width: `${spacing}px`,
          height: `${Math.abs(vertical)}px`,
          transform: vertical < 0 
            ? `translateY(-100%)` 
            : `translateY(-${spacing/2}px)`,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <path
          d={`M0,${vertical < 0 ? Math.abs(vertical) : 0} C${spacing/3},${vertical < 0 ? Math.abs(vertical) : 0} ${spacing*2/3},${vertical > 0 ? Math.abs(vertical) : 0} ${spacing},${vertical > 0 ? Math.abs(vertical) : 0}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
        />
      </svg>
    );
  }
  
  // Simple horizontal line for mainline connections
  return (
    <div
      style={{
        position: 'absolute',
        left: `-${spacing}px`,
        top: '50%',
        width: `${spacing}px`,
        height: '2px',
        backgroundColor: color,
        transform: 'translateY(-50%)',
      }}
    />
  )
}

export default Link
