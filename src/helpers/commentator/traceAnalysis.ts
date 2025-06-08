import { Move } from '@/types/chess/Move'
import { PosFeature, Trace } from '@/types/chess/Trace'

export interface TraceComparison {
  feature: PosFeature
  playedValue: number
  bestValue: number
  difference: number
  significance: 'major' | 'moderate' | 'minor'
  explanation: string
}

export function compareTraces(
  playedMove: Move,
  bestMoveTrace: Trace | undefined,
  isWhiteToMove: boolean
): TraceComparison[] {
  if (!playedMove.trace || !bestMoveTrace) return []

  const comparisons: TraceComparison[] = []
  // Adjusted thresholds for normalized values (-1 to 1)
  const significantThreshold = 0.1 // Major difference in normalized score
  const moderateThreshold = 0.07 // Moderate difference in normalized score

  Object.entries(playedMove.trace).forEach(([feature, playedValue]) => {
    // Skip Total evaluation as it's redundant with overall position eval
    if (feature === 'Total' || feature || 'FinalEvaluation') return

    const bestValue = bestMoveTrace[feature as PosFeature]
    if (typeof playedValue !== 'number' || typeof bestValue !== 'number') return

    let difference = bestValue - playedValue
    if (!isWhiteToMove) difference = -difference // Flip for black

    const absDiff = Math.abs(difference)
    if (absDiff < 0.05) return // Ignore tiny differences (5% of the scale)

    let significance: 'major' | 'moderate' | 'minor'
    if (absDiff >= significantThreshold) significance = 'major'
    else if (absDiff >= moderateThreshold) significance = 'moderate'
    else significance = 'minor'

    const explanation = getFeatureExplanation(
      feature as PosFeature,
      difference,
      absDiff
    )

    comparisons.push({
      feature: feature as PosFeature,
      playedValue,
      bestValue,
      difference,
      significance,
      explanation,
    })
  })

  return comparisons.sort(
    (a, b) => Math.abs(b.difference) - Math.abs(a.difference)
  )
}

function getFeatureExplanation(
  feature: PosFeature,
  difference: number,
  magnitude: number
): string {
  const isPositive = difference > 0

  // Convert magnitude to descriptive terms
  let intensityWord = ''
  if (magnitude >= 0.4) intensityWord = 'significantly'
  else if (magnitude >= 0.2) intensityWord = 'notably'
  else intensityWord = 'slightly'

  const explanations: Record<
    PosFeature,
    { positive: string; negative: string }
  > = {
    Material: {
      positive: `The alternative would have ${intensityWord} gained material`,
      negative: `This move ${intensityWord} sacrifices material compared to alternatives`,
    },
    Mobility: {
      positive: `The alternative would have ${intensityWord} improved piece mobility`,
      negative: `This ${intensityWord} restricts piece movement compared to alternatives`,
    },
    'King Safety': {
      positive: `The alternative would have ${intensityWord} better protected the king`,
      negative: `This ${intensityWord} exposes the king more than necessary`,
    },
    'Passed Pawns': {
      positive: `The alternative would have ${intensityWord} improved passed pawn potential`,
      negative: `This ${intensityWord} weakens pawn advancement prospects`,
    },
    Space: {
      positive: `The alternative would have ${intensityWord} gained more space`,
      negative: `This ${intensityWord} gives up space unnecessarily`,
    },
    Bishops: {
      positive: `The alternative would have ${intensityWord} improved bishop positioning`,
      negative: `This ${intensityWord} worsens bishop placement`,
    },
    Knights: {
      positive: `The alternative would have ${intensityWord} improved knight positioning`,
      negative: `This ${intensityWord} worsens knight placement`,
    },
    Rooks: {
      positive: `The alternative would have ${intensityWord} improved rook positioning`,
      negative: `This ${intensityWord} worsens rook placement`,
    },
    Queens: {
      positive: `The alternative would have ${intensityWord} improved queen positioning`,
      negative: `This ${intensityWord} worsens queen placement`,
    },
    Threats: {
      positive: `The alternative would have ${intensityWord} created stronger threats`,
      negative: `This ${intensityWord} reduces tactical pressure`,
    },
    Imbalance: {
      positive: `The alternative would have ${intensityWord} created a more favorable imbalance`,
      negative: `This ${intensityWord} creates an unfavorable position imbalance`,
    },
    Winnable: {
      positive: `The alternative would have ${intensityWord} improved winning chances`,
      negative: `This ${intensityWord} reduces winning prospects`,
    },
    Total: {
      positive: '',
      negative: '',
    },
  }

  const featureExplain = explanations[feature]
  if (!featureExplain) {
    const percentage = (Math.abs(difference) * 100).toFixed(0)
    return `${feature}: ${difference > 0 ? '+' : '-'}${percentage}% difference`
  }

  return isPositive ? featureExplain.positive : featureExplain.negative
}

export function generateTraceComments(
  comparisons: TraceComparison[]
): string[] {
  if (comparisons.length === 0) return []

  const comments: string[] = []
  const majorIssues = comparisons.filter((c) => c.significance === 'major')
  const moderateIssues = comparisons.filter(
    (c) => c.significance === 'moderate'
  )

  // No need to filter out 'Total' anymore since we exclude it in compareTraces
  if (majorIssues.length > 0) {
    const topIssue = majorIssues[0]
    comments.push(`${topIssue.explanation}.`)

    if (majorIssues.length > 1) {
      const secondIssue = majorIssues[1]
      // Make sure to start with lowercase for the continuation
      const explanation = secondIssue.explanation
      const lowerExplanation =
        explanation.charAt(0).toLowerCase() + explanation.slice(1)
      comments.push(`Additionally, ${lowerExplanation}.`)
    }
  } else if (moderateIssues.length > 0) {
    const topIssue = moderateIssues[0]
    comments.push(`${topIssue.explanation}.`)

    // Add context that this is comparing to the end of the best variation
    if (moderateIssues.length === 1) {
      comments.push(
        `This difference becomes apparent when comparing the resulting positions.`
      )
    }
  }

  // If we have multiple significant differences, add a summary
  if (majorIssues.length + moderateIssues.length > 2) {
    const totalSignificant = majorIssues.length + moderateIssues.length
    comments.push(
      `The best variation addresses ${totalSignificant} positional factors more effectively.`
    )
  }

  return comments
}
