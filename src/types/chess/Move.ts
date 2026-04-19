import { CaptureCount } from "./CaptureCount"
import { TraceFeature } from "./TraceFeature"

export interface Move {
  id: number
  depth: number
  position: string
  move: string
  isAnalyzed: boolean
  context: string // mainline, pv1, pv2
  annotation?: string
  score?: number
  /** From engine `MoveScore.mate` when present; positive = White mates in N. */
  mateIn?: number | null
  phase?: string // early, mid, end
  capturedByWhite?: CaptureCount
  capturedByBlack?: CaptureCount
  piece?: string | null
  trace?: Record<string, string | TraceFeature>
  hiddenFeatures?: Record<string, unknown>
}
