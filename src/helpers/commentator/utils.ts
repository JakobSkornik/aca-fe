import { Chess, Move as ChessJsMove } from 'chess.js'
import { parseTrace } from '../traceParser'

import { Move } from '@/types/chess/Move'
import { PosFeature } from '@/types/chess/Trace'
import { PV } from '@/types/chess/PV'
import { TraceFeature } from '@/types/chess/TraceFeature'
import { getOpeningName } from './openings'

export function getScore(move: Move): number {
  return typeof move.score === 'number' ? move.score : 0
}

export function isWhiteMove(node: Move): boolean {
  return node.depth % 2 === 0
}

export function formatCp(cp: number): string {
  return cp >= 0 ? `+${cp}` : `${cp}`
}

/**
 * Compares two scores from the perspective of the player whose turn it is or who made the move.
 * All input scores are from White's perspective.
 * @param newEvalForWhite The evaluation (from White's perspective) after the move.
 * @param oldEvalForWhite The evaluation (from White's perspective) before the move.
 * @param isPlayerMakingTheMoveWhite True if the player making the move (whose perspective we're taking) is White, false if Black.
 * @returns The change in evaluation from the perspective of the player making the move.
 *          Positive if the move improved their position, negative if it worsened it.
 */
export function compareScores(
  newEvalForWhite: number,
  oldEvalForWhite: number,
  isPlayerMakingTheMoveWhite: boolean
): number {
  if (!isPlayerMakingTheMoveWhite) {
    return newEvalForWhite - oldEvalForWhite
  } else {
    return oldEvalForWhite - newEvalForWhite
  }
}

export function sortMovesByScore(
  moves: Move[],
  isWhite: boolean
): Move[] {
  return moves.sort((a, b) => compareScores(getScore(b), getScore(a), isWhite))
}

export function getScoreDelta(
  node: Move,
  prevNode: Move
): number {
  const isWhite = isWhiteMove(node)
  return compareScores(getScore(node), getScore(prevNode), isWhite)
}

export function getMaterialBalance(move: Move | undefined): number {
  if (move?.trace?.Material && typeof move.trace.Material !== 'string') {
    const materialFeature = move.trace.Material as TraceFeature
    const phase = move.phase?.toLowerCase()

    if (phase === 'end' || phase === 'endgame') {
      return materialFeature.eg
    }
    return materialFeature.mg
  }
  return 0
}

export function getSortedPvs(
  pvs: PV[] | undefined,
  isForWhitePlayerToChoose: boolean
): PV[] {
  if (!pvs) return []
  return [...pvs].sort((pvA, pvB) => {
    const scoreA =
      pvA.score ?? (isForWhitePlayerToChoose ? -Infinity : Infinity)
    const scoreB =
      pvB.score ?? (isForWhitePlayerToChoose ? -Infinity : Infinity)

    if (isForWhitePlayerToChoose) {
      return scoreB - scoreA
    } else {
      return scoreA - scoreB
    }
  })
}

/**
 * Compares two SAN move strings using chess.js by applying them to a given FEN position.
 * @param san1 First SAN move string.
 * @param san2 Second SAN move string.
 * @param fen The FEN string of the position before either move is made.
 * @returns True if the moves are effectively the same, false otherwise or if moves are invalid.
 */
export function areSameMoveSAN(
  san1: string | undefined,
  san2: string | undefined,
  fen: string | undefined
): boolean {
  if (!san1 || !san2 || !fen) return false
  if (san1 === san2) return true // Quick check for exact match

  try {
    const chess1 = new Chess(fen)
    const chess2 = new Chess(fen)

    // Use { sloppy: true } to allow for slightly varied SAN (like missing check/mate indicators)
    const move1_details = chess1.move(san1, {
      strict: false,
    }) as ChessJsMove | null
    const move2_details = chess2.move(san2, {
      strict: false,
    }) as ChessJsMove | null

    if (move1_details && move2_details) {
      return (
        move1_details.from === move2_details.from &&
        move1_details.to === move2_details.to &&
        move1_details.piece === move2_details.piece &&
        (move1_details.promotion || null) === (move2_details.promotion || null)
      )
    }
    return false
  } catch {
    return false
  }
}

