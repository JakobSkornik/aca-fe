import { MoveAnalysisNode } from "@/types/AnalysisResult"
import { getNthBestSibling, getScore } from "./utils"

export const BLUNDER_CP = 100
export const MISTAKE_CP = 50
export const INACCURACY_CP = 20
export const GREAT_MOVE_MARGIN_CP = 80
export const GOOD_MOVE_MARGIN_CP = 30

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
  if (!best || !secondBest || node.phase !== 'mid') return false
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
  if (!best || !secondBest || node.phase !== 'mid') return false
  return (
    node.id === best.id &&
    Math.abs(getScore(best) - getScore(secondBest)) >= GOOD_MOVE_MARGIN_CP
  )
}
