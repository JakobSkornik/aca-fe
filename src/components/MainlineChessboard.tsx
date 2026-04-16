import React, { useMemo, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'
import { useSquareFit } from '@/hooks/useSquareFit'

const MIN_BOARD_SIZE = 200
const BOARD_PADDING = 8

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
  const { currentMoveIndex, isLoaded, commentaryBoardOverlay } = state
  const parentRef = useRef<HTMLDivElement>(null)
  const boardSize = useSquareFit(parentRef, { padding: BOARD_PADDING, min: MIN_BOARD_SIZE })

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
          arr = [[r.from as Arrow[0], r.to as Arrow[1], 'var(--orange)']]
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
    <div ref={parentRef} className="flex flex-col w-full items-center px-2 py-2 border-r">
      {isLoaded && (
        <div className="text-center mt-2">
          <p className="text-sm text-gray-600">Captured: {blackCapturesString}</p>
        </div>
      )}
      {boardSize > 0 && (
        <div className="align-center justify-center" style={{ width: boardSize, height: boardSize }}>
          <Chessboard
            position={currentFen || undefined}
            boardWidth={boardSize}
            customDarkSquareStyle={{ backgroundColor: 'var(--dark-gray)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--lightest-gray)' }}
            customNotationStyle={{ color: 'var(--darkest-gray)' }}
            areArrowsAllowed={arrows.length > 0}
            customArrows={arrows}
            customSquareStyles={Object.keys(squareStyles).length > 0 ? squareStyles : undefined}
            arePiecesDraggable={false}
            boardOrientation="white"
            showBoardNotation={true}
            snapToCursor={false}
          />
        </div>
      )}
      {isLoaded && (
        <div className="text-center mt-2 space-y-0.5">
          <p className="text-sm font-medium text-darkest-gray">{lastMoveLine}</p>
          <p className="text-sm text-gray-700">{turnLine}</p>
        </div>
      )}
      {isLoaded && (
        <div className="text-center mb-2 mt-1">
          <p className="text-sm text-gray-600">Captured: {whiteCapturesString}</p>
        </div>
      )}
    </div>
  )
}

export default MainlineChessboard