// New placeholder function for comparing traces
export function compareTraces(
  currentMovePlayed: Move | undefined,
  alternativePvEndPointTraceRaw: Move['trace'] | undefined,
  isCurrentMoveByWhite: boolean, // Player who made currentMovePlayed
  // featuresToCompare: PosFeature[] = ['Material', 'Mobility', 'KingSafety', 'Threats'] // Ideally use PosFeature[]
  featuresToCompare: string[] = [
    'Material',
    'Mobility',
    'KingSafety',
    'Threats',
    'Passed Pawns',
    'Space',
    'Bishops',
    'Knights',
    'Rooks',
    'Queens',
  ] // Use string for flexibility
): string | null {
  const parsedCurrentTrace = parseTrace(currentMovePlayed)
  // Create a dummy move object for parsing the alternative trace
  // Phase information from currentMovePlayed is used as a proxy for the phase at the end of the PV.
  const parsedAlternativeTrace = parseTrace({
    trace: alternativePvEndPointTraceRaw,
    phase: currentMovePlayed?.phase,
    // Other Move fields are not needed by parseTrace if only trace and phase are used
  } as Move)

  const differences: string[] = []

  for (const featureName of featuresToCompare) {
    const key = featureName as PosFeature // Cast to PosFeature for object access

    const valCurrent = parsedCurrentTrace[key] ?? 0
    const valAlternative = parsedAlternativeTrace[key] ?? 0

    // All trace values from parseTrace are from White's POV.
    // rawDiff > 0 means the alternative is better for White for this feature.
    const rawDiff = valAlternative - valCurrent

    let playerPerspectiveDiff: number
    if (isCurrentMoveByWhite) {
      playerPerspectiveDiff = rawDiff
    } else {
      // If Black made the move, a positive rawDiff (good for White) is bad for Black.
      playerPerspectiveDiff = -rawDiff
    }

    // Define a generic threshold for a "significant" difference.
    // This might need to be feature-specific in a more advanced implementation.
    const threshold = 0.1 // Example threshold, adjust as needed

    if (playerPerspectiveDiff > threshold) {
      differences.push(`improved ${featureName.toLowerCase()}`)
    } else if (playerPerspectiveDiff < -threshold) {
      differences.push(`worsened ${featureName.toLowerCase()}`)
    }
  }

  if (differences.length > 0) {
    return `The alternative could have led to: ${differences.join(', ')}.`
  }

  return null
}

export interface ScoreDiff {
  whiteDiff: number
  blackDiff: number
  isWhiteMove: boolean
}

export interface MoveClassification {
  tag: string
  description: string
  severity: 'good' | 'inaccuracy' | 'mistake' | 'blunder'
}

// Calculate score difference between two moves
export function calculateScoreDiff(currentMove: Move, previousMove: Move, moveIndex: number): ScoreDiff {
  const currentScore = currentMove.score ?? 0
  const previousScore = previousMove.score ?? 0
  
  // Score is always from white POV
  const rawDiff = currentScore - previousScore
  
  // Determine if this is a white or black move
  // Even indices (0, 2, 4...) are white moves, odd indices (1, 3, 5...) are black moves
  const isWhiteMove = moveIndex % 2 === 0
  
  if (isWhiteMove) {
    // For white moves, positive diff is good for white
    return {
      whiteDiff: rawDiff,
      blackDiff: -rawDiff,
      isWhiteMove: true
    }
  } else {
    // For black moves, negative diff is good for black (since score is from white POV)
    return {
      whiteDiff: rawDiff,
      blackDiff: -rawDiff,
      isWhiteMove: false
    }
  }
}

// Classify a move based on score difference
export function classifyMove(scoreDiff: ScoreDiff, currentMove?: Move): MoveClassification | null {
  const { whiteDiff, blackDiff, isWhiteMove } = scoreDiff
  
  // Check if this is an opening move - if so, don't classify it
  if (currentMove && getOpeningName(currentMove)) {
    return null
  }
  
  // Use the perspective of the player who made the move
  const playerDiff = isWhiteMove ? whiteDiff : blackDiff
  
  // Convert to pawns (score is in centipawns)
  const diffInPawns = playerDiff / 100
  
  // Determine classification based on the player's perspective
  if (diffInPawns >= 0.2) {
    return {
      tag: '!',
      description: 'Good move',
      severity: 'good'
    }
  } else if (diffInPawns <= -2.0) {
    return {
      tag: '??',
      description: 'Blunder',
      severity: 'blunder'
    }
  } else if (diffInPawns <= -1.0) {
    return {
      tag: '?',
      description: 'Mistake',
      severity: 'mistake'
    }
  } else if (diffInPawns <= -0.2) {
    return {
      tag: '?!',
      description: 'Inaccuracy',
      severity: 'inaccuracy'
    }
  }
  
  return null
}

// Get the appropriate score difference for classification
export function getClassificationScoreDiff(currentMove: Move, previousMove: Move, moveIndex: number): number {
  const scoreDiff = calculateScoreDiff(currentMove, previousMove, moveIndex)
  return scoreDiff.isWhiteMove ? scoreDiff.whiteDiff : scoreDiff.blackDiff
}

// Apply classification to a move
export function applyMoveClassification(move: Move, classification: MoveClassification | null): Move {
  if (classification) {
    return {
      ...move,
      annotation: classification.tag
    }
  }
  return move
}
