import { Move } from '@/types/chess/Move'
import { TraceFeature } from '@/types/chess/TraceFeature'

export interface FeatureValue {
  name: string
  value: number
}

export interface FeatureDiff {
  name: string
  currentValue: number
  previousValue: number
  whiteDiff: number
  blackDiff: number
}

export class FeatureTableHelpers {
  // Get feature values from a move's trace
  static getFeatureValues(move: Move): FeatureValue[] {
    if (!move.trace) return []
    
    return Object.entries(move.trace)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, value]) => typeof value === 'object' && value !== null && 'eg' in value && 'mg' in value)
      .map(([name, value]) => {
        const traceFeature = value as TraceFeature
        // Use eg (endgame) value for now, could be configurable
        return {
          name,
          value: traceFeature.eg
        }
      })
  }

  // Calculate differences between two moves
  static calculateFeatureDiffs(currentMove: Move, previousMove: Move): FeatureDiff[] {
    const currentFeatures = this.getFeatureValues(currentMove)
    const previousFeatures = this.getFeatureValues(previousMove)
    
    const allFeatureNames = new Set([
      ...currentFeatures.map(f => f.name),
      ...previousFeatures.map(f => f.name)
    ])
    
    return Array.from(allFeatureNames).map(featureName => {
      const currentFeature = currentFeatures.find(f => f.name === featureName)
      const previousFeature = previousFeatures.find(f => f.name === featureName)
      
      const currentValue = currentFeature?.value ?? 0
      const previousValue = previousFeature?.value ?? 0
      const diff = currentValue - previousValue
      
      return {
        name: featureName,
        currentValue,
        previousValue,
        whiteDiff: diff,
        blackDiff: -diff // Features are from white POV, so black sees opposite
      }
    })
  }

  // Format a difference value for display
  static formatDiff(value: number): string {
    if (value === 0) return '0.00'
    if (value > 0) return value.toFixed(2)
    return `-${Math.abs(value).toFixed(2)}`
  }

  // Get CSS classes for difference styling
  static getDiffClasses(value: number): string {
    if (value === 0) return 'text-gray-600'
    if (value > 0) return 'text-green-600'
    return 'text-red-600'
  }

  // Get all available feature names from a list of moves
  static getAllFeatureNames(moves: Move[]): string[] {
    const featureNames = new Set<string>()
    
    moves.forEach(move => {
      if (move.trace) {
        Object.entries(move.trace).forEach(([name, value]) => {
          if (typeof value === 'object' && value !== null && 'eg' in value && 'mg' in value) {
            featureNames.add(name)
          }
        })
      }
    })
    
    return Array.from(featureNames).sort()
  }
} 