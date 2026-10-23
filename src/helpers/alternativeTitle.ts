import type { CommentFactsJson } from '@/types/GameJson'

/** Match the backend's comparison in the mover's point of view. */
export function alternativeTitle(facts: CommentFactsJson): string {
  const alt = facts.better_alternative
  if (!alt) return 'Alternative'
  const unknown = `Alternative: ${alt.san}`
  const turn = facts.display_line?.start_fen?.split(' ')[1]
    ?? alt.display_line?.start_fen?.split(' ')[1]
  if (turn !== 'w' && turn !== 'b') return unknown
  const direction = turn === 'w' ? 1 : -1
  const playedMate = facts.eval_mate
  const altMate = alt.eval_mate ?? null
  let comparison: 'better' | 'weaker' | 'comparable'
  if (playedMate === 0 || altMate === 0) return unknown
  if (playedMate != null || altMate != null) {
    if ((playedMate == null && facts.eval_cp == null) || (altMate == null && alt.eval_cp == null)) return unknown
    const rank = (mate: number | null) => mate == null ? 0 : mate * direction > 0 ? 1 : -1
    const playedRank = rank(playedMate)
    const altRank = rank(altMate)
    if (playedRank !== altRank) comparison = altRank > playedRank ? 'better' : 'weaker'
    else if (playedMate === altMate) comparison = 'comparable'
    else {
      const shorter = Math.abs(altMate!) < Math.abs(playedMate!)
      comparison = (altRank > 0 ? shorter : !shorter) ? 'better' : 'weaker'
    }
  } else {
    if (facts.eval_cp == null || alt.eval_cp == null) return unknown
    const gap = (alt.eval_cp - facts.eval_cp) * direction
    comparison = gap >= 50 ? 'better' : gap <= -50 ? 'weaker' : 'comparable'
  }
  return `${comparison === 'better' ? 'Better was' : comparison === 'weaker' ? 'Weaker was' : 'Comparable:'} ${alt.san}`
}
