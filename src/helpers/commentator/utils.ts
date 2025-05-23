import { MoveAnalysisNode } from '@/types/ws'

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
  return node.depth % 2 === 0
}

export function formatCp(cp: number): string {
  return cp >= 0 ? `+${cp}` : `${cp}`
}

export function compareScores(
  scoreA: number,
  scoreB: number,
  isWhite: boolean
): number {
  return isWhite ? scoreA - scoreB : scoreB - scoreA
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
