import { Move } from '@/types/chess/Move'
import { AnalyzedMoveContext } from './keyMoments'
import { TraceComparison } from './traceAnalysis'

export interface MoveClassification {
  type: 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'neutral'
  description: string
  tacticalTheme?: 'sacrifice' | 'fork' | 'pin' | 'skewer' | 'discovery' | 'deflection'
  positionalTheme?: 'space' | 'weak_squares' | 'pawn_storm' | 'piece_coordination' | 'king_safety'
}

export function classifyMove(
  currentMove: Move,
  analyzedContext: AnalyzedMoveContext,
  normChange: number
): MoveClassification {
  const { advantageLost, playedMoveIsConsideredBest, traceComparisons } = analyzedContext

  // Check for brilliant moves (sacrifices that are objectively best)
  if (playedMoveIsConsideredBest && isMaterialSacrifice(traceComparisons)) {
    return {
      type: 'brilliant',
      description: 'A brilliant sacrifice!',
      tacticalTheme: 'sacrifice'
    }
  }

  // Check for positional themes
  const positionalTheme = getPositionalTheme(traceComparisons)

  // Standard classifications based on evaluation change
  if (normChange <= -100) {
    return { 
      type: 'blunder', 
      description: 'A serious blunder',
      positionalTheme 
    }
  } else if (normChange <= -50) {
    return { 
      type: 'mistake', 
      description: 'A mistake',
      positionalTheme 
    }
  } else if (normChange <= -20) {
    return { 
      type: 'inaccuracy', 
      description: 'An inaccuracy',
      positionalTheme 
    }
  } else if (playedMoveIsConsideredBest) {
    if (advantageLost < 10) {
      return { 
        type: 'great', 
        description: 'An excellent move',
        positionalTheme 
      }
    } else {
      return { 
        type: 'good', 
        description: 'A good move',
        positionalTheme 
      }
    }
  }

  return { 
    type: 'neutral', 
    description: 'A reasonable move',
    positionalTheme 
  }
}

function isMaterialSacrifice(traceComparisons?: TraceComparison[]): boolean {
  const materialComp = traceComparisons?.find(c => c.feature === 'Material')
  return materialComp ? materialComp.difference < -50 : false
}

function getPositionalTheme(traceComparisons?: TraceComparison[]): MoveClassification['positionalTheme'] {
  if (!traceComparisons || traceComparisons.length === 0) return undefined

  const topComparison = traceComparisons[0]
  
  switch (topComparison.feature) {
    case 'King Safety':
      return 'king_safety'
    case 'Space':
      return 'space'
    case 'Passed Pawns':
      return 'pawn_storm'
    case 'Bishops':
    case 'Knights':
    case 'Rooks':
    case 'Queens':
      return 'piece_coordination'
    default:
      return undefined
  }
}
