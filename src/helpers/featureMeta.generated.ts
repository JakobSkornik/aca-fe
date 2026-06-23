// AUTO-GENERATED from the backend feature_catalog (scripts/export_feature_meta.py).
// Do not edit by hand — change the backend catalog and re-run the script.

export type FeatureUnit = 'cp' | 'squares' | 'pawns' | 'count' | 'flag'

export interface FeatureMetaEntry {
  label: string
  description: string
  unit: FeatureUnit
  group: string
  source: 'stockfish' | 'custom'
}

export const FEATURE_META: Record<string, FeatureMetaEntry> = {
  "MATERIAL_BALANCE": {"label": "Material", "description": "Net material on the board (White minus Black), in centipawns.", "unit": "cp", "group": "Material", "source": "stockfish"},
  "EVALUATE_PAWNS": {"label": "Pawn Structure", "description": "Overall pawn-structure balance: doubled, isolated, backward and passed pawns.", "unit": "cp", "group": "Pawns", "source": "custom"},
  "PAWN_DOUBLED": {"label": "Doubled Pawns", "description": "Doubled pawns: a pawn directly behind a friendly pawn on the same file, unsupported.", "unit": "pawns", "group": "Pawns", "source": "stockfish"},
  "PAWN_ISOLATED": {"label": "Isolated Pawns", "description": "Isolated pawns: no friendly pawn on either adjacent file.", "unit": "pawns", "group": "Pawns", "source": "stockfish"},
  "PAWN_BACKWARD": {"label": "Backward Pawns", "description": "Backward pawns: behind the pawns on adjacent files and unable to advance safely.", "unit": "pawns", "group": "Pawns", "source": "stockfish"},
  "WEAK_PAWNS": {"label": "Weak Pawns", "description": "Weak pawns (isolated or backward) that are hard to defend.", "unit": "pawns", "group": "Pawns", "source": "stockfish"},
  "PAWN_PASSED": {"label": "Passed Pawns", "description": "Passed pawns: no enemy pawn can stop them on their file or the adjacent files.", "unit": "cp", "group": "Pawns", "source": "stockfish"},
  "PAWN_DUO": {"label": "Pawn Phalanx", "description": "Phalanx: two friendly pawns side by side on adjacent files.", "unit": "pawns", "group": "Pawns", "source": "stockfish"},
  "PAWN_ADVANCES": {"label": "Pawn Advancement", "description": "How far the pawns have advanced from their starting rank.", "unit": "cp", "group": "Pawns", "source": "custom"},
  "KNIGHTS_OUTPOSTS": {"label": "Knight Outposts", "description": "Knights on an outpost square \u2014 supported by a pawn and immune to enemy pawn attack.", "unit": "count", "group": "Pieces", "source": "stockfish"},
  "KNIGHTS_CENTRALIZATION": {"label": "Knight Centralization", "description": "How centrally the knights are posted, where they influence most squares.", "unit": "cp", "group": "Pieces", "source": "custom"},
  "BISHOP_PAIR": {"label": "Bishop Pair", "description": "Bonus for holding both bishops, which cover complementary colour complexes.", "unit": "cp", "group": "Pieces", "source": "stockfish"},
  "BISHOP_PLUS_PAWNS_ON_COLOR": {"label": "Bishop vs Own Pawns", "description": "Own pawns on the bishop's colour, scaled by blocked central pawns (Stockfish bishop-pawns) \u2014 higher means the bishop is more hemmed in.", "unit": "count", "group": "Pieces", "source": "stockfish"},
  "BISHOPS_MOBILITY": {"label": "Bishop Mobility", "description": "How many squares the bishops can reach \u2014 their scope and activity.", "unit": "cp", "group": "Pieces", "source": "stockfish"},
  "BAD_BISHOP": {"label": "Bad Bishop", "description": "A bishop hemmed in by its own pawns fixed on its colour, with low mobility.", "unit": "cp", "group": "Pieces", "source": "custom"},
  "ROOK_OPEN_FILE": {"label": "Rook on Open File", "description": "Rooks on a file with no pawns of either colour.", "unit": "count", "group": "Pieces", "source": "stockfish"},
  "ROOK_HALF_OPEN_FILE": {"label": "Rook on Half-Open File", "description": "Rooks on a file with no friendly pawns but an enemy pawn.", "unit": "count", "group": "Pieces", "source": "stockfish"},
  "ROOK_ON_SEVENTH": {"label": "Rook on 7th", "description": "Rook(s) on the 7th rank, attacking pawns and confining the enemy king.", "unit": "cp", "group": "Pieces", "source": "custom"},
  "ROOK_BEHIND_PASSED_PAWN": {"label": "Rook Behind Passer", "description": "Rook supporting or blockading a passed pawn from behind.", "unit": "cp", "group": "Pieces", "source": "custom"},
  "ROOKS_CONNECTED": {"label": "Connected Rooks", "description": "Rooks defending each other along a rank or file.", "unit": "cp", "group": "Pieces", "source": "custom"},
  "PIECE_ACTIVITY": {"label": "Piece Activity", "description": "Piece mobility: squares the minor/major pieces can reach in the mobility area (Stockfish definition). Measured in squares.", "unit": "squares", "group": "Activity", "source": "stockfish"},
  "CENTER_CONTROL": {"label": "Center Control", "description": "Control of the central squares (d4, e4, d5, e5) by pawns and pieces.", "unit": "cp", "group": "Activity", "source": "custom"},
  "SPACE": {"label": "Space", "description": "Space advantage: safe squares controlled behind the pawn chain.", "unit": "cp", "group": "Activity", "source": "stockfish"},
  "EVALUATE_KING_SAFETY": {"label": "King Safety", "description": "Overall king safety: pawn shelter, attacking pieces and exposed squares around the king.", "unit": "cp", "group": "King", "source": "custom"},
  "KING_DANGER": {"label": "King Danger", "description": "Pressure on the king (Stockfish king-danger core): enemy attackers and their weight, attacks next to the king, and weakly-defended squares around it. Negative for the side whose king is under fire.", "unit": "cp", "group": "King", "source": "stockfish"},
  "BACK_RANK": {"label": "Back-Rank Weakness", "description": "Risk of back-rank mate: a king hemmed in by its own pawns with no luft.", "unit": "cp", "group": "King", "source": "custom"},
  "KING_TROPISM": {"label": "King Tropism", "description": "How close the pieces are to the enemy king \u2014 a proxy for attacking pressure.", "unit": "cp", "group": "King", "source": "custom"},
  "CASTLING_RIGHTS": {"label": "Castling Rights", "description": "Retained castling rights \u2014 the flexibility to still castle either side.", "unit": "cp", "group": "King", "source": "custom"},
  "WEAK_ENEMIES": {"label": "Weak Enemies", "description": "Enemy pieces under our attack and not defended by a pawn.", "unit": "count", "group": "Threats", "source": "stockfish"},
  "HANGING": {"label": "Hanging Enemies", "description": "Weak enemy pieces that are undefended, or non-pawns we attack more than once \u2014 pieces in real danger of being won.", "unit": "count", "group": "Threats", "source": "stockfish"},
  "PINS": {"label": "Pins", "description": "Enemy minor/major pieces pinned to their king by our sliders.", "unit": "count", "group": "Threats", "source": "stockfish"},
  "KING_ACTIVITY": {"label": "King Activity", "description": "How actively the king takes part \u2014 mostly relevant in the endgame.", "unit": "cp", "group": "Endgame", "source": "custom"},
  "OUTSIDE_PASSER": {"label": "Outside Passer", "description": "A passed pawn far from the kings \u2014 often decisive in the endgame.", "unit": "cp", "group": "Endgame", "source": "custom"},
  "PASSER_KING_ESCORT": {"label": "Passer King Escort", "description": "Own king close to a friendly passed pawn, helping to escort it.", "unit": "cp", "group": "Endgame", "source": "stockfish"},
}
