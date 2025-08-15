import { Move } from '@/types/chess/Move'
import { getOpeningComment } from './openings'
import { parseTrace } from '../traceParser'
import { chessPositionManager } from '../ChessPositionManager'
import { Move as ChessMove } from 'chess.js'

export interface Comment {
  type: 'opening' | 'missed_opportunity' | 'best_move' | 'phase_transition' | 'blunder' | 'mistake' | 'inaccuracy'
  text: string
  priority: number // Higher priority comments are shown first
}

export interface CommentContext {
  currentMove: Move
  previousMove: Move | null
  moveIndex: number
  pv1Moves: Move[]
  pv2Moves: Move[]
  isWhiteMove: boolean
  positionContext?: {
    isInCheck: boolean
    isCheckmate: boolean
    isDraw: boolean
    isStalemate: boolean
    gamePhase: 'opening' | 'middlegame' | 'endgame'
    turn: 'w' | 'b'
    moveNumber: number
    castlingRights: {
      w: { k: boolean; q: boolean }
      b: { k: boolean; q: boolean }
    }
    lastMove: ChessMove | null
  }
}

// Piece mapper for move display
const pieceMapper = {
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔'
}

// Blunder comments
const blunderComments = [
  "Blunder! Your move massively worsened your position in the game",
  "This move dramatically changes the evaluation in your opponent's favor",
  "A critical error that significantly weakens your position",
]

// Mistake comments
const mistakeComments = [
  "This mistake significantly weakens your position",
  "A significant error that worsens your position",
  "This move allows your opponent to improve their position",
]

// Inaccuracy comments
const inaccuracyComments = [
  "This move is slightly inaccurate, missing a better opportunity",
  "A small error that gives your opponent a slight edge",
  "This inaccuracy allows your opponent to improve their position",
  "Missing a slightly better move here",
  "A minor error that slightly weakens your position"
]

/**
 * Generate all available comments for a given move context
 */
export function generateComments(context: CommentContext): Comment[] {
  const comments: Comment[] = []

  // Update chess position manager with current move
  chessPositionManager.updatePosition(context.currentMove)

  // Get position context from chess.js
  const positionContext = chessPositionManager.getPositionContext()
  context.positionContext = positionContext

  // Check for opening comment first
  const openingComment = getOpeningComment(context.currentMove)
  if (openingComment) {
    // If we have an opening comment, return only that
    return [{
      type: 'opening',
      text: openingComment,
      priority: 1
    }]
  }

  // Check for chess.js specific comments (check, checkmate, etc.)
  const chessJsComment = generateChessJsComment(context)
  if (chessJsComment) {
    comments.push(chessJsComment)
  }

  // Check if this is the best move first
  const bestMoveComment = checkBestMove(context)
  if (bestMoveComment) {
    // If it's the best move, return only that comment
    return [bestMoveComment]
  }

  // Check for move quality (blunder, mistake, inaccuracy)
  const qualityComment = checkMoveQuality(context)
  if (qualityComment) {
    comments.push(qualityComment)

    // For blunders and mistakes, don't add missed opportunity comments (too much information)
    if (qualityComment.type === 'blunder' || qualityComment.type === 'mistake') {
      return comments.sort((a, b) => b.priority - a.priority)
    }
  }

  // Check for missed opportunity (only for inaccuracies and non-quality moves)
  const missedOpportunityComment = checkMissedOpportunity(context)
  if (missedOpportunityComment) {
    comments.push(missedOpportunityComment)
  }

  // Sort by priority (higher priority first)
  return comments.sort((a, b) => b.priority - a.priority)
}

/**
 * Generate chess.js specific comments based on position state
 */
function generateChessJsComment(context: CommentContext): Comment | null {
  if (!context.positionContext) return null

  const { isInCheck, isCheckmate, isDraw, isStalemate, gamePhase, lastMove } = context.positionContext

  // Check for checkmate
  if (isCheckmate) {
    return {
      type: 'best_move',
      text: 'Checkmate! The game is over.',
      priority: 10
    }
  }

  // Check for check
  if (isInCheck) {
    return {
      type: 'best_move',
      text: 'Check! The king is under attack.',
      priority: 8
    }
  }

  // Check for draw
  if (isDraw) {
    return {
      type: 'phase_transition',
      text: 'The game is a draw.',
      priority: 7
    }
  }

  // Check for stalemate
  if (isStalemate) {
    return {
      type: 'phase_transition',
      text: 'Stalemate! The game is a draw.',
      priority: 7
    }
  }

  // Check for phase transitions
  if (gamePhase === 'endgame' && context.moveIndex > 20) {
    return {
      type: 'phase_transition',
      text: 'The game has entered the endgame phase.',
      priority: 3
    }
  }

  // Check for special moves
  if (lastMove) {
    const moveText = formatMoveWithPiece(context.currentMove)
    
    // Check for castling
    if (lastMove.san?.includes('O-O')) {
      return {
        type: 'best_move',
        text: `${moveText} - Kingside castling to improve king safety.`,
        priority: 4
      }
    }
    
    if (lastMove.san?.includes('O-O-O')) {
      return {
        type: 'best_move',
        text: `${moveText} - Queenside castling to improve king safety.`,
        priority: 4
      }
    }

    // Check for captures
    if (lastMove.captured) {
      return {
        type: 'best_move',
        text: `${moveText} - Capturing the ${lastMove.captured}.`,
        priority: 5
      }
    }

    // Check for pawn moves
    if (lastMove.piece === 'p') {
      if (lastMove.to[1] === '8' || lastMove.to[1] === '1') {
        return {
          type: 'best_move',
          text: `${moveText} - Pawn promotion!`,
          priority: 6
        }
      }
    }
  }

  return null
}

