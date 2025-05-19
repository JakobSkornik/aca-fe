/* eslint-disable @typescript-eslint/no-explicit-any */
import openingBook from '@/helpers/openingBook'
import { getSiblings } from '@/helpers/tree'
import { MoveAnalysisNode } from '@/types/AnalysisResult'
import { PosFeature } from '@/types/Trace'
import { parseTrace } from './traceParser'

const BLUNDER_CP = 100
const MISTAKE_CP = 50
const INACCURACY_CP = 20
const GREAT_MOVE_MARGIN_CP = 80
const GOOD_MOVE_MARGIN_CP = 30

function getScore(node: MoveAnalysisNode): number {
  return typeof node.deep_score === 'number' ? node.deep_score : 0
}

function isWhiteMove(node: MoveAnalysisNode): boolean {
  return node.depth % 2 === 0
}

function formatCp(cp: number): string {
  return cp >= 0 ? `+${cp}` : `${cp}`
}

function isQueenlessEndgame(node: MoveAnalysisNode): boolean {
  // crude: no queens and phase is end
  return (
    node.phase === 'end' &&
    (node as any).material &&
    (node as any).material.Q === 0
  )
}

// --- Score helpers for correct side-to-move logic ---
function getBestMove(
  nodes: MoveAnalysisNode[],
  sideIsWhite: boolean
): MoveAnalysisNode | undefined {
  if (!nodes.length) return undefined
  return nodes.reduce(
    (best, n) =>
      sideIsWhite
        ? getScore(n) < getScore(best)
          ? n
          : best
        : getScore(n) > getScore(best)
        ? n
        : best,
    nodes[0]
  )
}

function getSecondBestMove(
  nodes: MoveAnalysisNode[],
  sideIsWhite: boolean,
  bestId: number
): MoveAnalysisNode | undefined {
  const filtered = nodes.filter((n) => n.id !== bestId)
  if (!filtered.length) return undefined
  return getBestMove(filtered, sideIsWhite)
}

// function getSortedMoves(nodes: MoveAnalysisNode[], sideIsWhite: boolean): MoveAnalysisNode[] {
//   return [...nodes].sort((a, b) =>
//     sideIsWhite
//       ? getScore(b) - getScore(a)
//       : getScore(a) - getScore(b)
//   )
// }

// --- Key moment detection ---

function isBlunder(normChange: number): boolean {
  return normChange <= -BLUNDER_CP
}

function isMistake(normChange: number): boolean {
  return normChange <= -MISTAKE_CP && normChange > -BLUNDER_CP
}

function isInaccuracy(normChange: number): boolean {
  return normChange <= -INACCURACY_CP && normChange > -MISTAKE_CP
}

function isGreatMove(
  node: MoveAnalysisNode,
  siblings: MoveAnalysisNode[]
): boolean {
  if (node.phase !== 'mid') return false
  if (siblings.length <= 1) return false
  const sideIsWhite = isWhiteMove(node)
  const best = getBestMove(siblings, sideIsWhite)
  const secondBest = best
    ? getSecondBestMove(siblings, sideIsWhite, best.id)
    : undefined
  if (!best || !secondBest) return false
  return (
    node.id === best.id &&
    Math.abs(getScore(best) - getScore(secondBest)) >= GREAT_MOVE_MARGIN_CP
  )
}

function isGoodMove(
  node: MoveAnalysisNode,
  siblings: MoveAnalysisNode[]
): boolean {
  if (node.phase !== 'mid') return false
  if (siblings.length <= 1) return false
  const sideIsWhite = isWhiteMove(node)
  const best = getBestMove(siblings, sideIsWhite)
  const secondBest = best
    ? getSecondBestMove(siblings, sideIsWhite, best.id)
    : undefined
  if (!best || !secondBest) return false
  return (
    node.id === best.id &&
    Math.abs(getScore(best) - getScore(secondBest)) >= GOOD_MOVE_MARGIN_CP
  )
}

// --- Opening book lookup ---
function getOpeningName(node: MoveAnalysisNode): string | null {
  if (!node || !node.fen) return null
  // Assume openingBook is a map: fen string -> opening name
  // Or adapt to your opening book API
  return openingBook[node.fen] || null
}

