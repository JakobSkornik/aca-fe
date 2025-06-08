import {
  compareScores,
  getMaterialBalance,
  formatCp,
  areSameMoveSAN,
} from './utils'
import { CP_TOLERANCE_FOR_BEST_MOVE_MATCH } from '.'
import { Move } from '@/types/chess/Move'
import {
  compareTraces,
  generateTraceComments,
  TraceComparison,
} from './traceAnalysis'
import { Trace } from '@/types/chess/Trace'

// Constants remain the same
export const BLUNDER_CP = 100
export const MISTAKE_CP = 50
export const INACCURACY_CP = 20
export const GREAT_MOVE_MARGIN_CP = 80
export const GOOD_MOVE_MARGIN_CP = 30
export const SACRIFICE_MATERIAL_THRESHOLD = 100
export const EXCELLENT_SACRIFICE_MARGIN_CP = 30
export const MISSED_OPPORTUNITY_THRESHOLD_CP = 70
export const MISSED_OPPORTUNITY_BEST_VS_SECOND_BEST_MARGIN_CP = 50

export interface AnalyzedMoveContext {
  playedMoveIsConsideredBest: boolean
  bestTheoreticalOption?: {
    san: string
    score: number
    moves: string[]
    traceAtPvEnd?: Trace
  }
  secondBestTheoreticalOption?: {
    san: string
    score: number
    moves: string[]
  }
  advantageLost: number
  bestTheoreticalWasClearlySuperior: boolean
  fenForComparison?: string
  traceComparisons?: TraceComparison[] // Add this
}

// Add interface for commentator result
export interface CommentatorResult {
  comments: string[]
  annotation?: string
}

export function analyzeMoveAgainstPVs(
  prevMove: Move | undefined,
  currentMove: Move,
  isCurrentMoveByWhite: boolean,
  prevMovePvs: Move[][] | undefined
): AnalyzedMoveContext {
  let playedMoveIsConsideredBest = false
  let bestTheoreticalOption: AnalyzedMoveContext['bestTheoreticalOption']
  let secondBestTheoreticalOption: AnalyzedMoveContext['secondBestTheoreticalOption']
  let advantageLost = 0
  let bestTheoreticalWasClearlySuperior = false

  const fenForComparison = prevMove?.position
  const scoreCurrent = currentMove.score ?? 0

  let traceComparisons: TraceComparison[] = []

  if (prevMovePvs && prevMovePvs.length > 0 && fenForComparison) {
    // Create mapping of PVs with their original indices
    const pvsWithIndices = prevMovePvs.map((pvMoves, index) => ({
      moves: pvMoves.map((move) => move.move || ''),
      score: pvMoves[0]?.score || 0,
      originalPvMoves: pvMoves,
      originalIndex: index,
    }))

    // Sort PVs by score
    const sortedPvsWithIndices = pvsWithIndices.sort((a, b) => {
      if (isCurrentMoveByWhite) {
        return a.score - b.score // Higher is better for white
      } else {
        return b.score - a.score // Lower is better for black
      }
    })

    if (sortedPvsWithIndices.length > 0) {
      const bestPvData = sortedPvsWithIndices[0]
      const bestPvScoreCp = Math.round(bestPvData.score ?? 0)

      // Get the trace from the LAST move in the best PV
      const bestPvMoves = bestPvData.originalPvMoves
      const bestPvLastMove = bestPvMoves[bestPvMoves.length - 1]
      const traceAtPvEnd: Trace | undefined = bestPvLastMove?.trace as
        | Trace
        | undefined

      bestTheoreticalOption = {
        san: bestPvData.moves[0],
        score: bestPvScoreCp,
        moves: bestPvData.moves,
        traceAtPvEnd: traceAtPvEnd,
      }

      // Generate trace comparisons if we have trace data
      if (currentMove.trace && traceAtPvEnd) {
        traceComparisons = compareTraces(
          currentMove,
          traceAtPvEnd,
          isCurrentMoveByWhite
        )
      } else {}

      if (
        areSameMoveSAN(
          currentMove.move,
          bestPvData.moves[0],
          fenForComparison
        ) &&
        Math.abs(scoreCurrent - bestPvScoreCp) <
          CP_TOLERANCE_FOR_BEST_MOVE_MATCH
      ) {
        playedMoveIsConsideredBest = true
      }
      advantageLost = compareScores(
        bestPvScoreCp,
        scoreCurrent,
        isCurrentMoveByWhite
      )

      if (sortedPvsWithIndices.length > 1) {
        const secondBestPvData = sortedPvsWithIndices[1]
        const secondBestPvScoreCp = Math.round(secondBestPvData.score ?? 0)
        secondBestTheoreticalOption = {
          san: secondBestPvData.moves[0],
          score: secondBestPvScoreCp,
          moves: secondBestPvData.moves,
        }

        const bestVsSecondDiff = compareScores(
          bestPvScoreCp,
          secondBestPvScoreCp,
          isCurrentMoveByWhite
        )
        if (
          bestVsSecondDiff >= MISSED_OPPORTUNITY_BEST_VS_SECOND_BEST_MARGIN_CP
        ) {
          bestTheoreticalWasClearlySuperior = true
        }
      } else {
        bestTheoreticalWasClearlySuperior = true
      }
    }
  }

  return {
    playedMoveIsConsideredBest,
    bestTheoreticalOption,
    secondBestTheoreticalOption,
    advantageLost,
    bestTheoreticalWasClearlySuperior,
    fenForComparison,
    traceComparisons,
  }
}

