import { CaptureCount } from '@/types/chess/CaptureCount'

export function emptyCaptureCount(): CaptureCount {
  return { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }
}

export function cloneCaptureCount(c: CaptureCount): CaptureCount {
  return { ...c }
}

/** Increment running capture tallies when a move captures a piece. */
export function applyCaptureFromMoveResult(
  capW: CaptureCount,
  capB: CaptureCount,
  captured: string | undefined,
  moverColor: 'w' | 'b'
): { capW: CaptureCount; capB: CaptureCount } {
  if (!captured) return { capW, capB }
  const key = captured as keyof CaptureCount
  if (moverColor === 'w') {
    const next = cloneCaptureCount(capW)
    next[key] = (next[key] || 0) + 1
    return { capW: next, capB }
  }
  const next = cloneCaptureCount(capB)
  next[key] = (next[key] || 0) + 1
  return { capW, capB: next }
}
