import React, { useEffect, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'

/** Compact engine eval bar shown under the board (PVs live in the Lines tab). */
const EvalBar: React.FC = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex } = state
  const [animatedScore, setAnimatedScore] = useState(50)

  const mainlineMove = manager.getMainlineMove(currentMoveIndex)
  const score = mainlineMove?.score ?? 0
  const mateIn = mainlineMove?.mateIn
  const isBookMove = mainlineMove?.phase === 'early' && mainlineMove?.score === undefined

  useEffect(() => {
    if (isBookMove) {
      setAnimatedScore(50)
    } else if (mateIn != null && mateIn !== 0) {
      setAnimatedScore(mateIn > 0 ? 100 : 0)
    } else {
      const sigmoid = 1 / (1 + Math.exp(-(score / 100)))
      setAnimatedScore(sigmoid * 100)
    }
  }, [score, mateIn, isBookMove])

  const centerLabel = isBookMove
    ? 'Book'
    : mateIn != null && mateIn !== 0
      ? `M${mateIn}`
      : (score / 100).toFixed(2)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] text-text-tertiary">
        <span>White</span>
        <span>Black</span>
      </div>
      <div className="relative mt-0.5 h-4 rounded-full bg-background-secondary">
        <div
          className="absolute h-full rounded-full bg-accent-engine transition-[width] duration-500"
          style={{ width: `${animatedScore}%`, left: 0 }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-text-primary drop-shadow-[0_0_1px_var(--color-background-primary)]">
          {centerLabel}
        </div>
      </div>
    </div>
  )
}

export default EvalBar
