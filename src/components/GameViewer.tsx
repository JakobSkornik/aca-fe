import React, { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'

import PvChipWithHover from './PvChipWithHover'
import { UIHelpers } from '@/helpers/uiHelpers'
import { useGameState } from '@/contexts/GameStateContext'

const GameViewer = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, pgnHeaders } = state
  const { result, opening, whiteName, whiteElo, blackName, blackElo } = pgnHeaders || {
    result: '',
    opening: '',
    whiteName: '',
    whiteElo: '',
    blackName: '',
    blackElo: '',
  }
  const [animatedScore, setAnimatedScore] = useState(-1)

  const mainlineMove = manager.getMainlineMove(currentMoveIndex)
  const score = mainlineMove?.score ?? 0

  const getCurrentPv1 = () => {
    const pv1Moves = manager.getPv1(currentMoveIndex)
    return pv1Moves.length > 0 ? pv1Moves : []
  }

  const getCurrentPv2 = () => {
    const pv2Moves = manager.getPv2(currentMoveIndex)
    return pv2Moves.length > 0 ? pv2Moves : []
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  const normalizeScore = (score: number) => {
    const scoreInPawns = score / 100
    const k = 1
    const sigmoid = 1 / (1 + Math.exp(-k * scoreInPawns))
    return sigmoid * 100
  }

  useEffect(() => {
    const normalizedScore = normalizeScore(score)
    setAnimatedScore(normalizedScore)
  }, [score])

  return (
    <div className="relative flex flex-col w-full h-full rounded-md overflow-hidden text-xs">
      <div className="px-2 py-1.5 border-b bg-light-gray/80 flex-shrink-0">
        <span className="text-sm font-semibold text-darkest-gray">Game Info</span>
      </div>
      <div className="p-2 border-b z-10 flex-shrink-0 overflow-y-auto max-h-[28%]">
        <div className="flex justify-between items-start">
          <div>
            <p>
              <strong>White:</strong> {whiteName || 'N/A'}
            </p>
            <p className="text-sm">
              <strong>White ELO:</strong> {whiteElo || 'N/A'}
            </p>
            <p>
              <strong>Black:</strong> {blackName || 'N/A'}
            </p>
            <p className="text-sm">
              <strong>Black ELO:</strong> {blackElo || 'N/A'}
            </p>
            <p>
              <strong>Result:</strong> {result || 'N/A'}
            </p>
            <p className="text-sm">
              <strong>Opening:</strong> {opening || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-2 border-b z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-sm">White</span>
          <span className="text-sm">Black</span>
        </div>
        <div className="relative h-4 bg-darkest-gray rounded-full">
          <div
            className="absolute h-full bg-light-gray transition-[width] duration-500 rounded-full"
            style={{
              width: `${animatedScore}%`,
              left: 0,
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{
              color: score > 0 ? 'var(--darkest-gray)' : 'var(--lightest-gray)',
            }}
          >
            {(score / 100).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-600">Principal Variation 1:</div>
          {pv1.length > 0 && (
            <div className="flex items-center text-xs flex-wrap gap-1">
              <span className="font-bold mr-1 text-darkest-gray">
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
                      className={`px-1 py-0.5 ${moveColors.bg} ${moveColors.text} rounded-sm cursor-help`}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2 mt-2">
          <div className="text-xs font-bold text-gray-600">Principal Variation 2:</div>
          {pv2.length > 0 && (
            <div className="flex items-center text-xs flex-wrap gap-1">
              <span className="font-bold mr-1 text-darkest-gray">
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
                      className={`px-1 py-0.5 ${moveColors.bg} ${moveColors.text} rounded-sm cursor-help`}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameViewer
