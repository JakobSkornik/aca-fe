import React, { useMemo, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'
import { useSquareFit } from '@/hooks/useSquareFit'

const MIN_BOARD_SIZE = 160
const BOARD_PADDING = 6
const MAX_BOARD_SIZE = 340

/** react-chessboard keys arrows by `${from}-${to}`; duplicate endpoints cause duplicate React keys. */
function dedupeArrowsByEndpoints(arrows: Arrow[]): Arrow[] {
  const m = new Map<string, Arrow>()
  for (const a of arrows) {
    m.set(`${a[0]}-${a[1]}`, a)
  }
  return [...m.values()]
}

const MainlineChessboard = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, isLoaded, commentaryBoardOverlay, boardOrientation } = state
  const parentRef = useRef<HTMLDivElement>(null)
  const boardSize = useSquareFit(parentRef, {
    padding: BOARD_PADDING,
    min: MIN_BOARD_SIZE,
    max: MAX_BOARD_SIZE,
  })

  const currentFen = manager.getCurrentPosition(currentMoveIndex)
  const { capturedByWhite: whiteCaptures, capturedByBlack: blackCaptures } = manager.getCapturesForMove(currentMoveIndex)

  const whiteCapturesString = manager.formatCapturesForDisplay(whiteCaptures, true)
  const blackCapturesString = manager.formatCapturesForDisplay(blackCaptures, false)

  const { lastMoveLine, turnLine, arrows, squareStyles } = useMemo(() => {
    if (!currentFen || !isLoaded) {
      return { lastMoveLine: '', turnLine: '', arrows: [] as Arrow[], squareStyles: {} as CustomSquareStyles }
    }
    const pos = new Chess(currentFen)
    const turn = pos.turn() === 'w' ? 'White' : 'Black'
    const turnLine = `${turn} to move`

    const lastMove = manager.getMainlineMove(currentMoveIndex)
    const lastMoveLine = lastMove?.move ? `Last: ${lastMove.move}` : 'Last: —'

    let arr: Arrow[] = []
    if (lastMove?.move) {
      const fenBefore =
        currentMoveIndex <= 0
          ? new Chess().fen()
          : manager.getPositionForIndex(currentMoveIndex - 1)
      if (fenBefore) {
        const b = new Chess(fenBefore)
        const r = b.move(lastMove.move)
        if (r) {
          arr = [[r.from as Arrow[0], r.to as Arrow[1], 'var(--accent-engine)']]
        }
      }
    }
    const overlay = commentaryBoardOverlay
    if (overlay?.arrows?.length) {
      arr = [...arr, ...overlay.arrows]
    }
    arr = dedupeArrowsByEndpoints(arr)
    const sq: CustomSquareStyles = overlay?.squareStyles ? { ...overlay.squareStyles } : {}
    return { lastMoveLine, turnLine, arrows: arr, squareStyles: sq }
  }, [currentFen, currentMoveIndex, isLoaded, manager, commentaryBoardOverlay])

  return (
    <div ref={parentRef} className="flex w-full flex-col items-center px-2 py-2">
      {isLoaded && (
        <div className="mt-1 text-center">
          <p className="text-[10px] text-text-tertiary">
            <span className="font-medium text-text-secondary">Black captured:</span> {blackCapturesString}
          </p>
        </div>
      )}
      {boardSize > 0 && (
        <div className="align-center justify-center" style={{ width: boardSize, height: boardSize }}>
          <Chessboard
            position={currentFen || undefined}
            boardWidth={boardSize}
            customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
            customNotationStyle={{ color: 'var(--color-text-secondary)' }}
            areArrowsAllowed={arrows.length > 0}
            customArrows={arrows}
            customSquareStyles={Object.keys(squareStyles).length > 0 ? squareStyles : undefined}
            arePiecesDraggable={false}
            boardOrientation={boardOrientation}
            showBoardNotation={true}
            snapToCursor={false}
          />
        </div>
      )}
      {isLoaded && (
        <div className="mt-1 space-y-0.5 text-center">
          <p className="text-[11px] font-medium text-text-primary">{lastMoveLine}</p>
          <p className="text-[10px] text-text-secondary">{turnLine}</p>
        </div>
      )}
      {isLoaded && (
        <div className="mb-1 mt-0.5 text-center">
          <p className="text-[10px] text-text-tertiary">
            <span className="font-medium text-text-secondary">White captured:</span> {whiteCapturesString}
          </p>
        </div>
      )}
    </div>
  )
}

export default MainlineChessboard
