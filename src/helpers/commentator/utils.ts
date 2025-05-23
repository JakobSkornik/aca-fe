import { Chess, Move as ChessJsMove } from 'chess.js' // Import Chess
import { Move, TraceFeature, MoveAnalysisNode, PV } from '@/types/ws' // Added PV

export function getMainlineMoves(
  tree: Record<number, MoveAnalysisNode>
): MoveAnalysisNode[] {
  const mainline: MoveAnalysisNode[] = []

  // Find root node
  const root = Object.values(tree).find((node) => node.parent === -1)
  if (!root) return mainline

  let current: MoveAnalysisNode | undefined = root
  mainline.push(current)

  while (true) {
    current = Object.values(tree).find(
      (node) => node.parent === current!.id && node.move.context === 'mainline'
    )
    if (!current) break
    mainline.push(current)
  }

  return mainline
}

export function getScore(node: MoveAnalysisNode): number {
  return typeof node.move.score === 'number' ? node.move.score : 0
}

export function isWhiteMove(node: MoveAnalysisNode): boolean {
  return node.depth % 2 === 1
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
  if (isPlayerMakingTheMoveWhite) {
    return newEvalForWhite - oldEvalForWhite
  } else {
    return oldEvalForWhite - newEvalForWhite
  }
}

export function sortMovesByScore(
  moves: MoveAnalysisNode[],
  isWhite: boolean
): MoveAnalysisNode[] {
  return moves.sort((a, b) => compareScores(getScore(b), getScore(a), isWhite))
}

export function getNthBestSibling(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode,
  n: number
): MoveAnalysisNode | undefined {
  const siblings = Object.values(tree).filter((n) => n.parent === node.parent)
  const sortedSiblings = sortMovesByScore(siblings, isWhiteMove(node))
  return sortedSiblings[n - 1]
}

export function isBestMove(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): boolean {
  const bestSibling = getNthBestSibling(tree, node, 1)
  return bestSibling ? bestSibling.id === node.id : false
}

export function getScoreDelta(
  node: MoveAnalysisNode,
  prevNode: MoveAnalysisNode
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
    const move1_details = chess1.move(san1, {strict: false}) as ChessJsMove | null
    const move2_details = chess2.move(san2, {strict: false}) as ChessJsMove | null

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