function getDeviationType(normChange: number): string | null {
  if (normChange <= -BLUNDER_CP) return 'Blunder'
  if (normChange <= -MISTAKE_CP) return 'Mistake'
  if (normChange <= -INACCURACY_CP) return 'Inaccuracy'
  return null
}

// Update generateNonBestMoveComments to return annotation
export function generateNonBestMoveComments(params: {
  normChange: number
  currentMove: Move
  analyzedContext: AnalyzedMoveContext
  isCurrentMoveByWhite: boolean
}): CommentatorResult {
  const comments: string[] = []
  let annotation: string | undefined = undefined

  const {
    bestTheoreticalOption,
    advantageLost,
    bestTheoreticalWasClearlySuperior,
    traceComparisons,
  } = params.analyzedContext
  const { currentMove } = params
  const scoreCurrent = currentMove.score ?? 0

  const isMissedOpportunity =
    bestTheoreticalOption &&
    advantageLost >= MISSED_OPPORTUNITY_THRESHOLD_CP &&
    bestTheoreticalWasClearlySuperior

  const deviationType = getDeviationType(params.normChange)

  // Set annotation based on deviation type
  if (deviationType === 'Blunder') {
    annotation = '??'
  } else if (deviationType === 'Mistake') {
    annotation = '?'
  } else if (deviationType === 'Inaccuracy') {
    annotation = '?!'
  }

  if (isMissedOpportunity && bestTheoreticalOption) {
    comments.push(
      `Missed opportunity! ${bestTheoreticalOption.san} (eval ${formatCp(
        bestTheoreticalOption.score
      )}) was a much stronger option.`
    )
  } else if (deviationType && bestTheoreticalOption) {
    comments.push(
      `${deviationType}! ${bestTheoreticalOption.san} (eval ${formatCp(
        bestTheoreticalOption.score
      )}) was a better move.`
    )
  } else if (deviationType) {
    comments.push(`${deviationType}!`)
  } else if (
    bestTheoreticalOption &&
    !params.analyzedContext.playedMoveIsConsideredBest
  ) {
    comments.push(
      `A different path was stronger: ${
        bestTheoreticalOption.san
      } (eval ${formatCp(bestTheoreticalOption.score)}).`
    )
  }

  // Add context about the played move if no other comment mentions its evaluation
  const playedMoveEvalString = `Played ${currentMove.move} (eval ${formatCp(
    scoreCurrent
  )}).`
  if (
    !comments.some((c) => c.includes(formatCp(scoreCurrent))) &&
    !comments.some(
      (c) =>
        c.startsWith('Missed opportunity') &&
        c.includes(bestTheoreticalOption?.san || '____')
    ) &&
    !comments.some(
      (c) =>
        c.startsWith(deviationType || '____') &&
        c.includes(bestTheoreticalOption?.san || '____')
    )
  ) {
    if (comments.length > 0) {
      comments.push(playedMoveEvalString)
    }
  }

  const mentionsCurrentEval = comments.some((c) =>
    c.includes(formatCp(scoreCurrent))
  )
  const mentionsCurrentMoveSpecifically = comments.some((c) =>
    c.includes(currentMove.move)
  )

  if (
    !mentionsCurrentEval &&
    !mentionsCurrentMoveSpecifically &&
    deviationType
  ) {
    comments.push(
      `Your move ${currentMove.move} resulted in an evaluation of ${formatCp(
        scoreCurrent
      )}.`
    )
  } else if (
    comments.length === 0 &&
    !params.analyzedContext.playedMoveIsConsideredBest
  ) {
    comments.push(
      `Played ${currentMove.move} (eval ${formatCp(scoreCurrent)}).`
    )
    if (bestTheoreticalOption) {
      comments.push(
        `Considered ${bestTheoreticalOption.san} (eval ${formatCp(
          bestTheoreticalOption.score
        )}) as an alternative.`
      )
    }
  }

  // Add trace-based comments
  if (traceComparisons && traceComparisons.length > 0) {
    const traceComments = generateTraceComments(traceComparisons)
    comments.push(...traceComments)
  }

  return { comments, annotation }
}

