import { Move, MoveAnalysisNode, TraceFeature } from '@/types/AnalysisResult'
import { PosFeature, Trace } from '@/types/Trace'

export function parseTrace(node: MoveAnalysisNode | Move | undefined): Trace {
  const trace: Trace = {
    Bishops: 0,
    Imbalance: 0,
    'King Safety': 0,
    Knights: 0,
    Material: 0,
    Mobility: 0,
    'Passed Pawns': 0,
    Queens: 0,
    Rooks: 0,
    Space: 0,
    Threats: 0,
    Winnable: 0,
    Total: 0,
  }
  if (!node || node.trace['error']) {
    return trace
  }

  if (node.phase === 'end') {
    for (const key in node.trace) {
      const val = node.trace[key]
      if (typeof val === 'string') continue
      trace[key as PosFeature] = (val as TraceFeature).eg
    }
  } else {
    for (const key in node.trace) {
      const val = node.trace[key]
      if (typeof val === 'string') continue
      trace[key as PosFeature] = (val as TraceFeature).mg
    }
  }
  return trace
}
