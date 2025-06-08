import { getOpeningComment } from './openings'
import { compareScores, formatCp, isWhiteMove } from './utils'
import { Move } from '@/types/chess/Move'
import {
  analyzeMoveAgainstPVs,
  generateBestMoveComments,
  generateNonBestMoveComments,
  CommentatorResult,
} from './keyMoments'

export const CP_TOLERANCE_FOR_BEST_MOVE_MATCH = 15

// Global reference to store annotated moves
let globalAnnotatedMoves: Move[] = []

export function buildComments(
  moves: Move[],
  movePvs: Record<number, Move[][]>
): string[][] {
  if (!moves || moves.length === 0) return []

  // Initialize global annotated moves
  globalAnnotatedMoves = [...moves]

  const comments = moves.map((currentMove, idx) => {
    const moveComments: string[] = []
    const prevMove = idx > 0 ? moves[idx - 1] : undefined

    const openingCommentStr = getOpeningComment(currentMove)
    if (openingCommentStr) {
      moveComments.push(openingCommentStr)
      if (idx < 10 && moveComments.length > 0) {
        return moveComments
      }
    }

    if (idx === 0) {
      if (moveComments.length === 0) moveComments.push('Game start.')
      return moveComments
    }

    const scoreCurrent = currentMove.score ?? 0
    const isCurrentMoveByWhite = isWhiteMove(currentMove)

    const normChange = prevMove
      ? compareScores(scoreCurrent, prevMove.score ?? 0, isCurrentMoveByWhite)
      : 0

    // Get PVs for the previous move (used to analyze current move)
    const prevMovePvs = prevMove && movePvs[idx - 1] ? movePvs[idx - 1] : undefined

    const analyzedContext = analyzeMoveAgainstPVs(
      prevMove,
      currentMove,
      isCurrentMoveByWhite,
      prevMovePvs
    )

    let commentatorResult: CommentatorResult

    if (analyzedContext.playedMoveIsConsideredBest) {
      commentatorResult = generateBestMoveComments({
        currentMove,
        prevMove,
        isCurrentMoveByWhite,
        analyzedContext,
        openingComment: openingCommentStr,
      })
    } else {
      commentatorResult = generateNonBestMoveComments({
        normChange,
        currentMove,
        analyzedContext,
        isCurrentMoveByWhite,
      })
    }

    // Apply annotation to the global annotated moves
    if (commentatorResult.annotation) {
      globalAnnotatedMoves[idx] = {
        ...globalAnnotatedMoves[idx],
        annotation: commentatorResult.annotation
      }
    }

    moveComments.push(...commentatorResult.comments)

    if (moveComments.length === 0 && idx > 0) {
      moveComments.push(
        `Move ${Math.ceil((idx + 1) / 2)}${
          isCurrentMoveByWhite ? '.' : '...'
        } ${currentMove.move}. Eval: ${formatCp(scoreCurrent)}${
          prevMove ? ` (was ${formatCp(prevMove.score ?? 0)})` : ''
        }.`
      )
    }
    return moveComments.filter((c) => c && c.trim() !== '')
  })

  return comments
}

// Function to get annotated moves (called by the context)
export function getAnnotatedMoves(): Move[] {
  return globalAnnotatedMoves
}
