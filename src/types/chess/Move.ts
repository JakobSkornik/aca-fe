import { CaptureCount } from "./CaptureCount"
import { TraceFeature } from "./TraceFeature"

export interface Move {
  id: number
  depth: number
  position: string
  move: string
  isAnalyzed: boolean
  context: string
  annotation?: string
  score?: number
  phase?: string
  capturedByWhite?: CaptureCount
  capturedByBlack?: CaptureCount
  piece?: string | null
  trace?: Record<string, string | TraceFeature>
}
