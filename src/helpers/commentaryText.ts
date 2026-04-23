/**
 * Backend heuristic / stub lines that should not appear as "real" commentary in the main pane.
 * Matches legacy `(Score change: …)` and current `(Eval swing: …)` tails, teaching stubs, etc.
 */
const HEURISTIC_FALLBACK_RE = new RegExp(
  [
    // "Inaccuracy (Eval swing: +0.88 pawns, White POV step)" and legacy "Score change"
    '\\((?:Score change|Eval swing)[^)]*\\)\\s*$',
    '^Teaching highlight\\b',
    '^Continues the same theme as around ply\\b',
    '^Commentary temporarily unavailable\\.?$',
  ].join('|'),
  'i',
)

export function isEngineKeyMomentScoreComment(text: string): boolean {
  const t = text.trim()
  return t.length > 0 && HEURISTIC_FALLBACK_RE.test(t)
}
