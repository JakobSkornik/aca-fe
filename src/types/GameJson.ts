export interface MoveScore {
  cp: number | null;
  mate: number | null;
}

export interface Variation {
  rank: number;
  move_san: string;
  score: MoveScore | null;
  line: string[];
}

export interface GameMove {
  mn: number;
  color: 'w' | 'b';
  san: string;
  uci: string;
  fen: string;
  score: MoveScore | null;
  variations: Variation[];
  comment: string | null;
  classification: string | null;
}

export interface GameMetadata {
  id: string;
  white: string;
  black: string;
  result: string;
  date: string | null;
  eventId: string | null;
  whiteElo: number | null;
  blackElo: number | null;
  opening: string | null;
}

export interface AnalysisInfo {
  engine: string;
  depth: number;
  multipv: number;
  timestamp: number;
}

export interface GameJson {
  metadata: GameMetadata;
  moves: GameMove[];
  analysis_info: AnalysisInfo;
}



