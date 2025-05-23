import { MoveAnalysisNode } from '@/types/ws'
import {
  getNthBestSibling,
  getScore,
  isBestMove,
  compareScores,
  getMaterialBalance,
  sortMovesByScore,
  formatCp,
} from './utils'

export const BLUNDER_CP = 100
export const MISTAKE_CP = 50
export const INACCURACY_CP = 20
export const GREAT_MOVE_MARGIN_CP = 80
export const GOOD_MOVE_MARGIN_CP = 30
export const SACRIFICE_MATERIAL_THRESHOLD = 100
export const MISSED_OPPORTUNITY_THRESHOLD_CP = 70
export const MISSED_OPPORTUNITY_BEST_VS_SECOND_BEST_MARGIN_CP = 50

export function getKeyMomentType(normChange: number): string | null {
  if (normChange <= -BLUNDER_CP) return 'Blunder'
  if (normChange <= -MISTAKE_CP) return 'Mistake'
  if (normChange <= -INACCURACY_CP) return 'Inaccuracy'
  return null
}

export function isGreatMove(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): boolean {
  const best = getNthBestSibling(tree, node, 1)
  const secondBest = getNthBestSibling(tree, node, 2)
  if (!best || !secondBest || node.move.phase !== 'mid') return false
  return (
    node.id === best.id &&
    Math.abs(getScore(best) - getScore(secondBest)) >= GREAT_MOVE_MARGIN_CP
  )
}

export function isGoodMove(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): boolean {
  const best = getNthBestSibling(tree, node, 1)
  const secondBest = getNthBestSibling(tree, node, 2)
  if (!best || !secondBest || node.move.phase !== 'mid') return false
  return (
    node.id === best.id &&
    Math.abs(getScore(best) - getScore(secondBest)) >= GOOD_MOVE_MARGIN_CP
  )
}

export function isExcellentMove(
  tree: Record<number, MoveAnalysisNode>,
  currentNode: MoveAnalysisNode,
  previousNode: MoveAnalysisNode,
  isWhiteToMove: boolean
): boolean {
  if (!isBestMove(tree, currentNode)) {
    return false
  }

  const materialAfterMove = getMaterialBalance(currentNode.move)
  const materialBeforeMove = getMaterialBalance(previousNode.move)

  let materialLostByCurrentPlayer = 0
  if (isWhiteToMove) {
    materialLostByCurrentPlayer = materialBeforeMove - materialAfterMove
  } else {
    materialLostByCurrentPlayer = -(materialBeforeMove - materialAfterMove) // Black loses material if White's material balance increases
  }

  if (materialLostByCurrentPlayer < SACRIFICE_MATERIAL_THRESHOLD) {
    return false
  }

  // Check if this best (sacrificial) move is significantly better than the next best alternative
  const secondBestAlternative = getNthBestSibling(tree, currentNode, 2)
  if (!secondBestAlternative) return true // If it's the only move or no clear second best, a sacrifice that's best is excellent.

  const margin = compareScores(
    getScore(currentNode),
    getScore(secondBestAlternative),
    isWhiteToMove
  )
  return margin >= GOOD_MOVE_MARGIN_CP // Sacrifice is excellent if also a "good move" by margin
}

export function getMissedOpportunityComment(
  tree: Record<number, MoveAnalysisNode>,
  parentNodeOfPlay: MoveAnalysisNode, // The node *before* the current player made their move
  playedNode: MoveAnalysisNode, // The node representing the move actually played
  isTurnOfPlayerWhoPlayed: boolean // Whose turn it was when playedNode was chosen
): string | null {
  const childrenOfParent = Object.values(tree).filter(
    (n) => n.parent === parentNodeOfPlay.id
  )
  if (childrenOfParent.length < 2) return null

  const sortedChildren = sortMovesByScore(
    childrenOfParent,
    isTurnOfPlayerWhoPlayed
  )

  const bestPossibleNode = sortedChildren[0]
  const secondBestNode = sortedChildren.length > 1 ? sortedChildren[1] : null

  if (!bestPossibleNode || bestPossibleNode.id === playedNode.id) {
    return null // Player made the best move, or no clear alternatives to compare against
  }

  const scoreBestPossible = getScore(bestPossibleNode)
  const scorePlayed = getScore(playedNode)

  const advantageLost = compareScores(
    scoreBestPossible,
    scorePlayed,
    isTurnOfPlayerWhoPlayed
  )

  if (advantageLost >= MISSED_OPPORTUNITY_THRESHOLD_CP) {
    let bestWasClearlySuperior = true
    if (secondBestNode) {
      const bestVsSecondBestDiff = compareScores(
        scoreBestPossible,
        getScore(secondBestNode),
        isTurnOfPlayerWhoPlayed
      )
      if (
        bestVsSecondBestDiff < MISSED_OPPORTUNITY_BEST_VS_SECOND_BEST_MARGIN_CP
      ) {
        bestWasClearlySuperior = false
      }
    }

    if (bestWasClearlySuperior) {
      return `Missed opportunity! ${
        bestPossibleNode.move.move
      } (eval ${formatCp(scoreBestPossible)}) was a much stronger option.`
    }
  }
  return null
}
