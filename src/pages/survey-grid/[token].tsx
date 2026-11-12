import { useCallback, useEffect, useRef, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import SurveyLayout from '@/components/survey/SurveyLayout'
import SurveyTour, { TOUR_STEPS } from '@/components/survey/SurveyTour'
import { taskDraftComplete, type TaskDraft } from '@/components/survey/SurveyTask'
import styles from '@/components/survey/survey.module.css'
import { surveyRequest } from '@/services/SurveyService'
import { CommentText, MoveLabel } from '@/components/ui/San'
import type { ComparisonCriterion, ComparisonManifest, ComparisonReview, ComparisonRound, ComparisonSession, ComparisonTask, ComparisonTaskAnswer } from '@/types/ComparisonSurvey'

const SurveyGame = dynamic(() => import('@/components/survey/SurveyGame'), { ssr: false })
const SurveyTask = dynamic(() => import('@/components/survey/SurveyTask'), { ssr: false })
const blank = (game_id: string): ComparisonReview => ({ game_id, decision: 'rated', scores: {}, feedback: '' })
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = (n: number) => WORDS[n] ?? String(n)
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Where a session stands: rating rounds, then (version studies) the statement-checking
 * tasks behind a short notice, then the final screen.
 */
type Stage = 'rounds' | 'bridge' | 'tasks' | 'finish'
function stageOf(session: ComparisonSession): Stage {
  if (session.rounds.some(r => !session.reviews.some(v => v.game_id === r.game_id))) return 'rounds'
  const answers = session.task_answers ?? []
  if ((session.tasks ?? []).some(t => !answers.some(a => a.task_id === t.id))) return answers.length ? 'tasks' : 'bridge'
  return 'finish'
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  return { props: {} }
}

/** Ratings still missing in a round: one entry per candidate × criterion. */
function missingRatings(review: ComparisonReview, round: ComparisonRound, criteria: ComparisonCriterion[]) {
  return round.candidates.flatMap(c => criteria.filter(q => !review.scores[c.id]?.[q.id]).map(q => `${c.id}:${q.id}`))
}

function storedSession(token: string) {
  try { return localStorage.getItem(`comparison-session:${token}`) || '' } catch { return '' /* Storage can be disabled. */ }
}
const tourKey = (token: string) => `comparison-tour:${token}`
function tourSeen(token: string) {
  try { return localStorage.getItem(tourKey(token)) === 'done' } catch { return false }
}

export default function ComparisonSurvey() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [manifest, setManifest] = useState<ComparisonManifest | null>(null)
  const [session, setSession] = useState<ComparisonSession | null>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [round, setRound] = useState<ComparisonRound | null>(null)
  const [index, setIndex] = useState(0)
  // Unsaved ratings per round survive switching between rounds on this page.
  const [drafts, setDrafts] = useState<Record<string, ComparisonReview>>({})
  const [consent, setConsent] = useState(false)
  const [elo, setElo] = useState('')
  const [ratingSystem, setRatingSystem] = useState('')
  const [overall, setOverall] = useState('')
  const [stage, setStage] = useState<Stage>('rounds')
  const [task, setTask] = useState<ComparisonTask | null>(null)
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({})
  // When the current task appeared: the time to an answer is part of what the task measures.
  const taskShown = useRef(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)
  const [boardReady, setBoardReady] = useState(false)
  // First-round guide: plays once per browser, from step 1 (board) to 4 (ratings).
  const [tourStep, setTourStep] = useState<number | null>(null)
  const gameId = session?.rounds[index]?.game_id
  const onReady = useCallback(() => setBoardReady(true), [])
  const eloValue = Number(elo)
  const eloValid = /^\d{3,4}$/.test(elo) && eloValue >= 100 && eloValue <= 3500
  const saved = (id: string) => session?.reviews.find(r => r.game_id === id)
  const review = gameId ? drafts[gameId] ?? saved(gameId) ?? blank(gameId) : null
  const tasks = session?.tasks ?? []
  const answers = session?.task_answers ?? []
  const taskId = tasks.find(t => !answers.some(a => a.task_id === t.id))?.id
  const taskItems = manifest?.task_items ?? []
  const dirty = Object.keys(drafts).length > 0 || Object.keys(taskDraft).length > 0

  useEffect(() => {
    if (!token) return
    let active = true
    ;(async () => {
      const definition = await surveyRequest<ComparisonManifest>(`grid/${token}`)
      if (!active) return
      setManifest(definition)
      const stored = storedSession(token)
      if (stored) {
        const previous = await surveyRequest<ComparisonSession>(`grid/${token}/session`, {}, stored)
        if (active) resume(stored, previous)
      }
    })().catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [token])

  function resume(stored: string, previous: ComparisonSession) {
    setSessionToken(stored); setSession(previous); setOverall(previous.feedback)
    const next = previous.rounds.findIndex(r => !previous.reviews.some(v => v.game_id === r.game_id))
    setIndex(next < 0 ? 0 : next); setStage(stageOf(previous))
  }

  useEffect(() => {
    if (stage !== 'tasks' || !taskId || !sessionToken) return
    let active = true
    setTask(null); setTaskDraft({}); setError('')
    surveyRequest<ComparisonTask>(`grid/${token}/task/${taskId}`, {}, sessionToken)
      .then(data => { if (active) { setTask(data); taskShown.current = Date.now() } })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [stage, taskId, token, sessionToken, reload])

  useEffect(() => {
    if (!gameId || !sessionToken) return
    let active = true
    setRound(null); setError('')
    surveyRequest<ComparisonRound>(`grid/${token}/round/${gameId}`, {}, sessionToken)
      .then(data => { if (active) setRound(data) })
      .catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [gameId, token, sessionToken, reload])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => { setBoardReady(false) }, [gameId])
  useEffect(() => {
    if (boardReady && index === 0 && session && !session.completed && !session.reviews.length && tourStep === null && !tourSeen(token))
      setTourStep(1)
  }, [boardReady, index, session, tourStep, token])
  useEffect(() => {
    if (tourStep === null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTour() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  function closeTour() {
    setTourStep(null)
    try { localStorage.setItem(tourKey(token), 'done') } catch { /* The guide may then show again. */ }
  }

  async function start() {
    setBusy(true); setError('')
    try {
      // Another tab of this browser may have started (or finished) the survey since this page loaded.
      const stored = storedSession(token)
      if (stored) { resume(stored, await surveyRequest<ComparisonSession>(`grid/${token}/session`, {}, stored)); return }
      const created = await surveyRequest<ComparisonSession>(`grid/${token}/session`, { method: 'POST', body: JSON.stringify({ consent, elo: eloValue, rating_system: ratingSystem }) })
      setSession(created); setSessionToken(created.token!)
      try { localStorage.setItem(`comparison-session:${token}`, created.token!) }
      catch { setNotice('Keep this tab open: browser storage is unavailable for resuming.') }
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  function edit(patch: Partial<ComparisonReview>) {
    if (!gameId || !review) return
    setDrafts(d => ({ ...d, [gameId]: { ...review, ...patch } }))
  }
  function rate(candidate: string, criterion: string, score: number) {
    if (!review) return
    edit({ decision: 'rated', scores: { ...review.scores, [candidate]: { ...review.scores[candidate], [criterion]: score } } })
  }
  async function persist(reviews: ComparisonReview[], completed = false, taskAnswers: ComparisonTaskAnswer[] = answers) {
    // Studies without tasks keep the request body they always had.
    const body = { version: session!.version, reviews, feedback: overall, completed, ...(tasks.length ? { tasks: taskAnswers } : {}) }
    const updated = await surveyRequest<ComparisonSession>(`grid/${token}/session`, { method: 'PUT', body: JSON.stringify(body) }, sessionToken)
    setSession(updated); setNotice(completed ? '' : 'Saved. You can resume with this link in the same browser.')
    return updated
  }
  async function save(skip = false) {
    if (!session || !gameId || !review) return
    const answer: ComparisonReview = skip ? { ...blank(gameId), decision: 'skipped', feedback: review.feedback } : review
    setBusy(true); setError('')
    try {
      const updated = await persist([...session.reviews.filter(r => r.game_id !== gameId), answer])
      setDrafts(({ [gameId]: _done, ...rest }) => rest)
      const next = updated.rounds.findIndex((r, i) => i > index && !updated.reviews.some(v => v.game_id === r.game_id))
      const remaining = updated.rounds.findIndex(r => !updated.reviews.some(v => v.game_id === r.game_id))
      if (next >= 0 || remaining >= 0) setIndex(next >= 0 ? next : remaining)
      else setStage(stageOf(updated))
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function saveTask() {
    if (!session || !task || !taskDraftComplete(taskDraft, taskItems)) return
    setBusy(true); setError('')
    try {
      const answer: ComparisonTaskAnswer = { task_id: task.id, answer_ply: taskDraft.answer_ply as number | null,
        could_check: taskDraft.could_check!, trust: taskDraft.trust!, elapsed_ms: Math.min(Date.now() - taskShown.current, 6 * 3600 * 1000) }
      const updated = await persist(session.reviews, false, [...answers.filter(a => a.task_id !== task.id), answer])
      setTaskDraft({}); setStage(stageOf(updated))
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function submit() {
    setBusy(true); setError('')
    try { await persist(session!.reviews, true) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const missing = review && round && manifest ? missingRatings(review, round, manifest.criteria) : []
  const inRound = !!session && !session.completed && stage === 'rounds'
  const inTask = !!session && !session.completed && stage === 'tasks'
  const rounds = session?.rounds.length ?? manifest?.round_count ?? 10
  const taskCount = manifest?.task_count ?? 0
  const duration = manifest?.duration ?? '15 to 30 minutes'
  const taskNumber = tasks.findIndex(t => t.id === taskId) + 1

  return <SurveyLayout title="Compare comments" compact={inRound || inTask}>
    {error && <div role="alert" className={styles.error}>{error} <button className={styles.secondary} onClick={() => window.location.reload()}>Reload saved progress</button></div>}
    {notice && !inRound && !inTask && <p role="status" className={styles.notice}>{notice}</p>}
    {!manifest ? <div className={styles.card}>Loading comparison study…</div> : session?.completed ? <section className={`${styles.card} ${styles.intro}`}><h1>Thank you for your ratings.</h1><p>Your answers are saved. You can close this page.</p>
        <p>Curious how the comments are made? Try the annotator on a game of your own.</p>
        <Link className={styles.button} href="/">Try the annotator →</Link></section> : !session ?
      <section className={`${styles.card} ${styles.intro}`}><span className={styles.eyebrow}>{capital(word(rounds))} rounds{taskCount ? ` and ${word(taskCount)} short task${taskCount === 1 ? '' : 's'}` : ''} · About {duration.replace('about ', '').replace(' to ', '–')}</span><h1>How good are these explanations?</h1>
        <p>The survey takes {duration.startsWith('about') ? duration : `about ${duration}`}. Saved rounds are kept, so you can take a break and return to this page in the same browser. Please take the survey only once.</p>
        <p>Each round shows {manifest.candidate_count} anonymous comments on the same move of the same game, written for the same audience. In each comment the first point is about the move played and the second about the alternative. Rate every comment from 1 to 5 on each question.{taskCount ? ` ${capital(word(taskCount))} short task${taskCount === 1 ? '' : 's'} at the end ask${taskCount === 1 ? 's' : ''} you to check one statement from a comment on the board.` : ''}</p>
        <ol className={styles.comparisonInstructions}><li>{manifest.lines_only ? 'Look at the position: the board, the move played and the engine’s alternative with their lines.' : 'Explore the position: the board, the engine lines and the supporting evidence.'}</li><li>Read each comment and rate it: {manifest.criteria.map(c => c.label.toLowerCase()).join(', ')}.</li><li>You may skip a round you cannot judge.</li></ol>
        {manifest.lines_only ? <p>The comments are written for experienced players.</p> : <p>The intended levels are beginner, intermediate, and expert. They describe the writing’s intended audience, not the difficulty of the chess position. Game bands use average Lichess ratings.</p>}
        <p>Comments are pre-generated by a prototype and may contain errors. Participation is voluntary. We store your ratings, optional notes, and chess rating for the thesis study. No name or email is requested; please omit personal information from free text.</p>
        <label className={styles.field}>Your chess rating (Elo) <span className={styles.requiredMark}>required</span><input className={eloValid ? '' : styles.missing} type="number" inputMode="numeric" min={100} max={3500} step={1} required value={elo} onChange={e => setElo(e.target.value)} placeholder="e.g. 1450" /></label>
        <label className={styles.field}>Rating type <span className={styles.requiredMark}>required</span><select className={ratingSystem ? '' : styles.missing} required value={ratingSystem} onChange={e => setRatingSystem(e.target.value)}><option value="" disabled>Choose…</option>{manifest.rating_systems.map(s => <option key={s}>{s}</option>)}</select></label>
        <p className={styles.small}>If you have no rating, enter your best estimate and choose “Estimate (unrated)”.</p>
        <label className={`${styles.consent} ${consent ? '' : styles.missing}`}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I agree to participate and have my responses used for this thesis study.</label>
        <button className={styles.button} disabled={!consent || !eloValid || !ratingSystem || busy} onClick={() => void start()}>Start →</button>
        {(!consent || !eloValid || !ratingSystem) && <p className={styles.missingNote}>Fields outlined in red are required.</p>}
      </section> : stage === 'finish' ? <section className={`${styles.card} ${styles.intro}`}><h1>Ready to submit?</h1><p>You saved all {word(rounds)} rounds{tasks.length ? (tasks.length === 2 ? ' and both tasks' : ` and all ${word(tasks.length)} tasks`) : ''}. The comments stay anonymous until the researcher analyses the results.</p>
        <label className={styles.field}>Any overall feedback? (optional)<textarea rows={5} maxLength={4000} value={overall} onChange={e => setOverall(e.target.value)} /></label>
        <div className={styles.actions}>{answers.length ? <span /> : <button disabled={busy} className={styles.secondary} onClick={() => setStage('rounds')}>Review answers</button>}<button disabled={busy} className={styles.button} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit ratings'}</button></div>
      </section> : stage === 'bridge' ? <section className={`${styles.card} ${styles.intro}`}><span className={styles.eyebrow}>Part 2 · {capital(word(tasks.length))} short task{tasks.length === 1 ? '' : 's'}</span><h1>Check a statement on the board</h1>
        <p>You have rated all {word(rounds)} rounds. Each task now shows one comment and one statement taken from it. Step through the line on the board and choose the move after which the statement first becomes true.</p>
        <p>Your ratings can no longer be changed once you save the first task.</p>
        <div className={styles.actions}><button disabled={busy} className={styles.secondary} onClick={() => { setIndex(0); setStage('rounds') }}>Review ratings</button><button disabled={busy} className={styles.button} onClick={() => setStage('tasks')}>Start part 2 →</button></div>
      </section> : stage === 'tasks' ? <>
        <header className={styles.roundBar}>
          <span className={styles.mark} aria-hidden="true">♞</span>
          <strong>Check a statement {taskNumber}/{tasks.length}</strong>
          {task && <span className={styles.muted}>move <MoveLabel label={`${Math.ceil(task.position.ply / 2)}${task.position.ply % 2 ? '.' : '…'}${task.position.san}`} /></span>}
          {notice && <span role="status" className={styles.savedNote}>{notice}</span>}
        </header>
        {!task ? <div className={styles.card}>Loading the task… {error && <button className={styles.secondary} onClick={() => setReload(r => r+1)}>Retry</button>}</div> :
          <SurveyTask task={task} draft={taskDraft} onDraft={patch => setTaskDraft(d => ({ ...d, ...patch }))} items={taskItems} scale={manifest.scale} disabled={busy}
            footer={<div className={styles.actions}>
              {!taskDraftComplete(taskDraft, taskItems) && <p className={styles.missingNote}>Answer the questions highlighted in red to save.</p>}
              <span />
              <button className={styles.button} disabled={busy || !taskDraftComplete(taskDraft, taskItems)} onClick={() => void saveTask()}>{busy ? 'Saving…' : 'Save & continue →'}</button></div>} />}
      </> : <>
        <header className={styles.roundBar}>
          <span className={styles.mark} aria-hidden="true">♞</span>
          <strong>Round {index+1}/{rounds}</strong>
          {round && <span className={styles.muted}>{manifest.lines_only ? null : <><span className={styles.level}>{round.level}</span> explanations · game rating {round.bracket} · </>}move <MoveLabel label={`${Math.ceil(round.position.ply / 2)}${round.position.ply % 2 ? '.' : '…'}${round.position.san}`} /></span>}
          <nav className={styles.roundNav} aria-label="Rounds">{session.rounds.map((r, i) => <button key={r.game_id} className={`${i === index ? styles.current : ''} ${saved(r.game_id) ? styles.done : ''}`} disabled={busy} aria-current={i === index ? 'step' : undefined} title={saved(r.game_id) ? 'Saved' : drafts[r.game_id] ? 'Unsaved ratings' : 'Not started'} onClick={() => setIndex(i)}>{i+1}{drafts[r.game_id] ? '*' : ''}</button>)}</nav>
          {notice && <span role="status" className={styles.savedNote}>{notice}</span>}
          <button type="button" className={`${styles.secondary} ${styles.guideButton}`} disabled={!boardReady || tourStep !== null} onClick={() => setTourStep(1)}>Guide</button>
        </header>
        {tourStep !== null && boardReady && <SurveyTour step={tourStep} onClose={closeTour}
          onNext={() => setTourStep(s => Math.min((s ?? 1) + 1, TOUR_STEPS.length))} />}
        {!round || !review ? <div className={styles.card}>Loading the round… {error && <button className={styles.secondary} onClick={() => setReload(r => r+1)}>Retry</button>}</div> :
          <SurveyGame key={gameId} token={token} gameId={gameId!} sessionToken={sessionToken} apiPath={`grid/${token}/round/${gameId}/board`}
            initialMoveIndex={round.position.move_index} onReady={onReady} tourStep={boardReady ? tourStep : null} aside={<>
              <div className={styles.scaleLegend}><span>1 = {manifest.scale.low}</span><span>5 = {manifest.scale.high}</span></div>
              {round.candidates.map(c => <article className={styles.candidate} key={c.id}>
                <h3>Comment {c.label}</h3>
                <CommentText text={c.comment} className={styles.commentText} />
                {manifest.criteria.map(q => { const value = review.scores[c.id]?.[q.id]; return <fieldset key={q.id} className={`${styles.rating} ${value || review.decision === 'skipped' ? '' : styles.missing}`}>
                  <legend title={q.statement}>{q.label}<span className={styles.statement}>{q.statement}</span></legend>
                  <div className={styles.scoreButtons}>{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-pressed={value === n} className={value === n ? styles.chosen : ''} disabled={busy} onClick={() => rate(c.id, q.id, n)}>{n}</button>)}</div>
                </fieldset> })}
              </article>)}
              <label className={styles.field}>Anything about this round? (optional)<textarea rows={2} maxLength={1500} value={review.feedback} disabled={busy} onChange={e => edit({ feedback: e.target.value })} /></label>
              <div className={styles.actions}>
                {missing.length > 0 && <p className={styles.missingNote}>{missing.length} rating{missing.length === 1 ? '' : 's'} left: answer the questions highlighted in red to save.</p>}
                <button className={styles.secondary} disabled={busy} onClick={() => void save(true)}>Skip round</button>
                <button className={styles.button} disabled={busy || missing.length > 0} onClick={() => void save()}>{busy ? 'Saving…' : 'Save & continue →'}</button></div>
            </>} />}
      </>}
  </SurveyLayout>
}
