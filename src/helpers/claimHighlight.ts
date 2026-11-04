import type { CustomSquareStyles, Square } from 'react-chessboard/dist/chessboard/types'
import type { ClaimEvidence, CommentFactsClaim } from '@/types/GameJson'
import type { CommentPart } from '@/components/StructuredComment'

/** What a hovered statement highlights: its line, the support ply, and the squares. */
export type ClaimHighlight = {
  part: CommentPart
  /** Support ply along the line (1 = after the move); 0 when unknown. */
  supportPly: number
  evidence: ClaimEvidence
  text: string
}

const ROLE_COLORS: Record<string, string> = {
  subject: 'var(--accent)',
  target: 'var(--inacc)',
  attacker: 'var(--accent)',
  king: 'var(--inacc)',
}
const SQUARE_ALPHA = '55%'
const FILE_ALPHA = '22%'

export function claimHighlight(claim: CommentFactsClaim, part: CommentPart): ClaimHighlight | null {
  const evidence = claim.evidence
  if (!evidence || (!evidence.squares?.length && !evidence.files?.length)) return null
  return { part, supportPly: claim.support_ply ?? 0, evidence, text: claim.text }
}

function tint(color: string, alpha: string) {
  return `color-mix(in srgb, ${color} ${alpha}, transparent)`
}

export function fileSquares(file: string): Square[] {
  return ['1', '2', '3', '4', '5', '6', '7', '8'].map((r) => `${file}${r}` as Square)
}

/** Square styles for the support position (the variation board). */
export function evidenceSquareStyles(evidence: ClaimEvidence): CustomSquareStyles {
  const styles: CustomSquareStyles = {}
  for (const file of evidence.files ?? []) {
    for (const sq of fileSquares(file)) styles[sq] = { backgroundColor: tint('var(--accent)', FILE_ALPHA) }
  }
  const roles = new Map<string, string>()
  for (const piece of evidence.pieces ?? []) roles.set(piece.square, piece.role)
  for (const sq of evidence.squares ?? []) {
    const color = ROLE_COLORS[roles.get(sq) ?? 'subject'] ?? 'var(--accent)'
    styles[sq as Square] = {
      backgroundColor: tint(color, SQUARE_ALPHA),
      boxShadow: `inset 0 0 0 3px ${tint(color, '85%')}`,
    }
  }
  return styles
}

/** Square styles for the starting position (the game board): the same entities before the move. */
export function baselineSquareStyles(evidence: ClaimEvidence): CustomSquareStyles {
  const styles: CustomSquareStyles = {}
  for (const file of evidence.files ?? []) {
    for (const sq of fileSquares(file)) styles[sq] = { backgroundColor: tint('var(--fg-3)', FILE_ALPHA) }
  }
  for (const sq of evidence.baseline_squares ?? []) {
    styles[sq as Square] = { boxShadow: `inset 0 0 0 3px ${tint('var(--fg-3)', '80%')}` }
  }
  return styles
}

/** Short legend text: "knight on d4, pawn on e5 · target: rook on e1". */
export function evidenceSummary(evidence: ClaimEvidence): string {
  const byRole: Record<string, string[]> = {}
  for (const piece of evidence.pieces ?? []) {
    const role = piece.role || 'subject'
    ;(byRole[role] ??= []).push(`${piece.color} ${piece.piece} on ${piece.square}`)
  }
  const parts = Object.entries(byRole).map(([role, items]) => `${role}: ${items.join(', ')}`)
  const bare = (evidence.squares ?? []).filter((sq) => !(evidence.pieces ?? []).some((p) => p.square === sq))
  if (bare.length) parts.push(`squares: ${bare.join(', ')}`)
  if (evidence.files?.length) parts.push(`files: ${evidence.files.join(', ')}`)
  return parts.join(' · ')
}
