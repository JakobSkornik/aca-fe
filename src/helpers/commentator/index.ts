import { getKeyMomentType, isGoodMove, isGreatMove } from './keyMoments'
import { getOpeningComment } from './openings'
import {
  getScore,
  getScoreDelta,
  isBestMove,
  formatCp,
  getMainlineMoves,
} from './utils'
import { MoveAnalysisNode } from '@/types/ws'

export function buildComments(
  tree: Record<number, MoveAnalysisNode>
): string[][] {
  const mainline = getMainlineMoves(tree)

  return mainline.map((node, idx) => {
    if (idx === 0) return ['Opening position.']

    const comments: string[] = []

    const prevNode = mainline[idx - 1]
    const normChange = getScoreDelta(node, prevNode)
    
    const openingComment = getOpeningComment(node)
    if (openingComment) {
      comments.push(openingComment)
      return comments // Skip the rest of the comments for opening positions
    }

    const keyMoment = getKeyMomentType(normChange)
    if (keyMoment) {
      comments.push(`${keyMoment} detected!`)
    }

    if (isBestMove(tree, node)) {
      if (keyMoment) {
        comments.push('Best move played, but position remains difficult.')
      } else if (isGreatMove(tree, node)) {
        comments.push('Great move!')
      } else if (isGoodMove(tree, node)) {
        comments.push('Good move!')
      }
    } else {
      const bestSibling = Object.values(tree)
        .filter((n) => n.parent === node.parent && n.move !== node.move)
        .sort((a, b) => getScoreDelta(a, node) - getScoreDelta(b, node))[0]
      if (bestSibling) {
        comments.push(`Better move available: ${bestSibling.move.move}`)
      }
    }

    if (comments.length === 0) {
      comments.push(
        `Score went from ${formatCp(getScore(prevNode))} to ${formatCp(
          getScore(node)
        )}.`
      )
    }
    return comments
  })
}
