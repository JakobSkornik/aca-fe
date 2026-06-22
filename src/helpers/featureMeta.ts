/**
 * Human-readable labels and one-line explanations for the Guid positional
 * features (White-POV centipawn terms). Used by the variation navigator for
 * chart titles and hover popups. Feature keys are either a global term
 * (e.g. MATERIAL_BALANCE) or side-prefixed (WHITE_/BLACK_) base concepts.
 */

const NET_LABELS: Record<string, string> = {
  MATERIAL_BALANCE: 'Material',
  EVALUATE_PAWNS: 'Pawn Structure',
  EVALUATE_KING_SAFETY: 'King Safety',
  KING_TROPISM: 'King Tropism',
  CASTLING_RIGHTS: 'Castling Rights',
}

const BASE_LABELS: Record<string, string> = {
  BISHOP_PAIR: 'Bishop Pair',
  BAD_BISHOP: 'Bad Bishop',
  BISHOPS_MOBILITY: 'Bishop Mobility',
  BISHOP_PLUS_PAWNS_ON_COLOR: 'Bishop vs Own Pawns',
  CASTLING_RIGHTS: 'Castling Rights',
  CENTER_CONTROL: 'Center Control',
  KING_ACTIVITY: 'King Activity',
  KING_SHIELD: 'King Shield',
  KING_TROPISM: 'King Tropism',
  KNIGHTS_CENTRALIZATION: 'Knight Centralization',
  KNIGHTS_OUTPOSTS: 'Knight Outposts',
  OUTSIDE_PASSER: 'Outside Passer',
  PAWN_DOUBLED: 'Doubled Pawns',
  PAWN_PASSED: 'Passed Pawns',
  PIECE_ACTIVITY: 'Piece Activity',
  ROOK_ON_SEVENTH: 'Rook on 7th',
  ROOK_OPEN_FILE: 'Rook on Open File',
  SPACE: 'Space',
  WEAK_PAWNS: 'Weak Pawns',
}

const DESCRIPTIONS: Record<string, string> = {
  MATERIAL_BALANCE: 'Net material on the board (White minus Black), in centipawns.',
  EVALUATE_PAWNS:
    'Overall pawn-structure evaluation: doubled, isolated, backward and passed pawns.',
  EVALUATE_KING_SAFETY:
    'Overall king safety: pawn shelter, attacking pieces and exposed squares around the king.',
  KING_TROPISM: 'How close the pieces are to the enemy king — a proxy for attacking pressure.',
  BISHOP_PAIR: 'Bonus for holding both bishops, which cover complementary colour complexes.',
  BAD_BISHOP: 'Penalty for a bishop hemmed in by its own pawns fixed on its colour.',
  BISHOPS_MOBILITY: 'How many squares the bishops can reach — their scope and activity.',
  BISHOP_PLUS_PAWNS_ON_COLOR:
    'Interaction between a bishop and the friendly pawns fixed on its colour.',
  CASTLING_RIGHTS:
    'Retained castling rights — the flexibility to still castle king- or queenside.',
  CENTER_CONTROL: 'Control of the central squares (d4, e4, d5, e5) by pawns and pieces.',
  KING_ACTIVITY: 'How actively the king takes part — mostly relevant in the endgame.',
  KING_SHIELD: 'Integrity of the pawns shielding the king (the castled pawn chain).',
  KNIGHTS_CENTRALIZATION: 'How centrally the knights are posted, where they influence most squares.',
  KNIGHTS_OUTPOSTS: 'Knights on protected squares that enemy pawns can no longer challenge.',
  OUTSIDE_PASSER: 'A passed pawn far from the kings — often decisive in the endgame.',
  PAWN_DOUBLED: 'Penalty for doubled pawns (two pawns of one colour on the same file).',
  PAWN_PASSED: 'Passed pawns: no enemy pawn can stop them on their file or the adjacent files.',
  PIECE_ACTIVITY: 'Overall activity and scope of the pieces.',
  ROOK_ON_SEVENTH: 'Rook(s) on the 7th rank, attacking pawns and confining the enemy king.',
  ROOK_OPEN_FILE: 'Rook(s) on open or half-open files, maximising their range.',
  SPACE: 'Space advantage: the safe squares behind a player’s pawn chain.',
  WEAK_PAWNS: 'Weak pawns (isolated or backward) that are hard to defend.',
}

function titleCase(base: string): string {
  return base
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function baseName(name: string): string {
  return name.replace(/^WHITE_/, '').replace(/^BLACK_/, '')
}

/** Readable chart title, e.g. `WHITE_KING_SHIELD` -> `W King Shield`. */
export function featureLabel(name: string): string {
  if (NET_LABELS[name]) return NET_LABELS[name]
  const side = name.startsWith('WHITE_') ? 'W ' : name.startsWith('BLACK_') ? 'B ' : ''
  const base = baseName(name)
  return side + (BASE_LABELS[base] ?? titleCase(base))
}

/** One-line explanation for a feature (for hover popups), or '' if unknown. */
export function featureDescription(name: string): string {
  return DESCRIPTIONS[name] ?? DESCRIPTIONS[baseName(name)] ?? ''
}
