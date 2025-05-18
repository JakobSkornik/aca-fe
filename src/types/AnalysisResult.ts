export interface CaptureCount {
  p: number
  n: number
  b: number
  r: number
  q: number
  k: number
}

export interface BestContinuation {
  move: string
  score: number
}

export interface Move {
  position: string
  move: string
  shallow_score: number
  deep_score: number
  phase: string
  bestContinuations: BestContinuation[]
  capturedByWhite: CaptureCount
  capturedByBlack: CaptureCount
  piece: string | null
  trace: Record<string, string | TraceFeature>
}

export interface TraceFeature {
  eg: number
  mg: number
}

export interface MoveAnalysisNode {
  id: number
  depth: number
  parent: number
  move: string
  fen: string
  shallow_score: number
  deep_score: number
  trace: Record<string, string | TraceFeature>
  context: string
  phase: string
  capturedByWhite: CaptureCount
  capturedByBlack: CaptureCount
  piece: string | null
}

export interface AnalysisResult {
  metadata: {
    white_name: string
    black_name: string
    white_elo: number
    black_elo: number
    event: string
    opening: string
    result: string
  }
  moves: Move[]
  move_tree: Record<string, MoveAnalysisNode>
}
