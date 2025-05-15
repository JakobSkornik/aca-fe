import React from 'react'
import { NodeProps } from '@/types/props/NodeProps'

const Node: React.FC<NodeProps> = ({
  node,
  diameter,
  depth = node.depth,
  color,
}) => {
  // Determine if this is the start node
  const isStartNode = node.move === 'start'

  // Determine if white's turn based on depth
  const isWhiteTurn = depth % 2 === 1

  // Set default colors based on turn
  const defaultColor = isWhiteTurn ? '#f0f0f0' : '#555555'
  const defaultTextColor = isWhiteTurn ? '#333333' : '#ffffff'

  // Use provided color or default
  const backgroundColor = color || defaultColor
  const textColor = defaultTextColor

  return (
    <div
      style={{
        width: `${diameter}px`,
        height: `${diameter}px`,
        borderRadius: '50%',
        backgroundColor: isStartNode ? 'transparent' : backgroundColor,
        color: textColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* For start node, render two concentric circles */}
      {isStartNode ? (
        <>
          {/* Outer circle */}
          <div
            style={{
              position: 'absolute',
              width: `${diameter}px`,
              height: `${diameter}px`,
              borderRadius: '50%',
              border: '2px solid #999',
              backgroundColor: 'transparent',
            }}
          />

          {/* Inner circle */}
          <div
            style={{
              position: 'absolute',
              width: `${diameter * 0.7}px`,
              height: `${diameter * 0.7}px`,
              borderRadius: '50%',
              backgroundColor,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '14px',
                color: textColor,
              }}
            >
              Start
            </div>
          </div>
        </>
      ) : (
        // Regular styling for non-start nodes
        <>
          <div
            style={{
              border: '2px solid #999',
              borderRadius: '50%',
              width: '100%',
              height: '100%',
              position: 'absolute',
              boxSizing: 'border-box',
            }}
          />

          {/* Move text */}
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '16px',
              marginBottom: '2px',
              zIndex: 1, // Ensure text is above background
            }}
          >
            {node.move}
          </div>

          {/* Score */}
          <div
            style={{
              fontSize: '12px',
              zIndex: 1, // Ensure text is above background
            }}
          >
            {(node.shallow_score / 100).toFixed(2)}
          </div>
        </>
      )}
    </div>
  )
}

export default Node
