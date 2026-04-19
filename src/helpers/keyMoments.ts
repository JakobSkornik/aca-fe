/**
 * Collapse backend `keyMomentType` strings into 4 UI severity levels (wireframe).
 */
export type KeyMomentSeverity = 'brilliant' | 'critical' | 'inaccuracy' | 'blunder' | 'info'

const BRILLIANT = new Set(['brilliant'])

const CRITICAL = new Set(['critical_decision', 'structural_transformation'])

const INACCURACY = new Set([
  'inaccuracy',
  'mistake',
  'missed_opportunity',
  'good_defense',
  'great_move',
  'piece_activation',
  'initiative_shift',
  'opening_transition',
  'endgame_transition',
])

const BLUNDER = new Set(['blunder', 'king_safety_crisis'])

export function keyMomentSeverity(keyMomentType: string | undefined): KeyMomentSeverity {
  if (!keyMomentType) return 'info'
  if (BRILLIANT.has(keyMomentType)) return 'brilliant'
  if (BLUNDER.has(keyMomentType)) return 'blunder'
  if (CRITICAL.has(keyMomentType)) return 'critical'
  if (INACCURACY.has(keyMomentType)) return 'inaccuracy'
  return 'info'
}

/** Human label for badge (short). */
export function keyMomentLabel(keyMomentType: string | undefined): string {
  if (!keyMomentType) return ''
  const map: Record<string, string> = {
    brilliant: 'Brilliant',
    great_move: 'Great',
    good_defense: 'Defense',
    inaccuracy: 'Inaccuracy',
    mistake: 'Mistake',
    blunder: 'Blunder',
    missed_opportunity: 'Missed',
    critical_decision: 'Critical',
    structural_transformation: 'Structure',
    king_safety_crisis: 'King',
    initiative_shift: 'Initiative',
    piece_activation: 'Activate',
    opening_transition: 'Opening',
    endgame_transition: 'Endgame',
  }
  return map[keyMomentType] ?? keyMomentType.replace(/_/g, ' ')
}

export function severityBadgeClass(sev: KeyMomentSeverity): string {
  switch (sev) {
    case 'brilliant':
      return 'bg-background-success text-text-success'
    case 'blunder':
      return 'bg-background-danger text-text-danger'
    case 'critical':
      return 'bg-background-warning text-text-warning'
    case 'inaccuracy':
      return 'bg-background-info text-text-info'
    default:
      return 'bg-background-secondary text-text-secondary border border-border-tertiary'
  }
}
