import React, { Fragment, type ReactNode } from 'react'

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
 * A comment as the reader sees it. The played move and the alternative are separate
 * blocks (one per line of the stored text) and are shown as a short list; moves are bold
 * with piece figurines.
 */
export const CommentText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const blocks = text.split('\n').map(block => block.trim()).filter(Boolean)
  if (blocks.length < 2) return <p className={className}>{renderMoves(blocks[0] ?? '')}</p>
  return <ul className={`comment-blocks ${className}`}>
    {blocks.map((block, i) => <li key={i}>{renderMoves(block)}</li>)}
  </ul>
}
