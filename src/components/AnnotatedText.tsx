import React, { Fragment, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import type { Square, CustomSquareStyles } from 'react-chessboard/dist/chessboard/types'
import PvHoverBoard from './PvHoverBoard'
import type { ResolvedAnnotationToken } from '@/types/WebSocketMessages'
import { parseAnnotatedText, type AnnotationSegment } from '@/helpers/annotationTokens'
import { useGameState } from '@/contexts/GameStateContext'
import type { PvLineEntry } from './InlinePvMoves'

type Props = {
  text: string
  resolvedTokens?: ResolvedAnnotationToken[] | null
  className?: string
}

const GREEN_ARROW = 'rgba(34, 197, 94, 0.95)'
const SQUARE_TINT = 'rgba(59, 130, 246, 0.4)'
const FILE_TINT = 'rgba(250, 204, 21, 0.35)'

function fileSquares(file: string): Square[] {
  const f = file.toLowerCase()
  if (!/^[a-h]$/.test(f)) return []
  return ['8', '7', '6', '5', '4', '3', '2', '1'].map((r) => `${f}${r}` as Square)
}

function pvLineToPvEntries(
  line: unknown
): PvLineEntry[] | null {
  if (!Array.isArray(line)) return null
  const out: PvLineEntry[] = []
  for (const step of line) {
    if (
      typeof step === 'object' &&
      step !== null &&
      typeof (step as { san?: string }).san === 'string' &&
      typeof (step as { fen?: string }).fen === 'string'
    ) {
      out.push({ san: (step as { san: string }).san, fen: (step as { fen: string }).fen })
    }
  }
  return out.length ? out : null
}

const TokenPv: React.FC<{ data: Record<string, unknown> | null }> = ({ data }) => {
  const lineRaw = data?.line
  const pv = pvLineToPvEntries(lineRaw)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  if (!pv?.length) {
    return <span className="text-orange-700/80 text-sm">[pv]</span>
  }

  const active = hoverIdx !== null ? pv[hoverIdx] : null

  return (
    <span className="inline-flex flex-wrap gap-1 items-center align-middle mx-0.5">
      {pv.map((step, i) => (
        <span
          key={`pv-${i}-${step.fen}`}
          className="cursor-help px-1.5 py-0.5 rounded bg-orange-500/15 text-darkest-gray font-medium text-sm border border-orange-500/30"
          onMouseEnter={(e) => {
            setHoverIdx(i)
            setAnchorEl(e.currentTarget)
          }}
          onMouseLeave={() => {
            setHoverIdx(null)
            setAnchorEl(null)
          }}
        >
          {step.san}
        </span>
      ))}
      {active && <PvHoverBoard fen={active.fen} visible={hoverIdx !== null} anchorEl={anchorEl} />}
    </span>
  )
}

const AnnotatedText: React.FC<Props> = ({ text, resolvedTokens, className = '' }) => {
  const { state, manager } = useGameState()
  const { currentMoveIndex } = state
  const currentFen = manager.getCurrentPosition(currentMoveIndex)
  const segments = useMemo(
    () => parseAnnotatedText(text, resolvedTokens ?? undefined),
    [text, resolvedTokens]
  )

  const applyMoveHover = (data: Record<string, unknown> | null, san: string) => {
    let from = data?.from as string | undefined
    let to = data?.to as string | undefined

    if ((!from || !to) && san && currentFen) {
      try {
        const fenBefore =
          currentMoveIndex <= 0
            ? new Chess().fen()
            : manager.getPositionForIndex(currentMoveIndex - 1)
        const b = new Chess(fenBefore || currentFen)
        const r = b.move(san)
        if (r) {
          from = r.from
          to = r.to
        }
      } catch { /* invalid SAN — skip */ }
    }

    if (from && to) {
      manager.setCommentaryBoardOverlay({
        arrows: [[from as Square, to as Square, GREEN_ARROW]],
        squareStyles: {},
      })
    }
  }

  const applySquareHover = (square: string) => {
    const sq = square.toLowerCase() as Square
    const styles: CustomSquareStyles = { [sq]: { backgroundColor: SQUARE_TINT } }
    manager.setCommentaryBoardOverlay({ arrows: [], squareStyles: styles })
  }

  const applyFileHover = (file: string) => {
    const o: CustomSquareStyles = {}
    for (const sq of fileSquares(file)) {
      o[sq] = { backgroundColor: FILE_TINT }
    }
    manager.setCommentaryBoardOverlay({ arrows: [], squareStyles: o })
  }

  const leave = () => {
    manager.clearCommentaryBoardOverlay()
  }

  const renderSegment = (seg: AnnotationSegment, i: number) => {
    if (seg.kind === 'text') {
      return (
        <span key={`t-${i}`} className="whitespace-pre-wrap">
          {seg.text}
        </span>
      )
    }

    const { tokenType, content, data } = seg

    switch (tokenType) {
      case 'pv':
        return <TokenPv key={`pv-${i}`} data={data} />
      case 'move':
        return (
          <span
            key={`mv-${i}`}
            className="cursor-help px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/40 text-darkest-gray font-medium text-sm mx-0.5 align-middle"
            onMouseEnter={() => applyMoveHover(data, content)}
            onMouseLeave={leave}
          >
            {content}
          </span>
        )
      case 'square':
        return (
          <span
            key={`sq-${i}`}
            className="cursor-help px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/35 text-sm font-medium mx-0.5 align-middle"
            onMouseEnter={() => {
              const sq = (data?.square as string) || content
              if (sq) applySquareHover(sq)
            }}
            onMouseLeave={leave}
          >
            {content}
          </span>
        )
      case 'file':
        return (
          <span
            key={`fl-${i}`}
            className="cursor-help px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-sm font-medium mx-0.5 align-middle"
            onMouseEnter={() => {
              const f = (data?.file as string) || content
              if (f) applyFileHover(f)
            }}
            onMouseLeave={leave}
          >
            {content}
          </span>
        )
      case 'piece':
        return (
          <span
            key={`pc-${i}`}
            className="cursor-help px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/35 text-sm font-medium mx-0.5 align-middle"
            onMouseEnter={() => {
              const sq = data?.square as string | undefined
              if (sq) applySquareHover(sq)
            }}
            onMouseLeave={leave}
          >
            {content}
          </span>
        )
      case 'eval': {
        const pawns = typeof data?.pawns === 'number' ? data.pawns : parseFloat(content.replace(',', '.'))
        const tint =
          (typeof pawns === 'number' && !Number.isNaN(pawns) && pawns > 0.05) ? 'bg-emerald-500/20 border-emerald-600/40' :
          (typeof pawns === 'number' && !Number.isNaN(pawns) && pawns < -0.05) ? 'bg-rose-500/20 border-rose-600/40' :
          'bg-gray-400/20 border-gray-500/40'
        return (
          <span
            key={`ev-${i}`}
            className={`px-1.5 py-0.5 rounded border text-sm font-semibold mx-0.5 align-middle ${tint}`}
          >
            {content}
          </span>
        )
      }
      default:
        return (
          <span key={`unk-${i}`} className="text-amber-800/90 text-sm font-mono mx-0.5">
            {seg.raw}
          </span>
        )
    }
  }

  return (
    <div className={`leading-relaxed ${className}`}>
      {segments.map((seg, i) => (
        <Fragment key={`seg-${i}`}>{renderSegment(seg, i)}</Fragment>
      ))}
    </div>
  )
}

export default AnnotatedText
