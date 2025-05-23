export interface CaptureCount {
  p: number
  n: number
  b: number
  r: number
  q: number
  k: number
}

export interface PV {
  score: number
  moves: string[]
}

export interface Move {
  position: string
  move: string
  isAnalyzed: boolean
  context: string
  score?: number
  phase?: string
  pvs?: PV[]
  capturedByWhite?: CaptureCount
  capturedByBlack?: CaptureCount
  piece?: string | null
  trace?: Record<string, string | TraceFeature>
}

export interface TraceFeature {
  eg: number
  mg: number
}

export interface MoveAnalysisNode {
  id: number
  parent: number
  piece: string | null
  depth: number
  move: Move
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
