import React from 'react'
import { Move } from '@/types/chess/Move'
import { FeatureTableHelpers } from '@/helpers/featureTableHelpers'

interface FeatureChartProps {
  featureName: string
  moves: Move[]
  currentIndex: number
  width?: number
  height?: number
}

const FeatureChart: React.FC<FeatureChartProps> = ({ 
  featureName, 
  moves, 
  currentIndex, 
  width = 60, 
  height = 30 
}) => {
  // Get feature values for the last 10 moves (or fewer if not available)
  const getFeatureValues = () => {
    const values: number[] = []
    const startIndex = Math.max(0, currentIndex - 9)
    
    for (let i = startIndex; i <= currentIndex; i++) {
      const move = moves[i]
      if (move && move.trace) {
        const traceFeature = move.trace[featureName]
        if (traceFeature && typeof traceFeature === 'object' && 'eg' in traceFeature) {
          values.push((traceFeature as any).eg)
        } else {
          values.push(0)
        }
      } else {
        values.push(0)
      }
    }
    
    return values
  }

  const values = getFeatureValues()
  
  if (values.length === 0) {
    return (
      <div 
        className="bg-lightest-gray rounded w-full h-full"
      />
    )
  }

  // Calculate chart dimensions
  const padding = 4
  
  // Find min/max for scaling
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1 // Avoid division by zero
  
  // Generate SVG path
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div 
      className="bg-lightest-gray rounded flex justify-end w-full h-full"
    >
      <svg 
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ padding: `${padding}px` }}
      >
        <polyline
          fill="none"
          stroke="var(--darkest-gray)"
          strokeWidth="2"
          points={points}
        />
        <polygon
          fill="var(--dark-gray)"
          points={`${points} 100,100 0,100`}
        />
      </svg>
    </div>
  )
}

export default FeatureChart 