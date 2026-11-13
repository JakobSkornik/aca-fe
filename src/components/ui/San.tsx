import React, { Fragment, type ReactNode } from 'react'
import type { CommentLink } from '@/types/GameJson'

/** Side that makes a move: decides the colour of its piece figurine. */
export type Side = 'w' | 'b'

const NAMES: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' }

/** One piece drawn instead of its letter. The letter stays as the alternative text, so
 * copied text and screen readers still get plain algebraic notation. */
export const Figurine: React.FC<{ piece: string; side: Side }> = ({ piece, side }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img className={`figurine figurine-${side}`} src={`/icons/pieces/${side}${piece.toLowerCase()}.svg`}
    alt={piece} title={`${side === 'w' ? 'White' : 'Black'} ${NAMES[piece]}`} draggable={false} />
)

const SAN = /^([KQRBN])?(.*?)(?:=([QRBN]))?([+#]?)$/

/** A move in figurine notation: `Rhd8` shows a rook and `hd8`. Pawn moves and castling have
 * no figurine; a promotion shows the new piece. */
export const San: React.FC<{ san: string; side: Side }> = ({ san, side }) => {
  const m = SAN.exec(san)
  if (!m || san.startsWith('O-O')) return <>{san}</>
  const [, piece, rest, promoted, check] = m
  return <>
    {piece ? <Figurine piece={piece} side={side} /> : null}
    {rest}
    {promoted ? <>=<Figurine piece={promoted} side={side} /></> : null}
    {check}
  </>
}

const MOVE = 'O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][18]=[QRBN]'
const LABEL = new RegExp(`^(\\d+)\\s?(\\.{3}|…|\\.)\\s?((?:${MOVE}|[a-h][1-8])[+#]?)$`)
const BARE = new RegExp(`^(?:${MOVE}|[a-h][1-8])[+#]?$`)

/** A move as variation lines print it: `24...Rhd8`, `25.Bxh7`, or a bare move whose side
 * the caller knows (`side`). Anything else (such as "Start") is printed unchanged. */
export const MoveLabel: React.FC<{ label: string; side?: Side }> = ({ label, side }) => {
  const m = LABEL.exec(label)
  if (m) {
    const black = m[2] !== '.'
    return <>{m[1]}{black ? '…' : '.'}<San san={m[3]} side={black ? 'b' : 'w'} /></>
  }
  return side && BARE.test(label) ? <San san={label} side={side} /> : <>{label}</>
}

/** A heading that ends in a move ("Better was Rad8"): the move gets its figurine when the
 * side that makes it is known. */
export const TitleWithMove: React.FC<{ title: string; side?: Side }> = ({ title, side }) => {
  const cut = title.lastIndexOf(' ')
  const move = title.slice(cut + 1)
  if (!side || !BARE.test(move)) return <>{title}</>
  return <>{title.slice(0, cut + 1)}<San san={move} side={side} /></>
}

// A move named in running text. A numbered move may be a plain pawn move ("30...d5"); without
// a number a square name is not taken for a move.
const IN_TEXT = new RegExp(
  `(^|[^A-Za-z0-9])(?:(\\d+)\\s?(\\.{3}|…|\\.)\\s?((?:${MOVE}|[a-h][1-8])[+#]?)|((?:${MOVE})[+#]?))(?![A-Za-z0-9])`, 'g')

/** Running text with every move it names in bold. A numbered move also gets its figurine,
 * in the colour its number gives it (`24.` White, `24...` Black). */
export function renderMoves(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(IN_TEXT)) {
    const start = (m.index ?? 0) + m[1].length
    if (start > last) out.push(text.slice(last, start))
    const numbered = m[2] !== undefined
    const black = m[3] !== '.'
    out.push(<strong className="move-name" key={start}>
      {numbered ? <>{m[2]}{black ? '…' : '.'}<San san={m[4]} side={black ? 'b' : 'w'} /></> : m[5]}
    </strong>)
    last = (m.index ?? 0) + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out.map((node, i) => <Fragment key={i}>{node}</Fragment>)
}

/**
 * A comment as the reader sees it. Each line of the stored text is a paragraph; the
 * paragraphs are separated by a gap only, without bullets. Moves are bold with piece figurines.
 */
export const CommentText: React.FC<{
  text: string; className?: string
  /** Phrases that can be hovered (statement links); a phrase that is not in the text is ignored. */
  links?: CommentLink[]
  onLinkHover?: (link: CommentLink | null) => void
  onLinkSelect?: (link: CommentLink) => void
}> = ({ text, className = '', links, onLinkHover, onLinkSelect }) => {
  // Where each link stands in the text: its stored offset when the text still has the phrase
  // there, else the first place the phrase occurs. Links never overlap.
  const spans: { from: number; to: number; link: CommentLink }[] = []
  for (const link of links ?? []) {
    if (!link.phrase) continue
    const from = link.start != null && text.startsWith(link.phrase, link.start) ? link.start : text.indexOf(link.phrase)
    const to = from + link.phrase.length
    if (from >= 0 && spans.every(s => to <= s.from || from >= s.to)) spans.push({ from, to, link })
  }
  spans.sort((a, b) => a.from - b.from)
  const piece = (from: number, to: number) => {
    const out: ReactNode[] = []
    let at = from
    for (const s of spans) {
      if (s.from < from || s.to > to) continue
      if (s.from > at) out.push(<Fragment key={`t${at}`}>{renderMoves(text.slice(at, s.from))}</Fragment>)
      out.push(<span key={`l${s.from}`} className="comment-link" role="button" tabIndex={0}
        onMouseEnter={() => onLinkHover?.(s.link)} onMouseLeave={() => onLinkHover?.(null)}
        onFocus={() => onLinkHover?.(s.link)} onBlur={() => onLinkHover?.(null)}
        onClick={() => onLinkSelect?.(s.link)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLinkSelect?.(s.link) } }}>
        {renderMoves(text.slice(s.from, s.to))}</span>)
      at = s.to
    }
    if (at < to) out.push(<Fragment key={`t${at}`}>{renderMoves(text.slice(at, to))}</Fragment>)
    return out
  }
  // Paragraphs with their place in the text, trimmed.
  const blocks: [number, number][] = []
  let offset = 0
  for (const row of text.split('\n')) {
    const lead = row.length - row.trimStart().length
    if (row.trim()) blocks.push([offset + lead, offset + lead + row.trim().length])
    offset += row.length + 1
  }
  if (blocks.length < 2) return <p className={className}>{blocks[0] ? piece(...blocks[0]) : null}</p>
  return <div className={`comment-blocks ${className}`}>
    {blocks.map(([from, to]) => <p key={from}>{piece(from, to)}</p>)}
  </div>
}