/**
 * Check if this move is the best move (same as PV1)
 */
function checkBestMove(context: CommentContext): Comment | null {
  if (context.pv1Moves.length === 0) return null

  const pv1FirstMove = context.pv1Moves[0]
  if (!pv1FirstMove || !pv1FirstMove.move) return null

  // Check if our move is the same as the first PV1 move
  if (context.currentMove.move === pv1FirstMove.move) {
    return {
      type: 'best_move',
      text: 'Best move possible.',
      priority: 2
    }
  }

  return null
}

/**
 * Format move with piece symbol (e.g., "♟f4")
 */
function formatMoveWithPiece(move: Move): string {
  if (!move.move || !move.piece) return move.move || ''

  const piece = move.piece.toLowerCase()
  const pieceSymbol = pieceMapper[piece as keyof typeof pieceMapper] || piece
  const destination = move.move.slice(2) // Extract destination from move string

  return `${pieceSymbol}${destination}`
}

/**
 * Get differences between current position and PV sequence end, including position quality assessment
 */
function getDifferencesBetweenPositions(currentMove: Move, pvMoves: Move[], isWhiteMove: boolean): string {
  if (pvMoves.length === 0) return ''

  try {
    const currentTrace = parseTrace(currentMove)
    const pvEndMove = pvMoves[pvMoves.length - 1]
    const pvEndTrace = parseTrace(pvEndMove)

    // Analyze position quality changes
    const currentScore = currentMove.score ?? 0
    const pvEndScore = pvEndMove.score ?? 0
    
    // Convert scores to perspective of the player who made the move
    const currentScoreFromPerspective = isWhiteMove ? currentScore : -currentScore
    const pvEndScoreFromPerspective = isWhiteMove ? pvEndScore : -pvEndScore
    
    // Determine position quality categories with more granular assessment
    const getPositionQuality = (score: number): 'very_bad' | 'bad' | 'neutral' | 'good' | 'very_good' => {
      const absScore = Math.abs(score / 100)
      if (absScore <= 0.5) return 'neutral'
      if (absScore <= 1.5) return score > 0 ? 'good' : 'bad'
      if (absScore <= 3.0) return score > 0 ? 'good' : 'bad'
      return score > 0 ? 'very_good' : 'very_bad'
    }
    
    const currentQuality = getPositionQuality(currentScoreFromPerspective)
    const pvEndQuality = getPositionQuality(pvEndScoreFromPerspective)
    
    // Calculate the magnitude of improvement/worsening
    const scoreDifference = pvEndScoreFromPerspective - currentScoreFromPerspective
    const scoreDifferenceInPawns = Math.abs(scoreDifference / 100)
    
    // Analyze feature differences
    const features = ['Material', 'Mobility', 'KingSafety', 'Threats', 'Passed Pawns', 'Space', 'Bishops', 'Knights', 'Rooks', 'Queens']
    const differences: { feature: string; diff: number; improvement: boolean }[] = []

    for (const feature of features) {
      const currentVal = currentTrace[feature as keyof typeof currentTrace] || 0
      const pvVal = pvEndTrace[feature as keyof typeof pvEndTrace] || 0
      const diff = pvVal - currentVal // Positive means improvement

      if (Math.abs(diff) > 0.1) { // Only include significant differences
        differences.push({ 
          feature, 
          diff: Math.abs(diff), 
          improvement: diff > 0 
        })
      }
    }

    // Sort by difference magnitude and take top 3
    differences.sort((a, b) => b.diff - a.diff)
    const topDifferences = differences.slice(0, 3)
    const improvedFeatures = topDifferences.filter(d => d.improvement)
    // const worsenedFeatures = topDifferences.filter(d => !d.improvement)

    // Build position quality analysis with magnitude consideration
    let positionQualityText = ''
    
    // Check if the alternative move would preserve the position (prevent worsening)
    const isPreservingPosition = scoreDifference > 0 && pvEndScoreFromPerspective >= 0 && currentScoreFromPerspective < 0
    
    // If there's a significant score difference, describe the improvement/worsening
    if (scoreDifferenceInPawns > 0.5) {
      if (scoreDifference > 0) {
        // Improvement
        if (isPreservingPosition) {
          // The alternative would have preserved a good/neutral position
          if (Math.abs(currentScoreFromPerspective / 100) > 1.0) {
            positionQualityText = 'This would have preserved your position.'
          } else {
            positionQualityText = 'This would have preserved the equal position.'
          }
        } else if (scoreDifferenceInPawns > 2.0) {
          positionQualityText = 'This would have significantly improved the position.'
        } else if (scoreDifferenceInPawns > 1.0) {
          positionQualityText = 'This would have improved the position.'
        } else {
          positionQualityText = 'This would have slightly improved the position.'
        }
      } else {
        // Worsening
        if (scoreDifferenceInPawns > 2.0) {
          positionQualityText = 'This significantly worsened the position.'
        } else if (scoreDifferenceInPawns > 1.0) {
          positionQualityText = 'This worsened the position.'
        } else {
          positionQualityText = 'This slightly worsened the position.'
        }
      }
    } else if (currentQuality !== pvEndQuality) {
      // Quality category changed
      if (currentQuality === 'very_bad' && pvEndQuality === 'bad') {
        positionQualityText = 'This would have improved the position from very bad to bad.'
      } else if (currentQuality === 'bad' && pvEndQuality === 'neutral') {
        positionQualityText = 'This would have improved the position from bad to equal.'
      } else if (currentQuality === 'bad' && pvEndQuality === 'good') {
        positionQualityText = 'This would have turned a bad position into a good one.'
      } else if (currentQuality === 'neutral' && pvEndQuality === 'good') {
        positionQualityText = 'This would have improved the position from equal to good.'
      } else if (currentQuality === 'good' && pvEndQuality === 'neutral') {
        positionQualityText = 'This would have worsened the position from good to equal.'
      } else if (currentQuality === 'good' && pvEndQuality === 'bad') {
        positionQualityText = 'This would have turned a good position into a bad one.'
      } else if (currentQuality === 'neutral' && pvEndQuality === 'bad') {
        positionQualityText = 'This would have worsened the position from equal to bad.'
      } else if (currentQuality === 'bad' && pvEndQuality === 'very_bad') {
        positionQualityText = 'This worsened the position from bad to very bad.'
      }
    }

    // Build feature analysis
    let featureText = ''
    if (improvedFeatures.length > 0) {
      const featureNames = improvedFeatures.map(d => d.feature.toLowerCase())
      featureText = `The alternative would have improved ${featureNames.join(', ')}.`
    }

    // Combine position quality and feature analysis
    if (positionQualityText && featureText) {
      return `${positionQualityText} ${featureText}`
    } else if (positionQualityText) {
      return positionQualityText
    } else if (featureText) {
      return featureText
    }

    return 'The alternative move would have been better.'
  } catch (error) {
    console.error('Error analyzing position differences:', error)
    return ''
  }
}

