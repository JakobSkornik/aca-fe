/** Numbered chess notation for variation lines: `20. a4 f5 21. Qb3 Bc3 …`
 * (a line starting with Black renders `20... f5 21. Qb3`). */

export type NumberedSan = { label: string; san: string }

function sideAndMoveNoFromFen(fen: string): { turn: 'w' | 'b'; moveNo: number } {
  const parts = (fen || '').split(' ')
  const turn = parts[1] === 'b' ? 'b' : 'w'
  const moveNo = Number.parseInt(parts[5] ?? '1', 10) || 1
  return { turn, moveNo }
}

/** Number a SAN line given the position the line starts FROM. */
export function formatNumberedLine(startFen: string, sans: string[]): NumberedSan[] {
  let { turn, moveNo } = sideAndMoveNoFromFen(startFen)
  return sans.map((san, i) => {
    let label: string
    if (turn === 'w') {
      label = `${moveNo}.${san}`
    } else {
      label = i === 0 ? `${moveNo}...${san}` : san
    }
    if (turn === 'b') moveNo += 1
    turn = turn === 'w' ? 'b' : 'w'
    return { label, san }
  })
}

/**
 * Number a line when only the per-step FENs (positions AFTER each move) are
 * known: the first step's FEN tells whose move it was and the move number.
 */
export function formatNumberedSteps(steps: { san: string; fen: string }[]): NumberedSan[] {
  if (!steps.length) return []
  const after = sideAndMoveNoFromFen(steps[0].fen)
  // After a White move it is Black's turn (same move number); after a Black
  // move it is White's turn of the NEXT move number.
  const firstWasWhite = after.turn === 'b'
  const startMoveNo = firstWasWhite ? after.moveNo : after.moveNo - 1
  let turn: 'w' | 'b' = firstWasWhite ? 'w' : 'b'
  let moveNo = startMoveNo
  return steps.map((s, i) => {
    let label: string
    if (turn === 'w') {
      label = `${moveNo}.${s.san}`
    } else {
      label = i === 0 ? `${moveNo}...${s.san}` : s.san
    }
    if (turn === 'b') moveNo += 1
    turn = turn === 'w' ? 'b' : 'w'
    return { label, san: s.san }
  })
}

export function numberedLineString(startFen: string, sans: string[]): string {
  return formatNumberedLine(startFen, sans)
    .map((x) => x.label)
    .join(' ')
}

/**
 * Standard chess assessment glyph for a White-POV evaluation
 * (=, ⩲, ⩱, ±, ∓, +−, −+). `cp` is in centipawns. Thresholds mirror the
 * backend PGN export so screen and exported NAGs always agree.
 */
export function evalSymbol(
  cp: number | null | undefined,
  mate: number | null | undefined
): string {
  if (mate != null && mate !== 0) return mate > 0 ? '+−' : '−+'
  if (cp == null) return ''
  if (cp >= 150) return '+−'
  if (cp >= 75) return '±'
  if (cp >= 25) return '⩲'
  if (cp > -25) return '='
  if (cp > -75) return '⩱'
  if (cp > -150) return '∓'
  return '−+'
}

/** `(+0.27 ⩲, depth 16)` / `(#4 +−, depth 16)` suffix for the end of a line. */
export function evalDepthSuffix(
  cp: number | null | undefined,
  mate: number | null | undefined,
  depth: number | null | undefined
): string {
  let evalPart: string | null = null
  if (mate != null && mate !== 0) evalPart = `#${Math.abs(mate)}${mate < 0 ? ' for Black' : ''}`
  else if (cp != null) evalPart = `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`
  if (evalPart == null) return ''
  const sym = evalSymbol(cp, mate)
  const core = sym ? `${evalPart} ${sym}` : evalPart
  return depth != null ? `(${core}, depth ${depth})` : `(${core})`
}
