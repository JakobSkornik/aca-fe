import { getKeyMomentType } from './keyMoments'
import { getOpeningComment } from './openings'
import {
  formatCp,
  compareScores,
  getMaterialBalance,
  getSortedPvs,
  areSameMoveSAN, // Updated import
} from './utils'
import { Move, MoveAnalysisNode } from '@/types/ws'

const CP_TOLERANCE_FOR_BEST_MOVE_MATCH = 15
const SACRIFICE_MATERIAL_THRESHOLD = 100
const EXCELLENT_SACRIFICE_MARGIN_CP = 30
const GREAT_MOVE_MARGIN_CP = 80
const GOOD_MOVE_MARGIN_CP = 30
const MISSED_OPPORTUNITY_THRESHOLD_CP = 70
const MISSED_OPPORTUNITY_BEST_VS_SECOND_BEST_MARGIN_CP = 50

export function buildComments(
  moves: Move[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tree?: Record<number, MoveAnalysisNode>
): string[][] {
  if (!moves || moves.length === 0) return []
  // console.log(moves)
  return moves.map((currentMove, idx) => {
    const comments: string[] = []
    const prevMove = idx > 0 ? moves[idx - 1] : undefined

    const openingCommentStr = getOpeningComment(currentMove)
    if (openingCommentStr) {
      comments.push(openingCommentStr)
      if (idx < 10 && comments.length > 0) {
        return comments
      }
    }

    if (idx === 0) {
      if (comments.length === 0) comments.push('Game start.')
      return comments
    }

    const scoreCurrent = currentMove.score ?? 0
    const scorePrevious = prevMove?.score ?? 0
    const isCurrentMoveByWhite = idx % 2 === 1

    const normChange = prevMove
      ? compareScores(scoreCurrent, scorePrevious, isCurrentMoveByWhite)
      : 0

    let playedMoveIsConsideredBest = false
    let bestTheoreticalOption: { san: string; score: number } | undefined
    let secondBestTheoreticalOption: { san: string; score: number } | undefined
    let advantageLost = 0
    let bestTheoreticalWasClearlySuperior = false

    // The FEN for comparing currentMove.move against prevMove.pvs alternatives
    // is the position *before* currentMove.move was made.
    const fenForComparison = prevMove?.position

    if (prevMove?.pvs && prevMove.pvs.length > 0 && fenForComparison) {
      const sortedParentPvs = getSortedPvs(prevMove.pvs, isCurrentMoveByWhite)

      if (sortedParentPvs.length > 0) {
        const bestPvFromList = sortedParentPvs[0]
        const bestPvScoreCp = Math.round(bestPvFromList.score ?? 0)
        bestTheoreticalOption = {
          san: bestPvFromList.moves[0],
          score: bestPvScoreCp,
        }

        if (
          areSameMoveSAN(
            currentMove.move,
            bestPvFromList.moves[0],
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

        if (sortedParentPvs.length > 1) {
          const secondBestPvFromList = sortedParentPvs[1]
          const secondBestPvScoreCp = Math.round(
            secondBestPvFromList.score ?? 0
          )
          secondBestTheoreticalOption = {
            san: secondBestPvFromList.moves[0],
            score: secondBestPvScoreCp,
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

    const isMissedOpportunity =
      !playedMoveIsConsideredBest &&
      bestTheoreticalOption &&
      advantageLost >= MISSED_OPPORTUNITY_THRESHOLD_CP &&
      bestTheoreticalWasClearlySuperior
    if (isMissedOpportunity && bestTheoreticalOption) {
      comments.push(
        `Missed opportunity! ${bestTheoreticalOption.san} (eval ${formatCp(
          bestTheoreticalOption.score
        )}) was a much stronger option.`
      )
    }

    const keyMomentType = prevMove ? getKeyMomentType(normChange) : null
    if (keyMomentType) {
      if (
        !isMissedOpportunity ||
        !comments.some((c) =>
          c.toLowerCase().includes(keyMomentType.toLowerCase())
        )
      ) {
        comments.push(`${keyMomentType}!`)
      }
    }

    if (playedMoveIsConsideredBest) {
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

      if (isSacrifice && marginToSecondBest >= EXCELLENT_SACRIFICE_MARGIN_CP) {
        comments.push('Excellent move! A brilliant sacrifice.')
      } else if (
        marginToSecondBest >= GREAT_MOVE_MARGIN_CP &&
        currentMove.phase?.toLowerCase() === 'midgame'
      ) {
        comments.push('Great move!')
      } else if (
        marginToSecondBest >= GOOD_MOVE_MARGIN_CP &&
        currentMove.phase?.toLowerCase() === 'midgame'
      ) {
        comments.push('Good move!')
      } else {
        if (
          !comments.some(
            (c) => c.startsWith('Best move') || c.startsWith('Book move')
          )
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

        if (isStrongAdvantage)
          comments.push(
            `${
              isCurrentMoveByWhite ? 'White' : 'Black'
            } maintains a strong advantage${evalString}.`
          )
        else if (isStruggling)
          comments.push(
            `Best available, though ${
              isCurrentMoveByWhite ? 'White' : 'Black'
            } is struggling${evalString}.`
          )
        else if (
          comments.length <= 1 ||
          (comments.length === 1 && comments[0].startsWith('Best move'))
        )
          comments.push(`A solid continuation${evalString}.`)
      }
    } else {
      if (!keyMomentType && !isMissedOpportunity && bestTheoreticalOption) {
        comments.push(
          `A different path was stronger: ${
            bestTheoreticalOption.san
          } (eval ${formatCp(bestTheoreticalOption.score)}).`
        )
      }
      if (!comments.some((c) => c.includes(formatCp(scoreCurrent)))) {
        if (!keyMomentType && !isMissedOpportunity) {
          comments.push(
            `Played ${currentMove.move} (eval ${formatCp(scoreCurrent)}).`
          )
        }
      }
    }

    if (comments.length === 0 && idx > 0) {
      comments.push(
        `Move ${Math.ceil((idx + 1) / 2)}${
          isCurrentMoveByWhite ? '.' : '...'
        } ${currentMove.move}. Eval: ${formatCp(scoreCurrent)}${
          prevMove ? ` (was ${formatCp(scorePrevious)})` : ''
        }.`
      )
    }
    return comments
  })
}