/**
 * Get position evaluation context based on score from the perspective of the player who made the move
 */
function getPositionContext(score: number, isWhiteMove: boolean): string {
  const scoreInPawns = score / 100

  // For Black moves, we need to invert the perspective since scores are from White's perspective
  const effectiveScore = isWhiteMove ? scoreInPawns : -scoreInPawns
  const absScore = Math.abs(effectiveScore)
  if (absScore <= 0.5) {
    return 'neutral'
  } else if (absScore > 3.0) {
    return effectiveScore > 0 ? 'very good' : 'very bad'
  } else {
    return effectiveScore > 0 ? 'winning' : 'losing'
  }
}

/**
 * Generate contextual suffix based on position evaluation
 */
function getContextualSuffix(score: number, isWhiteMove: boolean): string {
  const context = getPositionContext(score, isWhiteMove)

  if (context === 'neutral') {
    return ' but position is still roughly equal.'
  } else if (context === 'very good') {
    return isWhiteMove ? ' and maintains a very strong position.' : ' and maintains a very strong position.'
  } else if (context === 'very bad') {
    return isWhiteMove ? ' and White is in a very difficult position.' : ' and Black is in a very difficult position.'
  } else if (context === 'winning') {
    return isWhiteMove ? ' but still winning.' : ' but still winning.'
  } else {
    return isWhiteMove ? ' and White is losing.' : ' and Black is losing.'
  }
}