// Update generateBestMoveComments to return annotation
export function generateBestMoveComments(params: {
  currentMove: Move
  prevMove?: Move
  isCurrentMoveByWhite: boolean
  analyzedContext: AnalyzedMoveContext
  openingComment?: string | null
}): CommentatorResult {
  const comments: string[] = []
  let annotation: string | undefined = undefined

  const {
    currentMove,
    prevMove,
    isCurrentMoveByWhite,
    analyzedContext,
    openingComment,
  } = params
  const { bestTheoreticalOption, secondBestTheoreticalOption } = analyzedContext
  const scoreCurrent = currentMove.score ?? 0

  const materialBefore = prevMove ? getMaterialBalance(prevMove) : 0
  const materialAfter = getMaterialBalance(currentMove)
  let materialLostByCurrentPlayer = 0
  if (isCurrentMoveByWhite) {
    materialLostByCurrentPlayer = materialBefore - materialAfter
  } else {
    materialLostByCurrentPlayer = -(materialBefore - materialAfter)
  }
  const isSacrifice =
    materialLostByCurrentPlayer >= SACRIFICE_MATERIAL_THRESHOLD

  let marginToSecondBest = 0
  if (bestTheoreticalOption && secondBestTheoreticalOption) {
    marginToSecondBest = compareScores(
      bestTheoreticalOption.score,
      secondBestTheoreticalOption.score,
      isCurrentMoveByWhite
    )
  } else if (bestTheoreticalOption && !secondBestTheoreticalOption) {
    marginToSecondBest =
      Math.max(GOOD_MOVE_MARGIN_CP, EXCELLENT_SACRIFICE_MARGIN_CP) + 1
  }

  // Set annotations for good moves
  if (isSacrifice && marginToSecondBest >= EXCELLENT_SACRIFICE_MARGIN_CP) {
    annotation = '!!'
    comments.push('Excellent move! A brilliant sacrifice.')
    if (secondBestTheoreticalOption) {
      comments.push(
        `Other options like ${secondBestTheoreticalOption.san} (eval ${formatCp(
          secondBestTheoreticalOption.score
        )}) were significantly weaker.`
      )
    } else {
      comments.push(`This was clearly the strongest path.`)
    }
  } else if (
    marginToSecondBest >= GREAT_MOVE_MARGIN_CP &&
    currentMove.phase?.toLowerCase() === 'midgame'
  ) {
    annotation = '!'
    comments.push('Great move!')
    if (secondBestTheoreticalOption) {
      comments.push(
        `Much better than the alternative ${
          secondBestTheoreticalOption.san
        } (eval ${formatCp(secondBestTheoreticalOption.score)}).`
      )
    }
  } else if (
    marginToSecondBest >= GOOD_MOVE_MARGIN_CP &&
    currentMove.phase?.toLowerCase() === 'midgame'
  ) {
    annotation = '!?'
    comments.push('Good move!')
  } else {
    if (
      !openingComment ||
      !openingComment.toLowerCase().includes('book move')
    ) {
      comments.push(`Best move: ${currentMove.move}.`)
    }

    const evalString = ` (eval ${formatCp(scoreCurrent)})`
    const isStrongAdvantage = isCurrentMoveByWhite
      ? scoreCurrent >= 150
      : scoreCurrent <= -150
    const isStruggling = isCurrentMoveByWhite
      ? scoreCurrent <= -150
      : scoreCurrent >= 150

    if (isStrongAdvantage) {
      comments.push(
        `${
          isCurrentMoveByWhite ? 'White' : 'Black'
        } maintains a strong advantage${evalString}.`
      )
    } else if (isStruggling) {
      comments.push(
        `Best available, though ${
          isCurrentMoveByWhite ? 'White' : 'Black'
        } is struggling${evalString}.`
      )
    } else if (
      comments.length <= 1 ||
      (comments.length === 1 && comments[0].startsWith('Best move'))
    ) {
      if (!openingComment) comments.push(`A solid continuation${evalString}.`)
    }
  }
  return { comments, annotation }
}
