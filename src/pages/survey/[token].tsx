import { useCallback, useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import SurveyLayout from '@/components/survey/SurveyLayout'
import styles from '@/components/survey/survey.module.css'
import { surveyRequest } from '@/services/SurveyService'
import type { RatingKey, Ratings, SurveyManifest, SurveyReview, SurveySession } from '@/types/Survey'

const SurveyGame = dynamic(() => import('@/components/survey/SurveyGame'), { ssr: false })
const emptyRatings: Ratings = { clarity: null, usefulness: null, coherence: null, presentation: null }
const labels = ['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree', 'Strongly agree']

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  return { props: {} }
}

export default function SurveyPage() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [manifest, setManifest] = useState<SurveyManifest | null>(null)
  const [session, setSession] = useState<SurveySession | null>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [consent, setConsent] = useState(false)
  const [rating, setRating] = useState('Unrated / prefer not to say')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Partial<Record<RatingKey, number | null>>>({})
  const [feedback, setFeedback] = useState('')
  const [overall, setOverall] = useState('')
  const [ready, setReady] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const gameId = session?.order[index]
  const onReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    if (!token) return
    let active = true
    setLoading(true)
    ;(async () => {
      const definition = await surveyRequest<SurveyManifest>(token)
      if (!active) return
      setManifest(definition)
      let saved = ''
      try { saved = localStorage.getItem(`survey-session:${token}`) || '' } catch { /* This browser may disable storage. */ }
      if (saved) {
        const previous = await surveyRequest<SurveySession>(`${token}/session`, {}, saved)
        if (!active) return
        setSessionToken(saved)
        setSession(previous)
        setOverall(previous.feedback)
        const next = previous.order.findIndex(id => !previous.reviews.some(r => r.game_id === id))
        setIndex(next < 0 ? 0 : next)
        setFinishing(next < 0 && !previous.completed)
      }
    })().catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (!gameId) return
    const review = session?.reviews.find(r => r.game_id === gameId)
    setAnswers(review && !review.skipped ? review.ratings : {})
    setFeedback(review?.feedback || '')
    setReady(false)
    setDirty(false)
    // Only reset when moving to another game, not after a successful save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function start() {
    setBusy(true); setError('')
    try {
      const created = await surveyRequest<SurveySession>(`${token}/session`, { method: 'POST', body: JSON.stringify({ consent, rating }) })
      setSessionToken(created.token!); setSession(created)
      try { localStorage.setItem(`survey-session:${token}`, created.token!) }
      catch { setNotice('Your browser blocks local storage. Keep this tab open to retain access to your response.') }
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function persist(reviews: SurveyReview[], completed = false) {
    if (!session) throw new Error('Please start the survey first.')
    const updated = await surveyRequest<SurveySession>(`${token}/session`, { method: 'PUT', body: JSON.stringify({
      version: session.version, reviews, feedback: overall, completed,
    }) }, sessionToken)
    setSession(updated); setDirty(false); setNotice(completed ? '' : 'Saved. You can return using this link in the same browser.')
    return updated
  }

  async function saveGame(skip: boolean, destination?: number) {
    if (!session || !manifest || !gameId) return
    if (!skip && !manifest.questions.every(q => Object.prototype.hasOwnProperty.call(answers, q.id))) {
      setError('Choose a rating or “Cannot judge” for every statement, or skip this game.'); return
    }
    setBusy(true); setError('')
    try {
      const review: SurveyReview = { game_id: gameId, skipped: skip, ratings: skip ? emptyRatings : answers as Ratings, feedback }
      const updated = await persist([...session.reviews.filter(r => r.game_id !== gameId), review])
      setAnswers(skip ? {} : review.ratings)
      if (destination !== undefined) setIndex(destination)
      else {
        const next = updated.order.findIndex((id, i) => i > index && !updated.reviews.some(r => r.game_id === id))
        const remaining = updated.order.findIndex(id => !updated.reviews.some(r => r.game_id === id))
        if (next >= 0) setIndex(next)
        else if (remaining >= 0) setIndex(remaining)
        else setFinishing(true)
      }
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  function navigate(destination: number) {
    if (destination === index) return
    if (dirty) { void saveGame(false, destination); return }
    setIndex(destination); setError('')
  }

  async function finish() {
    if (!session) return
    setBusy(true); setError('')
    try { await persist(session.reviews, true) }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  return <SurveyLayout title={session?.completed ? 'Thank you' : 'Take part'}>
    {error && <div role="alert" className={styles.error}>{error} <button className={styles.secondary} onClick={() => window.location.reload()}>Reload saved progress</button></div>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {loading ? <div className={styles.card}>Loading study…</div> : !manifest ? <div className={styles.card}>This survey is unavailable. Please check the link with the researcher.</div> : session?.completed ?
      <section className={`${styles.card} ${styles.intro}`}><span className={styles.eyebrow}>Response submitted</span><h1>Thank you for your perspective.</h1>
        <p>Your answers have been saved. They will help us understand how people experience the prototype’s commentary.</p>
        <p className={styles.muted}>You can now close this page. Research results are available separately to the study organizer.</p></section>
    : !session ? <section className={`${styles.card} ${styles.intro}`}>
      <span className={styles.eyebrow}>Ten games. Your perspective.</span><h1>Does the commentary help you understand the game?</h1>
      <p>Explore ten games with pre-generated comments, one from each rating band. Tell us how clear, useful, and easy to follow you find the explanations and their presentation.</p>
      <div className={styles.instructions}><h2>What to expect</h2><ol><li>Read the comments and explore the moves and supporting variations.</li><li>Rate four statements for each game. There are no right or wrong opinions.</li><li>Choose “Cannot judge” or skip a game whenever you cannot assess it.</li></ol>
        <p>Everyone sees the same saved games and comments, in a randomized order. Nothing is generated while you take the survey. Save after each game to return later in the same browser.</p></div>
      <p className={styles.muted}>This study concerns your experience with a prototype. Comments may contain errors. Participation is voluntary. We store your ratings, optional rating band, and feedback for the thesis study; no name or email is requested. Please avoid personal information in feedback.</p>
      <label className={styles.field}>Your approximate chess rating (optional)<select value={rating} onChange={e => setRating(e.target.value)}><option>Unrated / prefer not to say</option>{manifest.rating_brackets.map(b => <option key={b}>{b}</option>)}</select></label>
      <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I agree to take part and have my responses used for this thesis study.</label>
      <button className={styles.button} disabled={!consent || busy} onClick={() => void start()}>{busy ? 'Starting…' : 'Start reviewing games →'}</button>
      <p className={styles.small}>Game bands use the average of both players’ Lichess ratings, not FIDE Elo.</p>
    </section> : finishing ? <section className={`${styles.card} ${styles.intro}`}>
      <span className={styles.eyebrow}>One last thought</span><h1>Ready to submit?</h1><p>You rated {session.reviews.filter(r => !r.skipped).length} games and skipped {session.reviews.filter(r => r.skipped).length}.</p>
      <label className={styles.field}>What worked well, and what would you change? (optional)<textarea maxLength={4000} rows={6} value={overall} onChange={e => { setOverall(e.target.value); setDirty(true) }} /></label>
      <div className={styles.actions}><button disabled={busy} className={styles.secondary} onClick={() => { setFinishing(false); setReady(false) }}>Review my answers</button>
        <button disabled={busy} className={styles.button} onClick={() => void finish()}>{busy ? 'Submitting…' : 'Submit my response'}</button></div>
    </section> : <>
      <section className={styles.progressCard}><div className={styles.progressHeading}><div><span className={styles.eyebrow}>Review the game</span><h1>Game {index + 1} of 10</h1></div><strong>{session.reviews.length} / 10 saved</strong></div>
        <progress max={10} value={session.reviews.length} aria-label="Games saved" />
        <nav className={styles.gameNav} aria-label="Survey games">{session.order.map((id, i) => <button key={id} className={i === index ? styles.current : ''} disabled={busy} onClick={() => navigate(i)} aria-current={i === index ? 'step' : undefined} aria-label={`Game ${i+1}${session.reviews.some(r => r.game_id === id) ? ', saved' : ''}`}>{i+1}{session.reviews.some(r => r.game_id === id) ? ' ✓' : ''}</button>)}</nav>
      </section>
      {gameId && <SurveyGame key={gameId} token={token} gameId={gameId} onReady={onReady} />}
      <section className={styles.card}><span className={styles.eyebrow}>Your experience</span><h2>How did this game’s commentary feel to you?</h2><p className={styles.muted}>Rate the comments you explored, rather than how well the players played.</p>
        <form onSubmit={e => { e.preventDefault(); void saveGame(false) }}>
          {manifest.questions.map(q => <fieldset key={q.id} className={styles.question} disabled={busy || !ready}><legend>{q.text}</legend><div className={styles.ratings}>
            {labels.map((label, i) => <label key={label} className={answers[q.id] === i+1 ? styles.chosen : ''}><input type="radio" name={q.id} value={i+1} checked={answers[q.id] === i+1} onChange={() => { setAnswers(a => ({ ...a, [q.id]: i+1 })); setDirty(true) }} /><b>{i+1}</b><span>{label}</span></label>)}
            <label className={answers[q.id] === null ? styles.chosen : ''}><input type="radio" name={q.id} checked={answers[q.id] === null} onChange={() => { setAnswers(a => ({ ...a, [q.id]: null })); setDirty(true) }} /><span>Cannot judge</span></label>
          </div></fieldset>)}
          <label className={styles.field}>Anything confusing or particularly helpful? (optional)<textarea rows={3} maxLength={2000} value={feedback} disabled={busy || !ready} onChange={e => { setFeedback(e.target.value); setDirty(true) }} /></label>
          <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => void saveGame(true)}>Skip this game</button>
            <button type="submit" className={styles.button} disabled={busy || !ready}>{busy ? 'Saving…' : 'Save answers & continue →'}</button></div>
        </form>
      </section>
    </>}
  </SurveyLayout>
}
