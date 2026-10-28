import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type {
  Arrow,
  CustomSquareStyles,
  Square,
} from 'react-chessboard/dist/chessboard/types'
import { useGameState } from '../contexts/GameStateContext'
import { useSquareFit } from '@/hooks/useSquareFit'
import Icon from '@/components/ui/Icon'

const MIN_BOARD_SIZE = 160
const BOARD_PADDING = 6
const MAX_BOARD_SIZE = 560
/** Rank gutter + eval bar reserve so the square board fits its column. */
const SIDE_GUTTER_PX = 22 + 26 + 12

const PLAYED_ARROW = 'var(--accent)'
const ALTERNATIVE_ARROW = 'var(--fg-3)'

/** Key for the board arrows: green = played move, gray = engine alternative. */
function ArrowLegend({ played, alternative }: { played: boolean; alternative: 'better' | 'runner_up' | null }) {
  if (!played && !alternative) return null
  const item = (color: string, label: string) => (
    <span className="arrow-legend-item">
      <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden>
        <path d="M1 5h14" style={{ stroke: color }} strokeWidth="3" strokeLinecap="round" />
        <path d="M14 1l7 4-7 4z" style={{ fill: color }} />
      </svg>
      {label}
    </span>
  )
  return (
    <div className="arrow-legend" aria-label="Board arrows">
      {played ? item(PLAYED_ARROW, 'played move') : null}
      {alternative ? item(ALTERNATIVE_ARROW, alternative === 'better' ? "engine's better move" : "engine's runner-up") : null}
    </div>
  )
}

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
function VerticalEvalBar({
  height,
  cp,
  mate,
  book,
}: {
  height: number
  cp: number | null
  mate: number | null | undefined
  book: boolean
}) {
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
    whitePct = Math.max(
      3,
      Math.min(97, (1 / (1 + Math.exp(-pawns * 0.42))) * 100),
    )
    label = `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`
  }
  return (
    <div className="flex flex-col items-center self-start">
      <div className="evalbar" style={{ height }}>
        <div className="white-fill" style={{ height: `${whitePct}%` }} />
      </div>
      {/* Score below the bar, in the theme's foreground colour (inverts per theme). */}
      <div
        className="mono mt-1 text-[11px] font-bold tabular-nums"
        style={{ color: 'var(--fg)' }}
      >
        {label}
      </div>
    </div>
  )
}

/** `maxSize` caps the board (the survey keeps it small); `compact` trims padding, hides the
 * player plates and puts the flip button in the move controls. */
