import { useCallback, useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import SurveyLayout from '@/components/survey/SurveyLayout'
import SurveyTour, { TOUR_STEPS } from '@/components/survey/SurveyTour'
import styles from '@/components/survey/survey.module.css'
import { surveyRequest } from '@/services/SurveyService'
import type { ComparisonCriterion, ComparisonManifest, ComparisonReview, ComparisonRound, ComparisonSession } from '@/types/ComparisonSurvey'

const SurveyGame = dynamic(() => import('@/components/survey/SurveyGame'), { ssr: false })
const blank = (game_id: string): ComparisonReview => ({ game_id, decision: 'rated', scores: {}, feedback: '' })

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
  const [finishing, setFinishing] = useState(false)
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
  const dirty = Object.keys(drafts).length > 0

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
    setIndex(next < 0 ? 0 : next); setFinishing(next < 0)
  }

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
  async function persist(reviews: ComparisonReview[], completed = false) {
    const updated = await surveyRequest<ComparisonSession>(`grid/${token}/session`, { method: 'PUT', body: JSON.stringify({ version: session!.version, reviews, feedback: overall, completed }) }, sessionToken)
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
      else setFinishing(true)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function submit() {
    setBusy(true); setError('')
    try { await persist(session!.reviews, true) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const missing = review && round && manifest ? missingRatings(review, round, manifest.criteria) : []
  const inRound = !!session && !session.completed && !finishing

  return <SurveyLayout title="Compare comments" compact={inRound}>
    {error && <div role="alert" className={styles.error}>{error} <button className={styles.secondary} onClick={() => window.location.reload()}>Reload saved progress</button></div>}
    {notice && !inRound && <p role="status" className={styles.notice}>{notice}</p>}
    {!manifest ? <div className={styles.card}>Loading comparison study…</div> : session?.completed ? <section className={`${styles.card} ${styles.intro}`}><h1>Thank you for your ratings.</h1><p>Your answers are saved. You can close this page.</p>
        <p>Curious how the comments are made? Try the annotator on a game of your own.</p>
        <Link className={styles.button} href="/">Try the annotator →</Link></section> : !session ?
      <section className={`${styles.card} ${styles.intro}`}><span className={styles.eyebrow}>Ten rounds · About 15–30 minutes</span><h1>How good are these explanations?</h1>
        <p>The survey takes about 15 to 30 minutes. Saved rounds are kept, so you can take a break and return to this page in the same browser. Please take the survey only once.</p>
        <p>Each round shows {manifest.candidate_count} anonymous comments on the same move of the same game, written for the same audience. Rate every comment from 1 to 5 on each question.</p>
        <ol className={styles.comparisonInstructions}><li>Explore the position: the board, the engine lines and the supporting evidence.</li><li>Read each comment and rate it: {manifest.criteria.map(c => c.label.toLowerCase()).join(', ')}.</li><li>You may skip a round you cannot judge.</li></ol>
        <p>The intended levels are beginner, intermediate, and expert. They describe the writing’s intended audience, not the difficulty of the chess position. Game bands use average Lichess ratings.</p>
        <p>Comments are pre-generated by a prototype and may contain errors. Participation is voluntary. We store your ratings, optional notes, and chess rating for the thesis study. No name or email is requested; please omit personal information from free text.</p>
        <label className={styles.field}>Your chess rating (Elo) <span className={styles.requiredMark}>required</span><input className={eloValid ? '' : styles.missing} type="number" inputMode="numeric" min={100} max={3500} step={1} required value={elo} onChange={e => setElo(e.target.value)} placeholder="e.g. 1450" /></label>
        <label className={styles.field}>Rating type <span className={styles.requiredMark}>required</span><select className={ratingSystem ? '' : styles.missing} required value={ratingSystem} onChange={e => setRatingSystem(e.target.value)}><option value="" disabled>Choose…</option>{manifest.rating_systems.map(s => <option key={s}>{s}</option>)}</select></label>
        <p className={styles.small}>If you have no rating, enter your best estimate and choose “Estimate (unrated)”.</p>
        <label className={`${styles.consent} ${consent ? '' : styles.missing}`}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I agree to participate and have my responses used for this thesis study.</label>
        <button className={styles.button} disabled={!consent || !eloValid || !ratingSystem || busy} onClick={() => void start()}>Start →</button>
        {(!consent || !eloValid || !ratingSystem) && <p className={styles.missingNote}>Fields outlined in red are required.</p>}
      </section> : finishing ? <section className={`${styles.card} ${styles.intro}`}><h1>Ready to submit?</h1><p>You saved all ten rounds. The comments stay anonymous until the researcher analyses the results.</p>
        <label className={styles.field}>Any overall feedback? (optional)<textarea rows={5} maxLength={4000} value={overall} onChange={e => setOverall(e.target.value)} /></label>
        <div className={styles.actions}><button disabled={busy} className={styles.secondary} onClick={() => setFinishing(false)}>Review answers</button><button disabled={busy} className={styles.button} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit ratings'}</button></div>
      </section> : <>
        <header className={styles.roundBar}>
          <span className={styles.mark} aria-hidden="true">♞</span>
          <strong>Round {index+1}/10</strong>
          {round && <span className={styles.muted}><span className={styles.level}>{round.level}</span> explanations · game rating {round.bracket} · move {Math.ceil(round.position.ply / 2)}{round.position.ply % 2 ? '.' : '…'} {round.position.san}</span>}
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
                <p className={styles.commentText}>{c.comment}</p>
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
