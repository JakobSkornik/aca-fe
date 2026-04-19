import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'
import { useSquareFit } from '@/hooks/useSquareFit'

const MIN_BOARD_SIZE = 160
const BOARD_PADDING = 6
const MAX_BOARD_SIZE = 340
/** Width for rank labels beside the board; board width is clamped so rank + board fits the row. */
const RANK_GUTTER_PX = 22

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

const labelClass =
  'select-none text-center text-[11px] font-semibold tabular-nums leading-none text-text-primary'

/** react-chessboard keys arrows by `${from}-${to}`; duplicate endpoints cause duplicate React keys. */
function dedupeArrowsByEndpoints(arrows: Arrow[]): Arrow[] {
  const m = new Map<string, Arrow>()
  for (const a of arrows) {
    m.set(`${a[0]}-${a[1]}`, a)
  }
  return [...m.values()]
}

function fmtElo(n: number | undefined | null): string {
  if (n == null || n <= 0) return '—'
  return String(n)
}

type PlayerBarProps = {
  name: string
  elo: string
  /** Light square swatch (White) vs dark (Black) */
  lightSwatch: boolean
  captures: string
}

function PlayerBarRow({ name, elo, lightSwatch, captures }: PlayerBarProps) {
  return (
    <div className="flex w-full max-w-[340px] items-center justify-between gap-2 rounded-md border border-border-tertiary bg-background-primary px-2 py-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className={`h-2.5 w-2.5 shrink-0 rounded-sm border border-border-secondary ${
            lightSwatch ? 'bg-board-light' : 'bg-board-dark'
          }`}
        />
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium text-text-primary">{name || '—'}</div>
          <div className="text-[10px] text-text-tertiary">Elo {elo}</div>
        </div>
      </div>
      <div
        className="max-w-[42%] shrink-0 truncate text-right text-[10px] text-text-tertiary"
        title={captures || undefined}
      >
        {captures || '—'}
      </div>
    </div>
  )
}

const MainlineChessboard = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, isLoaded, commentaryBoardOverlay, boardOrientation, pgnHeaders } = state
  const parentRef = useRef<HTMLDivElement>(null)
  const boardLayoutRef = useRef<HTMLDivElement>(null)
  const sizeCap = useSquareFit(parentRef, {
    padding: BOARD_PADDING,
    min: MIN_BOARD_SIZE,
    max: MAX_BOARD_SIZE,
  })
  const [renderSize, setRenderSize] = useState(0)

  const filesEdge = useMemo(
    () => (boardOrientation === 'white' ? [...FILES] : [...FILES].reverse()),
    [boardOrientation]
  )
  const ranksLeft = useMemo(
    () => (boardOrientation === 'white' ? [...RANKS] : [...RANKS].reverse()),
    [boardOrientation]
  )

  useEffect(() => {
    const el = boardLayoutRef.current
    if (!el || sizeCap <= 0) return
    const update = () => {
      const w = el.getBoundingClientRect().width
      const next = Math.max(
        MIN_BOARD_SIZE,
        Math.min(MAX_BOARD_SIZE, sizeCap, Math.floor(w - RANK_GUTTER_PX))
      )
      setRenderSize(next)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sizeCap])

  const currentFen = manager.getCurrentPosition(currentMoveIndex)
  const { capturedByWhite: whiteCaptures, capturedByBlack: blackCaptures } = manager.getCapturesForMove(currentMoveIndex)

  const whiteCapturesString = manager.formatCapturesForDisplay(whiteCaptures, true)
  const blackCapturesString = manager.formatCapturesForDisplay(blackCaptures, false)

  const whiteName = pgnHeaders?.whiteName?.trim() || 'White'
  const blackName = pgnHeaders?.blackName?.trim() || 'Black'
  const whiteElo = fmtElo(pgnHeaders?.whiteElo)
  const blackElo = fmtElo(pgnHeaders?.blackElo)

  /** Top of the widget is Black's side when White is at bottom; swap when flipped. */
  const topIsBlack = boardOrientation === 'white'

  /** Pieces the top player lost (opponent's captures); matches wireframe capture bars. */
  const topCaptures = topIsBlack ? whiteCapturesString : blackCapturesString
  const bottomCaptures = topIsBlack ? blackCapturesString : whiteCapturesString

  const topBar = topIsBlack
    ? { name: blackName, elo: blackElo, lightSwatch: false, captures: topCaptures }
    : { name: whiteName, elo: whiteElo, lightSwatch: true, captures: topCaptures }

  const bottomBar = topIsBlack
    ? { name: whiteName, elo: whiteElo, lightSwatch: true, captures: bottomCaptures }
    : { name: blackName, elo: blackElo, lightSwatch: false, captures: bottomCaptures }

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
      {isLoaded ? (
        <div className="mb-1 w-full max-w-[340px]">
          <PlayerBarRow {...topBar} />
        </div>
      ) : null}
      <div ref={boardLayoutRef} className="flex w-full max-w-[340px] flex-col items-center">
        {renderSize > 0 ? (
          <>
            <div className="mb-0.5 flex w-full shrink-0 justify-center">
              <div className="flex items-end">
                <div className="w-[22px] shrink-0" aria-hidden />
                <div className="flex shrink-0" style={{ width: renderSize }}>
                  {filesEdge.map((f) => (
                    <span key={`t-${f}`} className={`flex-1 ${labelClass}`}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-stretch justify-center">
              <div className="flex w-[22px] shrink-0 flex-col" style={{ height: renderSize }}>
                {ranksLeft.map((r) => (
                  <div key={`rk-${r}`} className="flex min-h-0 flex-1 items-center justify-center">
                    <span className={labelClass}>{r}</span>
                  </div>
                ))}
              </div>
              <div className="shrink-0 overflow-hidden rounded-sm" style={{ width: renderSize, height: renderSize }}>
                <Chessboard
                  position={currentFen || undefined}
                  boardWidth={renderSize}
                  customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
                  customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
                  areArrowsAllowed={arrows.length > 0}
                  customArrows={arrows}
                  customSquareStyles={Object.keys(squareStyles).length > 0 ? squareStyles : undefined}
                  arePiecesDraggable={false}
                  boardOrientation={boardOrientation}
                  showBoardNotation={false}
                  snapToCursor={false}
                />
              </div>
            </div>
            <div className="mt-0.5 flex w-full shrink-0 justify-center">
              <div className="flex items-start">
                <div className="w-[22px] shrink-0" aria-hidden />
                <div className="flex shrink-0" style={{ width: renderSize }}>
                  {filesEdge.map((f) => (
                    <span key={`b-${f}`} className={`flex-1 ${labelClass}`}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      {isLoaded ? (
        <div className="mt-1 w-full max-w-[340px]">
          <PlayerBarRow {...bottomBar} />
        </div>
      ) : null}
      {isLoaded && (
        <div className="mt-1 space-y-0.5 text-center">
          <p className="text-[11px] font-medium text-text-primary">{lastMoveLine}</p>
          <p className="text-[10px] text-text-secondary">{turnLine}</p>
        </div>
      )}
    </div>
  )
}

export default MainlineChessboard
