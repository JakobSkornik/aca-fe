import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { ComparisonScale, ComparisonTask, ComparisonTaskItem } from '@/types/ComparisonSurvey'
import styles from './survey.module.css'
import { MoveLabel } from '@/components/ui/San'

/** What the participant has entered so far; `answer_ply` null means "I cannot tell". */
export type TaskDraft = { answer_ply?: number | null; could_check?: number; trust?: number }

export function taskDraftComplete(draft: TaskDraft, items: ComparisonTaskItem[]) {
  return draft.answer_ply !== undefined && items.every(item => draft[item.id] !== undefined)
}

/** Every ply of the line with its move number ("30…Qb6+", "31.Kc2") and the squares it moves between. */
function lineSteps(startFen: string, sans: string[]) {
  const chess = new Chess(startFen)
  return sans.map(san => {
    const white = chess.turn() === 'w'
    const number = chess.moveNumber()
    const move = chess.move(san)
    return { label: `${number}${white ? '.' : '…'}${san}`, from: move.from, to: move.to }
  })
}

function useBoardSize() {
  const fit = () => (typeof window === 'undefined' ? 360 : Math.max(240, Math.min(400, window.innerWidth - 56, window.innerHeight - 330)))
  const [size, setSize] = useState(fit)
  useEffect(() => {
    const update = () => setSize(fit())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

/** One value per position of the line; the marker follows the board, a click on a column moves it. */
function StepChart({ series, labels, idx, onIdx }: {
  series: NonNullable<ComparisonTask['series']>; labels: string[]; idx: number; onIdx: (next: number) => void
}) {
  const { values } = series
  const width = 320, height = 84, left = 26, right = 10, top = 10, bottom = 20
  const low = Math.min(...values), high = Math.max(...values)
  const span = high - low || 1
  const x = (i: number) => left + (i / Math.max(values.length - 1, 1)) * (width - left - right)
  const y = (v: number) => top + (1 - (v - low) / span) * (height - top - bottom)
  const path = values.map((v, i) => (i === 0 ? `M${x(0)},${y(v)}` : `H${x(i)}V${y(v)}`)).join('')
  const column = (width - left - right) / Math.max(values.length - 1, 1)
  const name = (i: number) => (i === 0 ? 'before the move' : `after ${labels[i - 1]}`)
  return <figure className={styles.taskChart}>
    <figcaption>{series.label}<span>{values[idx]} {name(idx)}</span></figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${series.label} along the line: ${values.map((v, i) => `${v} ${name(i)}`).join(', ')}`}>
      {[low, high].filter((v, i, all) => all.indexOf(v) === i).map(v => <g key={v}>
        <line x1={left} x2={width - right} y1={y(v)} y2={y(v)} className={styles.taskChartGrid} />
        <text x={left - 6} y={y(v) + 3.5} textAnchor="end" className={styles.taskChartTick}>{v}</text>
      </g>)}
      <path d={path} className={styles.taskChartLine} />
      <circle cx={x(idx)} cy={y(values[idx])} r={4.5} className={styles.taskChartDot} />
      {values.map((v, i) => <g key={i}>
        {(i === 0 || i === values.length - 1) && <text x={x(i)} y={height - 5} textAnchor={i === 0 ? 'start' : 'end'} className={styles.taskChartTick}>{i === 0 ? 'start' : labels[i - 1]}</text>}
        <rect x={x(i) - column / 2} y={0} width={column} height={height} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onIdx(i)}>
          <title>{`${series.label}: ${v} ${name(i)}`}</title>
        </rect>
      </g>)}
    </svg>
  </figure>
}

/**
 * A statement-checking task: one comment, one statement from it, and the line it
 * belongs to. The participant steps through the line and names the move after
 * which the statement first holds.
 */
export default function SurveyTask({ task, draft, onDraft, items, scale, disabled, footer }: {
  task: ComparisonTask; draft: TaskDraft; onDraft: (patch: TaskDraft) => void
  items: ComparisonTaskItem[]; scale: ComparisonScale; disabled: boolean; footer: ReactNode
}) {
  const steps = useMemo(() => lineSteps(task.start_fen, task.san), [task])
  const size = useBoardSize()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  useEffect(() => { setIdx(0); setFlipped(false) }, [task.id])
  const fen = idx === 0 ? task.start_fen : task.fens[idx - 1]
  const squares: Record<string, React.CSSProperties> = {}
  if (idx > 0) for (const square of [steps[idx - 1].from, steps[idx - 1].to])
    squares[square] = { backgroundColor: 'color-mix(in srgb, var(--accent) 42%, transparent)' }
  for (const square of task.squares)
    squares[square] = { ...squares[square], boxShadow: 'inset 0 0 0 3px var(--info)' }
  const at = task.comment.indexOf(task.fragment)
  const go = (next: number) => setIdx(Math.max(0, Math.min(next, steps.length)))

  return <div className={styles.taskGrid}>
    <div className={styles.taskBoard}>
      <div className="overflow-hidden rounded-[8px]" style={{ width: size, height: size }}>
        <Chessboard position={fen} boardWidth={size} arePiecesDraggable={false} areArrowsAllowed={false}
          boardOrientation={flipped ? 'black' : 'white'}
          customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
          customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }} customSquareStyles={squares} />
      </div>
      <div className={styles.taskLine} style={{ maxWidth: size }} aria-label="Moves of the line">
        <button type="button" aria-pressed={idx === 0} className={idx === 0 ? styles.chosen : ''} onClick={() => go(0)}>start</button>
        {steps.map((step, i) => <button key={i} type="button" aria-pressed={idx === i + 1} className={idx === i + 1 ? styles.chosen : ''} onClick={() => go(i + 1)}><MoveLabel label={step.label} /></button>)}
      </div>
      <div className={styles.taskTools} style={{ maxWidth: size }}>
        <button type="button" className={styles.secondary} disabled={idx === 0} onClick={() => go(idx - 1)}>← Back</button>
        <button type="button" className={styles.secondary} disabled={idx === steps.length} onClick={() => go(idx + 1)}>Next →</button>
        <button type="button" className={styles.secondary} onClick={() => setFlipped(f => !f)}>Flip board</button>
      </div>
      {task.series && <StepChart series={task.series} labels={steps.map(s => s.label)} idx={idx} onIdx={go} />}
    </div>
    <div className={styles.taskAside}>
      <article className={styles.candidate}>
        <h3>The comment</h3>
        <p className={styles.commentText}>{at < 0 ? task.comment : <>{task.comment.slice(0, at)}<mark className={styles.taskMark}>{task.fragment}</mark>{task.comment.slice(at + task.fragment.length)}</>}</p>
      </article>
      <div className={styles.taskStatement}>
        <span className={styles.eyebrow}>Statement to check</span>
        <p>{task.statement}</p>
        <small>It belongs to the line after {task.line === 'played' ? 'the move played' : 'the alternative'}. Blue frames mark the squares it names.</small>
      </div>
      <fieldset className={`${styles.taskQuestion} ${draft.answer_ply === undefined ? styles.missing : ''}`}>
        <legend>Step through the line. After which move is this statement first true?</legend>
        <div className={styles.taskOptions}>
          {steps.map((step, i) => <button key={i} type="button" disabled={disabled} aria-pressed={draft.answer_ply === i + 1}
            className={draft.answer_ply === i + 1 ? styles.chosen : ''} onClick={() => onDraft({ answer_ply: i + 1 })}><MoveLabel label={step.label} /></button>)}
          <button type="button" disabled={disabled} aria-pressed={draft.answer_ply === null}
            className={draft.answer_ply === null ? styles.chosen : ''} onClick={() => onDraft({ answer_ply: null })}>I cannot tell</button>
        </div>
      </fieldset>
      {items.map(item => { const value = draft[item.id]; return <fieldset key={item.id} className={`${styles.rating} ${value ? '' : styles.missing}`}>
        <legend title={item.statement}>{item.label}<span className={styles.statement}>{item.statement}{item.options ? '' : ` 1 = ${scale.low}, 5 = ${scale.high}.`}</span></legend>
        <div className={`${styles.scoreButtons} ${item.options ? styles.wordButtons : ''}`}>{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" disabled={disabled}
          aria-pressed={value === n} className={value === n ? styles.chosen : ''} onClick={() => onDraft({ [item.id]: n })}>{item.options ? item.options[n - 1] : n}</button>)}</div>
      </fieldset> })}
      {footer}
    </div>
  </div>
}
