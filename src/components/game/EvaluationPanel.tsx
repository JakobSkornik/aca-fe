import React, { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import PvChipWithHover from '@/components/PvChipWithHover'
import { UIHelpers } from '@/helpers/uiHelpers'
import { useGameState } from '@/contexts/GameStateContext'
import { Card } from '@/components/ui/Card'

const EvaluationPanel: React.FC = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex } = state
  const [animatedScore, setAnimatedScore] = useState(-1)

  const mainlineMove = manager.getMainlineMove(currentMoveIndex)
  const score = mainlineMove?.score ?? 0
  const mateIn = mainlineMove?.mateIn

  const getCurrentPv1 = () => {
    const pv1Moves = manager.getPv1(currentMoveIndex)
    return pv1Moves.length > 0 ? pv1Moves : []
  }

  const getCurrentPv2 = () => {
    const pv2Moves = manager.getPv2(currentMoveIndex)
    return pv2Moves.length > 0 ? pv2Moves : []
  }

  const pv1 = getCurrentPv1()
  const pv2 = getCurrentPv2()

  const rootFen = useMemo(
    () => manager.getPositionForIndex(currentMoveIndex - 1),
    [manager, currentMoveIndex]
  )

  const pv1Fens = useMemo(() => {
    try {
      const c = new Chess(rootFen)
      return pv1.map((m) => {
        try {
          const r = c.move(m.move)
          return r ? c.fen() : ''
        } catch {
          return ''
        }
      })
    } catch {
      return pv1.map(() => '')
    }
  }, [pv1, rootFen])

  const pv2Fens = useMemo(() => {
    try {
      const c = new Chess(rootFen)
      return pv2.map((m) => {
        try {
          const r = c.move(m.move)
          return r ? c.fen() : ''
        } catch {
          return ''
        }
      })
    } catch {
      return pv2.map(() => '')
    }
  }, [pv2, rootFen])

  const normalizeScore = (s: number) => {
    const scoreInPawns = s / 100
    const k = 1
    const sigmoid = 1 / (1 + Math.exp(-k * scoreInPawns))
    return sigmoid * 100
  }

  useEffect(() => {
    if (mateIn != null && mateIn !== 0) {
      setAnimatedScore(mateIn > 0 ? 100 : 0)
    } else {
      setAnimatedScore(normalizeScore(score))
    }
  }, [score, mateIn])

  const centerLabel =
    mateIn != null && mateIn !== 0 ? `M${mateIn}` : (score / 100).toFixed(2)

  return (
    <Card title="Engine" className="flex h-full min-h-0 flex-col" bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border-tertiary px-3 py-2.5">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>White</span>
          <span>Black</span>
        </div>
        <div className="relative mt-1.5 h-4 rounded-full bg-background-secondary">
          <div
            className="absolute h-full rounded-full bg-accent-engine transition-[width] duration-500"
            style={{
              width: `${animatedScore}%`,
              left: 0,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-text-primary drop-shadow-[0_0_1px_var(--color-background-primary)]">
            {centerLabel}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Principal variation 1
          </div>
          {pv1.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 font-bold text-text-primary">
                {pv1[0]?.score !== undefined ? (pv1[0].score / 100).toFixed(2) : ''}
              </span>
              <div className="flex flex-wrap gap-1">
                {pv1.map((move, moveIdx) => {
                  const isWhiteMove = (currentMoveIndex + moveIdx) % 2 === 1
                  const moveColors = UIHelpers.getPvMoveColors(false, isWhiteMove)
                  return (
                    <PvChipWithHover
                      key={moveIdx}
                      san={move.move}
                      fenAfterMove={pv1Fens[moveIdx] ?? ''}
                      className={`cursor-help rounded-sm px-1 py-0.5 ${moveColors.bg} ${moveColors.text}`}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Principal variation 2
          </div>
          {pv2.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 font-bold text-text-primary">
                {pv2[0]?.score !== undefined ? (pv2[0].score / 100).toFixed(2) : ''}
              </span>
              <div className="flex flex-wrap gap-1">
                {pv2.map((move, moveIdx) => {
                  const isWhiteMove = (currentMoveIndex + moveIdx) % 2 === 1
                  const moveColors = UIHelpers.getPvMoveColors(false, isWhiteMove)
                  return (
                    <PvChipWithHover
                      key={moveIdx}
                      san={move.move}
                      fenAfterMove={pv2Fens[moveIdx] ?? ''}
                      className={`cursor-help rounded-sm px-1 py-0.5 ${moveColors.bg} ${moveColors.text}`}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default EvaluationPanel