/**
 * Check for move quality (blunder, mistake, inaccuracy)
 */
function checkMoveQuality(context: CommentContext): Comment | null {
  if (!context.previousMove || context.previousMove.score === undefined || context.currentMove.score === undefined) {
    return null
  }

  const previousScore = context.previousMove.score
  const currentScore = context.currentMove.score

  // Calculate score change from the perspective of the player making the move
  // Scores are always from White's perspective, so:
  // - For White moves: positive change means White improved
  // - For Black moves: negative change means Black improved (White's score decreased)
  const scoreChange = context.isWhiteMove ? currentScore - previousScore : previousScore - currentScore
  const scoreChangeInPawns = scoreChange / 100

  // Select random comment from appropriate array
  let commentText: string
  let commentType: 'blunder' | 'mistake' | 'inaccuracy'

  if (scoreChangeInPawns <= -2.0) {
    // Blunder
    commentText = blunderComments[Math.floor(Math.random() * blunderComments.length)]
    commentType = 'blunder'
  } else if (scoreChangeInPawns <= -1.0) {
    // Mistake
    commentText = mistakeComments[Math.floor(Math.random() * mistakeComments.length)]
    commentType = 'mistake'
  } else if (scoreChangeInPawns <= -0.2) {
    // Inaccuracy
    commentText = inaccuracyComments[Math.floor(Math.random() * inaccuracyComments.length)]
    commentType = 'inaccuracy'
  } else {
    return null
  }

  // Add contextual information based on CURRENT position (after the move)
  const contextualSuffix = getContextualSuffix(currentScore, context.isWhiteMove) ?? '.'
  commentText += contextualSuffix

  // Add better move suggestion to the comment
  let betterMoveSuggestion = ''
  if (context.pv1Moves.length > 0) {
    const pv1FirstMove = context.pv1Moves[0]
    if (pv1FirstMove && pv1FirstMove.move && pv1FirstMove.move !== context.currentMove.move) {
      const betterMove = formatMoveWithPiece(pv1FirstMove)
      betterMoveSuggestion = ` A better move would be ${betterMove}.`

      // Add feature improvements if available
      const featureDifferences = getDifferencesBetweenPositions(context.currentMove, context.pv1Moves, context.isWhiteMove)
      if (featureDifferences) {
        betterMoveSuggestion += ` ${featureDifferences}`
      }
    }
  }

  return {
    type: commentType,
    text: commentText + betterMoveSuggestion,
    priority: 4 // High priority for quality comments
  }
}

/**
 * Check for missed opportunities (only when we improve our position)
 */
function checkMissedOpportunity(context: CommentContext): Comment | null {
  if (context.pv1Moves.length === 0) return null

  const pv1FirstMove = context.pv1Moves[0]
  if (!pv1FirstMove || !pv1FirstMove.score || !context.currentMove.score) return null

  // Calculate score differences
  const pv1Score = pv1FirstMove.score
  const currentScore = context.currentMove.score

  // Only show missed opportunity if we could have improved our position
  const scoreDifference = context.isWhiteMove ? pv1Score - currentScore : currentScore - pv1Score

  // Check if we missed a significant opportunity (>30cp difference) AND it would improve our position
  if (scoreDifference > 30) {
    // Check if our move isn't a blunder (change from previous position)
    if (context.previousMove && context.previousMove.score !== undefined) {
      const previousScore = context.previousMove.score
      const changeFromPrevious = context.currentMove.score - previousScore

      // If the change isn't too bad (not worse than -20cp), it's a missed opportunity
      if (changeFromPrevious > -20) {
        // Generate the better move sequences
        const pv1Sequence = context.pv1Moves.slice(0, 3)
          .map(move => formatMoveWithPiece(move))
          .join(' ')

        let sequenceText = `A better move sequence would be: ${pv1Sequence}.`

        // Add PV2 sequence if available and different
        if (context.pv2Moves.length > 0) {
          const pv2FirstMove = context.pv2Moves[0]
          if (pv2FirstMove && pv2FirstMove.move && pv2FirstMove.move !== context.currentMove.move) {
            const pv2Sequence = context.pv2Moves.slice(0, 2)
              .map(move => formatMoveWithPiece(move))
              .join(' ')
            sequenceText += ` Alternative: ${pv2Sequence}.`
          }
        }

        // Get feature differences
        const featureDifferences = getDifferencesBetweenPositions(context.currentMove, context.pv1Moves, context.isWhiteMove)
        if (featureDifferences) {
          sequenceText += ` ${featureDifferences}`
        }

        return {
          type: 'missed_opportunity',
          text: `Missed opportunity. ${sequenceText}`,
          priority: 3
        }
      }
    }
  }

  return null
}