// --- Main commentator ---
export function buildSentencesForMoves(
  moveTree: Record<number, MoveAnalysisNode>
): string[][] {
  // Build mainline
  const root = Object.values(moveTree).find((n) => n.parent === -1)
  if (!root) {
    return [['No move selected.']]
  }

  const mainline: MoveAnalysisNode[] = [root]
  let current = root
  while (true) {
    const next = Object.values(moveTree).find(
      (n) => n.parent === current.id && n.context === 'mainline'
    )
    if (!next) break
    mainline.push(next)
    current = next
  }

  function getAllFeatureDiffs(
    node: MoveAnalysisNode,
    compareNode: MoveAnalysisNode
  ): string {
    const nodeFeats = parseTrace(node)
    const compareFeats = parseTrace(compareNode)
    const sideIsWhite = isWhiteMove(node)
    // Compute diffs with correct sign
    const diffs = Object.entries(nodeFeats)
      .map(([k, v]: [string, any]) => {
        const other = compareFeats[k as PosFeature]
        if (typeof other === 'number' && typeof v === 'number') {
          // For White: node - compare; For Black: compare - node
          const diff = sideIsWhite ? v - other : other - v
          return { k, v, other, diff, abs: Math.abs(diff) }
        }
        return null
      })
      .filter(Boolean) as {
      k: string
      v: number
      other: number
      diff: number
      abs: number
    }[]

    // Sort by absolute difference, descending, and take top 3
    const topDiffs = diffs.sort((a, b) => b.abs - a.abs).slice(0, 3)

    return topDiffs
      .map(
        ({ k, v, other, diff }) =>
          `${k}: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} (${v.toFixed(
            2
          )} vs ${other.toFixed(2)})`
      )
      .join(', ')
  }

  function getKeyMoments(
    node: MoveAnalysisNode,
    siblings: MoveAnalysisNode[],
    normChange: number
  ): string[] {
    const moments: string[] = []
    const sideIsWhite = isWhiteMove(node)
    const best = getBestMove([node, ...siblings], sideIsWhite)
    const isBest = best && node.id === best.id

    if (!isBest) {
      if (isBlunder(normChange)) moments.push('Blunder detected!')
      else if (isMistake(normChange)) moments.push('Mistake detected!')
      else if (isInaccuracy(normChange)) moments.push('Inaccuracy detected!')
    } else {
      // If the best move is played but the position is still bad
      if (
        isBlunder(normChange) ||
        isMistake(normChange) ||
        isInaccuracy(normChange)
      ) {
        moments.push('Best move played, but the position is still losing.')
      }
    }
    if (isGreatMove(node, siblings)) moments.push('Great move!')
    else if (isGoodMove(node, siblings)) moments.push('Good move!')
    return moments
  }

  function getFirstComment(idx: number, node: MoveAnalysisNode): string[] {
    if (idx === 0) {
      return ['Opening position.']
    }

    const comments = []

    // Opening book lookup
    const openingName = getOpeningName(node)
    if (openingName) {
      return [`Book move: ${openingName}.`]
    }

    const prev = mainline[idx - 1]
    const prevScore = getScore(prev)
    const currScore = getScore(node)
    const rawChange = currScore - prevScore
    const sideIsWhite = isWhiteMove(node)

    // For White, a negative change is bad; for Black, a positive change is bad
    const normChange = sideIsWhite ? -rawChange : rawChange

    const siblings = getSiblings(moveTree, node)
    const bestSibling = getBestMove(siblings, sideIsWhite)

    const keyMoments = getKeyMoments(node, siblings, normChange)
    comments.push(...keyMoments)

    // Always say a better move was available, when there was

    if (
      bestSibling &&
      bestSibling.id !== node.id &&
      ((sideIsWhite && getScore(bestSibling) < currScore) ||
        (!sideIsWhite && getScore(bestSibling) > currScore))
    ) {
      const featureDiffs = getAllFeatureDiffs(node, bestSibling)
      comments.push(`A better move was available: ${bestSibling.move}.`)
      if (featureDiffs) {
        comments.push(`Feature differences: ${featureDiffs}.`)
      }
    }

    // Transition to Midgame
    if (node.phase === 'mid' && mainline[idx - 1]?.phase === 'early') {
      comments.push('We’re entering the midgame—time to open lines.')
    }

    // Switch to Late Game
    if (node.phase === 'end' && mainline[idx - 1]?.phase !== 'end') {
      comments.push('We’ve entered the endgame—simplify and king‐hunt.')
    }

    // Fallback
    const prevScoreStr = formatCp(prevScore)
    const currScoreStr = formatCp(currScore)
    const diffStr = formatCp(normChange)
    if (comments.length === 0) {
      comments.push(
        `Score was ${prevScoreStr}, now ${currScoreStr} (Δ ${diffStr} cp) after this move.`
      )
    }
    console.log(comments)
    return comments
  }

  function getSecondAndThirdComments(
    idx: number,
    node: MoveAnalysisNode
  ): string[] {
    // Only return meta comments (skip move/depth/features lines)
    const comments: string[] = []

    // Add a hint if queenless endgame
    if (isQueenlessEndgame(node)) {
      comments.push('Transition to queenless endgame.')
    }

    // If not enough meta comments, fill with empty string
    while (comments.length < 2) comments.push('')

    return [comments[0], comments[1]]
  }

  return mainline.map((node, idx) => {
    const c1 = getFirstComment(idx, node)
    const c2 = getSecondAndThirdComments(idx, node)
    return [...c1, ...c2]
  })
}
