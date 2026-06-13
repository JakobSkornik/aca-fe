import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Arrow, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'
import { useSquareFit } from '@/hooks/useSquareFit'
import Icon from '@/components/ui/Icon'

const MIN_BOARD_SIZE = 160
const BOARD_PADDING = 6
const MAX_BOARD_SIZE = 440
/** Rank gutter + eval bar reserve so the square board fits its column. */
const SIDE_GUTTER_PX = 22 + 34

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

/** Player plate (template .plate): avatar initial, name, Elo, to-move badge. */
function PlayerPlate({
  name,
  elo,
  white,
  toMove,
}: {
  name: string
  elo: string
  white: boolean
  toMove: boolean
}) {
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?'
  return (
    <div className={`plate ${white ? 'white' : 'black'}`}>
      <div className="avatar">{initial}</div>
      <div>
        <div className="who">{name || '—'}</div>
        <div className="elo mono">Elo {elo}</div>
      </div>
      {toMove ? <span className="to-move">to move</span> : null}
    </div>
  )
}

/** Vertical eval bar beside the board (template .evalbar). */
function VerticalEvalBar({ height, cp, mate, book }: { height: number; cp: number | null; mate: number | null | undefined; book: boolean }) {
  let whitePct: number
  let label: string
  if (book) {
    whitePct = 50
    label = 'Book'
  } else if (mate != null && mate !== 0) {
    whitePct = mate > 0 ? 97 : 3
    label = `M${Math.abs(mate)}`
  } else {
    const pawns = (cp ?? 0) / 100
    whitePct = Math.max(3, Math.min(97, (1 / (1 + Math.exp(-pawns * 0.42))) * 100))
    label = `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`
  }
  const whiteWinning = (cp ?? 0) >= 0 || (mate ?? 0) > 0
  return (
    <div className="evalbar" style={{ height }}>
      <div className="white-fill" style={{ height: `${whitePct}%` }} />
      <div className={`num ${whiteWinning ? 'bot' : 'top'}`}>{label}</div>
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
  const [playing, setPlaying] = useState(false)
  const moveCount = manager.getMainlineMoveCount()

  // Autoplay: step through the mainline.
  useEffect(() => {
    if (!playing) return
    if (currentMoveIndex >= moveCount - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => manager.moveNext(), 900)
    return () => clearTimeout(t)
  }, [playing, currentMoveIndex, moveCount, manager])

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
        Math.min(MAX_BOARD_SIZE, sizeCap, Math.floor(w - SIDE_GUTTER_PX))
      )
      setRenderSize(next)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sizeCap])

  const currentFen = manager.getCurrentPosition(currentMoveIndex)

  const curMove = manager.getMainlineMove(currentMoveIndex)
  const evalCp = curMove?.score ?? null
  const evalMate = curMove?.mateIn
  const isBook = (curMove as { phase?: string } | null)?.phase === 'early' && curMove?.score === undefined

  const whiteName = pgnHeaders?.whiteName?.trim() || 'White'
  const blackName = pgnHeaders?.blackName?.trim() || 'Black'
  const whiteElo = fmtElo(pgnHeaders?.whiteElo)
  const blackElo = fmtElo(pgnHeaders?.blackElo)

  const sideToMove = currentFen ? (new Chess(currentFen).turn() === 'w' ? 'white' : 'black') : 'white'
  /** Top of the widget is Black's side when White is at bottom; swap when flipped. */
  const topIsBlack = boardOrientation === 'white'
  const topPlate = topIsBlack
    ? { name: blackName, elo: blackElo, white: false, toMove: sideToMove === 'black' }
    : { name: whiteName, elo: whiteElo, white: true, toMove: sideToMove === 'white' }
  const bottomPlate = topIsBlack
    ? { name: whiteName, elo: whiteElo, white: true, toMove: sideToMove === 'white' }
    : { name: blackName, elo: blackElo, white: false, toMove: sideToMove === 'black' }

  const { turnLine, arrows, squareStyles } = useMemo(() => {
    if (!currentFen || !isLoaded) {
      return { turnLine: '', arrows: [] as Arrow[], squareStyles: {} as CustomSquareStyles }
    }
    const pos = new Chess(currentFen)
    const turn = pos.turn() === 'w' ? 'White' : 'Black'
    const turnLine = `${turn} to move`

    const lastMove = manager.getMainlineMove(currentMoveIndex)

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
    return { turnLine, arrows: arr, squareStyles: sq }
  }, [currentFen, currentMoveIndex, isLoaded, manager, commentaryBoardOverlay])

  const navBtn = (label: string, icon: string, onClick: () => void) => (
    <button type="button" className="btn icon-btn" aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} />
    </button>
  )

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div ref={parentRef} className="flex w-full flex-col">
        {isLoaded ? <PlayerPlate {...topPlate} /> : null}
        <div ref={boardLayoutRef} className="board-stage" style={{ justifyContent: 'center' }}>
          {renderSize > 0 ? (
            <>
              <VerticalEvalBar height={renderSize} cp={evalCp} mate={evalMate} book={isBook} />
              <div className="flex flex-col" style={{ width: renderSize + 22 }}>
                <div className="flex">
                  <div className="flex w-[22px] shrink-0 flex-col" style={{ height: renderSize }}>
                    {ranksLeft.map((r) => (
                      <div key={`rk-${r}`} className="flex min-h-0 flex-1 items-center justify-center">
                        <span className={labelClass}>{r}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="shrink-0 overflow-hidden rounded-[12px]"
                    style={{ width: renderSize, height: renderSize, boxShadow: 'var(--shadow-sm)' }}
                  >
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
                <div className="mt-0.5 flex">
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
        {isLoaded ? <PlayerPlate {...bottomPlate} /> : null}
        {isLoaded ? (
          <div className="board-status">
            {curMove?.move ? (
              <>
                Last move <b className="mono">{curMove.move}</b> · {turnLine}
              </>
            ) : (
              <>Starting position · {turnLine}</>
            )}
          </div>
        ) : null}
        {isLoaded ? (
          <div className="navrow">
            {navBtn('First', 'first', () => {
              setPlaying(false)
              manager.goToFirst()
            })}
            {navBtn('Previous', 'prev', () => {
              setPlaying(false)
              manager.movePrev()
            })}
            <button
              type="button"
              className="btn"
              style={{ minWidth: 92, justifyContent: 'center' }}
              onClick={() => setPlaying((p) => !p)}
            >
              <Icon name={playing ? 'pause' : 'play'} size={14} />
              {playing ? 'Pause' : 'Play'}
            </button>
            {navBtn('Next', 'next', () => {
              setPlaying(false)
              manager.moveNext()
            })}
            {navBtn('Last', 'last', () => {
              setPlaying(false)
              manager.goToLast()
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default MainlineChessboard
