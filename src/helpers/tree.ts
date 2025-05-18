import { MoveAnalysisNode } from '@/types/AnalysisResult'

export function getChildren(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): MoveAnalysisNode[] {
  return Object.values(tree).filter((n) => n.parent === node.id)
}

export function getParent(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): MoveAnalysisNode | undefined {
  return tree[node.parent]
}

export function getSiblings(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): MoveAnalysisNode[] {
  if (node.parent === -1) return []
  const parent = getParent(tree, node)!
  return getChildren(tree, parent).filter((n) => n.id !== node.id)
}

export function getNodeById(
  tree: Record<number, MoveAnalysisNode>,
  id: number
): MoveAnalysisNode | undefined {
  return tree[id]
}

export function getPVLine(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): string[] {
  const pvMoves: string[] = []
  let current = node
  while (true) {
    const children = getChildren(tree, current)
    if (children.length !== 1) break
    current = children[0]
    pvMoves.push(current.move)
  }
  return pvMoves
}
