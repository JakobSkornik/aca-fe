import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { PlayerLine } from '@/types/Line'

type PlayerCtx = {
  line: PlayerLine | null
  /** Index the player should jump to when a line is (re)loaded. */
  initialIdx: number
  loadLine: (line: PlayerLine, initialIdx?: number) => void
  /** Monotonic counter so reloading the same line still resets the player. */
  loadSeq: number
}

const Ctx = createContext<PlayerCtx | null>(null)

export const VariationPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [line, setLine] = useState<PlayerLine | null>(null)
  const [initialIdx, setInitialIdx] = useState(0)
  const [loadSeq, setLoadSeq] = useState(0)

  const loadLine = useCallback((next: PlayerLine, idx?: number) => {
    setLine(next)
    setInitialIdx(idx ?? Math.max(0, next.steps.length - 1))
    setLoadSeq((s) => s + 1)
  }, [])

  const value = useMemo(
    () => ({ line, initialIdx, loadLine, loadSeq }),
    [line, initialIdx, loadLine, loadSeq]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Nullable on purpose: chips degrade gracefully outside the game page. */
export function useVariationPlayer(): PlayerCtx | null {
  return useContext(Ctx)
}
