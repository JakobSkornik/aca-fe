import React, { useEffect, useState } from 'react'

import Comments from './Comments'
import { UIHelpers } from '@/helpers/uiHelpers'
import { useGameState } from '@/contexts/GameStateContext'


const GameViewer = () => {
  const { state, manager } = useGameState()
  const {
    currentMoveIndex,
    previewMode,
    previewMoves,
    previewMoveIndex,
    pgnHeaders,
  } = state
  const { result, opening, whiteName, whiteElo, blackName, blackElo } = pgnHeaders || {
    result: '',
    opening: '',
    whiteName: '',
    whiteElo: '',
    blackName: '',
    blackElo: '',
  }
  const [animatedScore, setAnimatedScore] = useState(-1)

  // Always derive the mainline move for score display
  const mainlineMove = previewMode
    ? previewMoves.getMoveAtIndex(previewMoveIndex) || null
    : manager.getMainlineMove(currentMoveIndex)
  const score = mainlineMove?.score ?? 0

  // Get PV1 (best variation) for reference and comment generation
  const getCurrentPv1 = () => {
    if (previewMode) {
      const pv1Moves = previewMoves.getPv1(previewMoveIndex + 1)
      return pv1Moves.length > 0 ? pv1Moves : []
    } else {
      const pv1Moves = manager.getPv1(currentMoveIndex + 1)
      return pv1Moves.length > 0 ? pv1Moves : []
    }
  }

  // Get PV2 (second-best variation) for reference and comment generation
  const getCurrentPv2 = () => {
    if (previewMode) {
      const pv2Moves = previewMoves.getPv2(previewMoveIndex + 1)
      return pv2Moves.length > 0 ? pv2Moves : []
    } else {
      const pv2Moves = manager.getPv2(currentMoveIndex + 1)
      return pv2Moves.length > 0 ? pv2Moves : []
    }
  }

  // Prevent horizontal scrolling on left/right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handlePv1Click = (pv1MoveIdx: number) => {
    // Clicking on PV1 loads it to preview row up to the clicked move index
    const pv1Moves = manager.getPv1(currentMoveIndex + 1)
    if (pv1Moves && pv1Moves.length > pv1MoveIdx) {
      const pvSequence = pv1Moves.slice(0, pv1MoveIdx + 1)
      if (!previewMode) {
        manager.moveNext()
        manager.enterPreviewModeWithPvSequence(pvSequence)
      } else {
        manager.addPvSequenceToPreview(pvSequence, currentMoveIndex)
      }
    }
  }

  const handlePv2Click = (pv2MoveIdx: number) => {
    // Clicking on PV2 loads it to preview row up to the clicked move index
    const pv2Moves = manager.getPv2(currentMoveIndex + 1)
    if (pv2Moves && pv2Moves.length > pv2MoveIdx) {
      const pvSequence = pv2Moves.slice(0, pv2MoveIdx + 1)
      if (!previewMode) {
        manager.moveNext()
        manager.enterPreviewModeWithPvSequence(pvSequence)
      } else {
        manager.addPvSequenceToPreview(pvSequence, currentMoveIndex)
      }
    }
  }

  const pv1 = getCurrentPv1()
  const pv2 = getCurrentPv2()

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
    <div className="relative flex flex-col w-full h-screen rounded-md">
      {/* Top Section: Game Information */}
      <div className="p-4 border-b z-10 sticky top-0">
        <div className="flex justify-between items-start">
          {!previewMode && (
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
          )}
          {previewMode && (
            <div>
              <p>
                <strong>Previewing:</strong> {mainlineMove?.move || 'N/A'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Close session button moved to MoveList */}
          </div>
        </div>
      </div>

      {/* Score Visualization */}
      <div className="p-4 border-b z-10 sticky">
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

      {/* Principal Variations */}
      <div className="h-[120px] overflow-y-auto">
        {/* PV1 (Second-best variation) for reference */}
        <div className="p-2 space-y-1">
          <div className="text-xs font-bold text-gray-600 mb-1">Principal Variation 1:</div>
          {pv1.length > 0 && (
            <div className="flex items-center text-xs">
              <span className="font-bold mr-2 text-darkest-gray">
                {(() => {
                  const firstPv1Move = pv1[0]
                  return firstPv1Move && firstPv1Move.score !== undefined
                    ? (firstPv1Move.score / 100).toFixed(2)
                    : ''
                })()}
              </span>
              <div className="flex space-x-1">
                {pv1.map((move, moveIdx) => {
                  const isWhiteMove = (currentMoveIndex + moveIdx) % 2 === 1;
                  const moveColors = UIHelpers.getPvMoveColors(false, isWhiteMove);
                  return (
                    <span
                      key={moveIdx}
                      className={`p-1 ${moveColors.bg} ${moveColors.text} rounded-sm cursor-pointer hover:bg-gray-300`}
                      onClick={() => handlePv1Click(moveIdx)}
                    >
                      {move.move}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* PV2 (Second-best variation) for reference */}
        <div className="p-2 space-y-1">
          <div className="text-xs font-bold text-gray-600 mb-1">Principal Variation 2:</div>
          {pv2.length > 0 && (
            <div className="flex items-center text-xs">
              <span className="font-bold mr-2 text-darkest-gray">
                {(() => {
                  const firstPv2Move = pv2[0]
                  return firstPv2Move && firstPv2Move.score !== undefined
                    ? (firstPv2Move.score / 100).toFixed(2)
                    : ''
                })()}
              </span>
              <div className="flex space-x-1">
                {pv2.map((move, moveIdx) => {
                  const isWhiteMove = (currentMoveIndex + moveIdx) % 2 === 1;
                  const moveColors = UIHelpers.getPvMoveColors(false, isWhiteMove);
                  return (
                    <span
                      key={moveIdx}
                      className={`p-1 ${moveColors.bg} ${moveColors.text} rounded-sm cursor-pointer hover:bg-gray-300`}
                      onClick={() => handlePv2Click(moveIdx)}
                    >
                      {move.move}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Comments Section */}
      <div className="p-4 border-t z-10">
        <Comments />
      </div>
    </div>
  )
}

export default GameViewer
