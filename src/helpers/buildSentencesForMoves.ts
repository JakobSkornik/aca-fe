/* eslint-disable @typescript-eslint/no-explicit-any */
import openingBook from '@/helpers/openingBook'
import { MoveAnalysisNode } from '@/types/AnalysisResult'

// --- Helper functions ---
function getChildren(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): MoveAnalysisNode[] {
  return Object.values(tree).filter((n) => n.parent === node.id)
}

function getParent(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): MoveAnalysisNode | undefined {
  return tree[node.parent]
}

function getSiblings(
  tree: Record<number, MoveAnalysisNode>,
  node: MoveAnalysisNode
): MoveAnalysisNode[] {
  if (node.parent === -1) return []
  const parent = getParent(tree, node)!
  return getChildren(tree, parent).filter((n) => n.id !== node.id)
}

function getScore(node: MoveAnalysisNode): number {
  return typeof node.deep_score === 'number' ? node.deep_score : 0
}

function isWhiteMove(node: MoveAnalysisNode): boolean {
  return node.depth % 2 === 0
}

function isOnlyNonLosing(node: MoveAnalysisNode): boolean {
  const s = getScore(node)
  return isWhiteMove(node) ? s >= 0 : s <= 0
}

function formatCp(cp: number): string {
  return cp >= 0 ? `+${cp}` : `${cp}`
}

function hasPawnBreak(node: MoveAnalysisNode): boolean {
  return (
    node.trace &&
    typeof node.trace.pawn_break === 'number' &&
    node.trace.pawn_break > 2
  )
}

function isQueenlessEndgame(node: MoveAnalysisNode): boolean {
  // crude: no queens and phase is end
  return node.phase === 'end' && (node as any).material && (node as any).material.Q === 0
}

function isOnlyDrawSaving(node: MoveAnalysisNode, prevScore: number): boolean {
  // If previous score was losing and now it's 0
  return (
    (isWhiteMove(node) ? prevScore < 0 : prevScore > 0) && getScore(node) === 0
  )
}

function isEngineQuiet(mainline: MoveAnalysisNode[], idx: number): boolean {
  // If next 3 plies have same score
  const curr = getScore(mainline[idx])
  for (let i = 1; i <= 3; ++i) {
    if (!mainline[idx + i] || getScore(mainline[idx + i]) !== curr) return false
  }
  return true
}

function isSeasonedProphylaxis(node: MoveAnalysisNode): boolean {
  // crude: if trace has high 'prophylaxis' feature
  return (
    node.trace &&
    typeof node.trace.prophylaxis === 'number' &&
    node.trace.prophylaxis > 1
  )
}

function isPsychologicalPloy(node: MoveAnalysisNode): boolean {
  // crude: if context is 'alt' and depth > 12
  return node.context !== 'mainline' && node.depth > 12
}

// function getMoveString(node: MoveAnalysisNode, pvMove?: string): string {
//   if (pvMove) return `${node.move} (PV: ${pvMove})`
//   return node.move || 'start'
// }

// function getFeaturesDiff(
//   node: MoveAnalysisNode,
//   pvNode?: MoveAnalysisNode
// ): string {
//   if (!pvNode) return getFeaturesComment(node)
//   // Compare top 2 features
//   const feats = Object.entries(node.trace)
//     .filter(([, v]) => typeof v === 'number')
//     .map(([k, v]) => [k, v as number] as const)
//     .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
//     .slice(0, 2)
//   const pvFeats = pvNode
//     ? Object.entries(pvNode.trace)
//         .filter(([, v]) => typeof v === 'number')
//         .map(([k, v]) => [k, v as number] as const)
//         .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
//         .slice(0, 2)
//     : []
//   if (feats.length === 0 || pvFeats.length === 0)
//     return getFeaturesComment(node)
//   return `Features diff: ${feats
//     .map(
//       ([k, v], i) =>
//         `${k} ${formatCp(v)} vs ${pvFeats[i] ? formatCp(pvFeats[i][1]) : '?'}`
//     )
//     .join(', ')}.`
// }

// --- Feature comment helper (third sentence) ---
// function getFeaturesComment(node: MoveAnalysisNode): string {
//   // collect numeric trace features and sort by absolute impact desc
//   const feats = Object.entries(node.trace)
//     .filter(([, v]) => typeof v === 'number')
//     .map(([k, v]) => [k, v as number] as const)
//     .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

//   if (feats.length === 0) {
//     return 'No detailed feature data—look out for tactical motifs or pawn breaks.'
//   }
//   // take top 2 features to mention
//   const top = feats.slice(0, 2).map(([k, v]) => `${k} ${formatCp(v)}`)
//   return `Features: ${top.join(', ')}.`
// }

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
): [string, string, string][] {
  // Build mainline
  const root = Object.values(moveTree).find((n) => n.parent === -1)
  if (!root) {
    return [['No move selected.', 'No move selected.', 'No move selected.']]
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

  function getAllFeatureDiffs(node: MoveAnalysisNode, compareNode: MoveAnalysisNode): string {
    // List all numeric features and their differences
    const nodeFeats = Object.entries(node.trace)
      .filter(([, v]) => typeof v === 'number')
      .map(([k, v]) => [k, v as number] as const)
    const compareFeats = Object.fromEntries(
      Object.entries(compareNode.trace)
        .filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => [k, v as number])
    )
    if (nodeFeats.length === 0) return ''
    return nodeFeats
      .map(([k, v]) => {
        const other = compareFeats[k]
        if (typeof other === 'number' && other !== v) {
          return `${k}: ${formatCp(v)} vs ${formatCp(other)}`
        }
        return null
      })
      .filter(Boolean)
      .join(', ')
  }

  function getBestSibling(node: MoveAnalysisNode, siblings: MoveAnalysisNode[]): MoveAnalysisNode | undefined {
    if (siblings.length === 0) return undefined
    return siblings.reduce((best, n) =>
      isWhiteMove(node)
        ? getScore(n) > getScore(best) ? n : best
        : getScore(n) < getScore(best) ? n : best
    , siblings[0])
  }

  function getBestPV(idx: number, mainline: MoveAnalysisNode[], moveTree: Record<number, MoveAnalysisNode>): MoveAnalysisNode | undefined {
    // Find a PV node at this ply with a much better score than the mainline
    const curr = mainline[idx]
    const pvCandidates = Object.values(moveTree).filter(
      n => n.parent === curr.parent && n.context === 'pv'
    )
    if (pvCandidates.length === 0) return undefined
    const currScore = getScore(curr)
    return pvCandidates.find(n =>
      isWhiteMove(curr)
        ? getScore(n) - currScore > 100
        : currScore - getScore(n) > 100
    )
  }

  function getFirstComment(idx: number, node: MoveAnalysisNode): string {
    if (idx === 0) {
      return 'Opening position.'
    }

    // Opening book lookup
    const openingName = getOpeningName(node)
    if (openingName) {
      return `In book: ${openingName}.`
    }

    const prev = mainline[idx - 1]
    const prevScore = getScore(prev)
    const currScore = getScore(node)
    const rawChange = currScore - prevScore
    const normChange = isWhiteMove(node) ? -rawChange : rawChange

    const siblings = getSiblings(moveTree, node)
    const sorted = [...siblings].sort((a, b) =>
      isWhiteMove(node) ? getScore(b) - getScore(a) : getScore(a) - getScore(b)
    )
    const rank = sorted.findIndex((n) => n.id === node.id) + 1
    // const total = sorted.length
    const bestSibling = getBestSibling(node, siblings)

    // Always say a better move was available, when there was
    if (bestSibling && bestSibling.id !== node.id && (
      isWhiteMove(node)
        ? getScore(bestSibling) > currScore
        : getScore(bestSibling) < currScore
    )) {
      const featureDiffs = getAllFeatureDiffs(node, bestSibling)
      let msg = `A better move was available: ${bestSibling.move}.`
      if (featureDiffs) {
        msg += ` Feature differences: ${featureDiffs}.`
      }
      return msg
    }

    // Note if there is a PV that leads to a much better position
    const pvBetter = getBestPV(idx, mainline, moveTree)
    if (pvBetter) {
      const featureDiffs = getAllFeatureDiffs(node, pvBetter)
      let msg = `A principal variation (PV) move (${pvBetter.move}) leads to a much better position.`
      if (featureDiffs) {
        msg += ` Feature differences: ${featureDiffs}.`
      }
      return msg
    }

    // Opening phase: more nuanced comments
    if (node.phase === 'early') {
      if (node.context === 'mainline' && rank === 1 && idx < 8) {
        return 'Following mainline opening theory.'
      }
      if (node.context === 'mainline' && rank === 1 && idx < 16) {
        return 'Solid opening play—still in well-known territory.'
      }
      if (node.context === 'mainline' && rank === 1) {
        return 'Good opening move, keeping theory lines.'
      }
      if (node.context !== 'mainline' && normChange > -50) {
        return 'This sideline drifts from main‐theory.'
      }
      if (node.context === 'pv' && normChange < 0) {
        const mainlineNode = mainline[idx]
        return `You missed the stronger ${mainlineNode.move}—your ${node.move} is playable but less ambitious.`
      }
      if (node.context !== 'mainline' && node.depth < 10) {
        return 'Novel sideline—unexplored but not yet refuted.'
      }
    }

    // Transition to Midgame
    if (node.phase === 'mid' && mainline[idx - 1]?.phase === 'early') {
      return 'We’re entering the midgame—time to open lines.'
    }

    // Midgame, Only Non‐Losing & Best
    if (node.phase === 'mid' && isOnlyNonLosing(node) && rank === 1) {
      return 'Excellent defense! It’s the sole non‐losing—and best—option here.'
    }

    // Midgame, Questionable Tactic
    if (
      node.phase === 'mid' &&
      normChange < 0 &&
      Math.abs(normChange) < 200 &&
      node.trace &&
      typeof node.trace.king_safety === 'number' &&
      node.trace.king_safety < 0
    ) {
      return 'This pawn grab is risky—opens your king.'
    }

    // Midgame, Blunder
    if (node.phase === 'mid' && normChange <= -200) {
      return 'Blunder! You hang a piece for no compensation.'
    }

    // Midgame, Missed Tactical Shot
    if (
      node.phase === 'mid' &&
      rank > 1 &&
      bestSibling &&
      Math.abs(getScore(bestSibling) - currScore) > 50 &&
      bestSibling.trace &&
      bestSibling.trace.tactical_shot
    ) {
      return `You overlooked ${bestSibling.move}! which wins a pawn.`
    }

    // PV Move Highlight
    if (node.context === 'pv' && normChange > 0) {
      return `PV recommends ${node.move}—keeps pressure on d5 better.`
    }

    // Switch to Late Game
    if (node.phase === 'end' && mainline[idx - 1]?.phase !== 'end') {
      return 'We’ve entered the endgame—simplify and king‐hunt.'
    }

    // Endgame, Precise King Move
    if (
      node.phase === 'end' &&
      node.move &&
      node.move[0] === 'K' &&
      node.trace &&
      typeof node.trace.king_activity === 'number' &&
      node.trace.king_activity > 1
    ) {
      return 'Strong endgame technique—centralizing the king.'
    }

    // Endgame, Passive but Safe
    if (
      node.phase === 'end' &&
      node.trace &&
      typeof node.trace.rook_activity === 'number' &&
      node.trace.rook_activity < 2
    ) {
      return 'Solid but a bit passive—could activate the rook.'
    }

    // Alternative, Deep Line
    if (node.context !== 'mainline' && node.depth > 12) {
      return 'This alternative digs deeper—good for surprise value.'
    }

    // Blunder Recovery
    if (
      idx > 1 &&
      mainline[idx - 2] &&
      getScore(mainline[idx - 2]) - getScore(mainline[idx - 1]) <= -200 &&
      normChange >= 0
    ) {
      return 'You blundered earlier but now you keep tension—good defensive play.'
    }

    // Only draw-saving
    if (isOnlyDrawSaving(node, prevScore)) {
      return 'Only draw-saving move—everything else loses.'
    }

    // Engine goes quiet
    if (isEngineQuiet(mainline, idx)) {
      return 'Engine goes quiet—dead draw ahead.'
    }

    // Seasoned prophylaxis
    if (isSeasonedProphylaxis(node)) {
      return 'Seasoned prophylaxis—anticipating threats before they arise.'
    }

    // Psychological ploy
    if (isPsychologicalPloy(node)) {
      return 'Psychological ploy—forcing your opponent into less-charted territory.'
    }

    // Pawn break readiness
    if (hasPawnBreak(node)) {
      return 'Pawn break readiness—look for dynamic pawn advances.'
    }

    // Transition to queenless endgame
    if (isQueenlessEndgame(node)) {
      return 'Transition to queenless endgame—activate your king and rooks.'
    }

    // Default: general move quality
    if (normChange > 80) {
      return 'Strong move—improves your position.'
    }
    if (normChange < -80) {
      return 'Inaccuracy—this weakens your position.'
    }
    if (Math.abs(normChange) <= 80 && rank === 1) {
      return 'Solid move—keeps the balance.'
    }
    if (Math.abs(normChange) <= 80 && rank > 1) {
      return 'Playable, but there were stronger options.'
    }

    // Fallback
    const prevScoreStr = formatCp(prevScore)
    const currScoreStr = formatCp(currScore)
    const diffStr = formatCp(normChange)
    return `Score was ${prevScoreStr}, now ${currScoreStr} (Δ ${diffStr} cp) after this move.`
  }

  function getSecondAndThirdComments(
    idx: number,
    node: MoveAnalysisNode
  ): [string, string] {
    // Only return meta comments (skip move/depth/features lines)
    const comments: string[] = []

    // Add a hint if pawn break readiness
    if (hasPawnBreak(node)) {
      comments.push('Pawn break readiness—look for dynamic pawn advances.')
    }
    // Add a hint if prophylaxis
    if (isSeasonedProphylaxis(node)) {
      comments.push(
        'Seasoned prophylaxis—anticipating threats before they arise.'
      )
    }
    // Add a hint if queenless endgame
    if (isQueenlessEndgame(node)) {
      comments.push(
        'Transition to queenless endgame—activate your king and rooks.'
      )
    }
    // Add a hint if psychological ploy
    if (isPsychologicalPloy(node)) {
      comments.push(
        'Psychological ploy—forcing your opponent into less-charted territory.'
      )
    }
    // Add a hint if engine goes quiet
    if (isEngineQuiet(mainline, idx)) {
      comments.push('Engine goes quiet—dead draw ahead.')
    }

    // If not enough meta comments, fill with empty string
    while (comments.length < 2) comments.push('')

    return [comments[0], comments[1]]
  }

  return mainline.map((node, idx) => {
    const c1 = getFirstComment(idx, node)
    const [c2, c3] = getSecondAndThirdComments(idx, node)
    return [c1, c2, c3]
  })
}