const MainlineChessboard = ({ maxSize = MAX_BOARD_SIZE, compact = false }: { maxSize?: number; compact?: boolean } = {}) => {
  const { state, manager } = useGameState()
  const {
    currentMoveIndex,
    isLoaded,
    commentaryBoardOverlay,
    boardOrientation,
    pgnHeaders,
    focusedBoard,
  } = state
  const parentRef = useRef<HTMLDivElement>(null)
  const boardLayoutRef = useRef<HTMLDivElement>(null)
  const sizeCap = useSquareFit(parentRef, {
    padding: BOARD_PADDING,
    min: MIN_BOARD_SIZE,
    max: MAX_BOARD_SIZE,
    mode: 'width',
  })
  const [renderSize, setRenderSize] = useState(0)
  const [playing, setPlaying] = useState(false)
  // Hovering a PV/line reference in the comment dims this board to draw the
  // eye to the variation viewer (same event the PV card listens to).
  const [pvHover, setPvHover] = useState(false)
  const moveCount = manager.getMainlineMoveCount()

  useEffect(() => {
    const onHi = (e: Event) => setPvHover(!!(e as CustomEvent).detail?.on)
    window.addEventListener('aca:variation-highlight', onHi)
    return () => window.removeEventListener('aca:variation-highlight', onHi)
  }, [])

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
    [boardOrientation],
  )
  const ranksLeft = useMemo(
    () => (boardOrientation === 'white' ? [...RANKS] : [...RANKS].reverse()),
    [boardOrientation],
  )

  useEffect(() => {
    const el = boardLayoutRef.current
    if (!el || sizeCap <= 0) return
    const update = () => {
      const w = el.getBoundingClientRect().width
      // Keep the prose below the board visible on shorter desktop screens.
      // Stacked layouts scroll naturally and can use the full column width.
      const heightCap = window.innerWidth > 1150
        ? Math.max(280, window.innerHeight - 430) : MAX_BOARD_SIZE
      const next = Math.max(
        MIN_BOARD_SIZE,
        Math.min(maxSize, heightCap, sizeCap, Math.floor(w - SIDE_GUTTER_PX)),
      )
      setRenderSize(next)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [sizeCap, maxSize])

  const currentFen = manager.getCurrentPosition(currentMoveIndex)

  const curMove = manager.getMainlineMove(currentMoveIndex)
  const evalCp = curMove?.score ?? null
  const evalMate = curMove?.mateIn
  const isBook =
    (curMove as { phase?: string } | null)?.phase === 'early' &&
    curMove?.score === undefined

  const whiteName = pgnHeaders?.whiteName?.trim() || 'White'
  const blackName = pgnHeaders?.blackName?.trim() || 'Black'
  const whiteElo = fmtElo(pgnHeaders?.whiteElo)
  const blackElo = fmtElo(pgnHeaders?.blackElo)

  const sideToMove = currentFen
    ? new Chess(currentFen).turn() === 'w'
      ? 'white'
      : 'black'
    : 'white'
  /** Top of the widget is Black's side when White is at bottom; swap when flipped. */
  const topIsBlack = boardOrientation === 'white'
  const topPlate = topIsBlack
    ? {
        name: blackName,
        elo: blackElo,
        white: false,
        toMove: sideToMove === 'black',
      }
    : {
        name: whiteName,
        elo: whiteElo,
        white: true,
        toMove: sideToMove === 'white',
      }
  const bottomPlate = topIsBlack
    ? {
        name: whiteName,
        elo: whiteElo,
        white: true,
        toMove: sideToMove === 'white',
      }
    : {
        name: blackName,
        elo: blackElo,
        white: false,
        toMove: sideToMove === 'black',
      }

  const { turnLine, arrows, squareStyles, legend } = useMemo(() => {
    if (!currentFen || !isLoaded) {
      return {
        turnLine: '',
        arrows: [] as Arrow[],
        squareStyles: {} as CustomSquareStyles,
        legend: { played: false, alternative: null as 'better' | 'runner_up' | null },
      }
    }
    const pos = new Chess(currentFen)
    const turn = pos.turn() === 'w' ? 'White' : 'Black'
    const turnLine = `${turn} to move`

    const lastMove = manager.getMainlineMove(currentMoveIndex)

    // The played move is a green arrow (no square tint), so it reads the same way
    // as the alternative's arrow; the legend below the board names both.
    let played: Arrow | null = null
    if (lastMove?.move) {
      const fenBefore =
        currentMoveIndex <= 0
          ? manager.getPositionForIndex(-1)
          : manager.getPositionForIndex(currentMoveIndex - 1)
      if (fenBefore) {
        const r = new Chess(fenBefore).move(lastMove.move)
        if (r) played = [r.from as Square, r.to as Square, PLAYED_ARROW]
      }
    }
    const overlay = commentaryBoardOverlay
    const arr: Arrow[] = dedupeArrowsByEndpoints(
      overlay?.arrows?.length ? [...overlay.arrows] : [],
    )
    // Engine alternative (gray) and played move (green). Only when no
    // commentary hover overlay is active; the played arrow is drawn last (on top).
    let alternative: 'better' | 'runner_up' | null = null
    if (!overlay?.arrows?.length) {
      const alt =
        state.gameJson?.moves?.[currentMoveIndex]?.comment_facts
          ?.better_alternative
      if (alt?.uci && alt.uci.length >= 4) {
        arr.push([
          alt.uci.slice(0, 2) as Square,
          alt.uci.slice(2, 4) as Square,
          ALTERNATIVE_ARROW,
        ])
        alternative = alt.is_inferior ? 'runner_up' : 'better'
      }
      if (played) arr.push(played)
    }
    const sq: CustomSquareStyles = { ...(overlay?.squareStyles ?? {}) }
    const legend = { played: !!played && !overlay?.arrows?.length, alternative }
    return { turnLine, arrows: dedupeArrowsByEndpoints(arr), squareStyles: sq, legend }
  }, [
    currentFen,
    currentMoveIndex,
    isLoaded,
    manager,
    commentaryBoardOverlay,
    state.gameJson,
  ])

  const navBtn = (label: string, icon: string, onClick: () => void) => (
    <button
      type="button"
      className="btn icon-btn"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  )

  return (
    <div
      className="panel"
      style={{
        padding: compact ? 6 : 10,
        // Focus cue: the board arrow keys don't drive is dimmed; a PV/line
        // hover also dims it to spotlight the variation viewer.
        opacity: focusedBoard === 'game' && !pvHover ? 1 : 0.6,
        transition: 'opacity 0.15s ease',
      }}
      onMouseDown={() => manager.setFocusedBoard('game')}
      title="Arrow keys move this board (click to focus)"
    >
      <div ref={parentRef} className="flex w-full flex-col">
        {isLoaded && !compact ? <PlayerPlate {...topPlate} /> : null}
        <div
          ref={boardLayoutRef}
          className="board-stage"
        >
          {renderSize > 0 ? (
            <>
              <VerticalEvalBar
                height={renderSize}
                cp={evalCp}
                mate={evalMate}
                book={isBook}
              />
              <div className="mx-auto flex flex-col" style={{ width: renderSize + 22 }}>
                <div className="flex">
                  <div
                    className="flex w-[22px] shrink-0 flex-col"
                    style={{ height: renderSize }}
                  >
                    {ranksLeft.map((r) => (
                      <div
                        key={`rk-${r}`}
                        className="flex min-h-0 flex-1 items-center justify-center"
                      >
                        <span className={labelClass}>{r}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="shrink-0 overflow-hidden rounded-[12px]"
                    style={{
                      width: renderSize,
                      height: renderSize,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <Chessboard
                      position={currentFen || undefined}
                      boardWidth={renderSize}
                      customDarkSquareStyle={{
                        backgroundColor: 'var(--board-dark)',
                      }}
                      customLightSquareStyle={{
                        backgroundColor: 'var(--board-light)',
                      }}
                      areArrowsAllowed={arrows.length > 0}
                      customArrows={arrows}
                      customSquareStyles={
                        Object.keys(squareStyles).length > 0
                          ? squareStyles
                          : undefined
                      }
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
        {isLoaded && !compact ? <PlayerPlate {...bottomPlate} /> : null}
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
        {isLoaded ? <ArrowLegend {...legend} /> : null}
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
            {compact ? navBtn('Flip board', 'flip', () => manager.flipBoard()) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default MainlineChessboard
