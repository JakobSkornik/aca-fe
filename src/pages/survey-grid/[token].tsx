import { useCallback, useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import SurveyLayout from '@/components/survey/SurveyLayout'
import styles from '@/components/survey/survey.module.css'
import { surveyRequest } from '@/services/SurveyService'
import type { ComparisonDecision, ComparisonManifest, ComparisonReview, ComparisonRound, ComparisonSession } from '@/types/ComparisonSurvey'

const SurveyGame = dynamic(() => import('@/components/survey/SurveyGame'), { ssr: false })
const blank = (game_id: string): ComparisonReview => ({ game_id, decision: 'ranked', best: null, worst: null, best_reason: '', worst_reason: '', feedback: '' })

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  return { props: {} }
}

export default function ComparisonSurvey() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [manifest, setManifest] = useState<ComparisonManifest | null>(null)
  const [session, setSession] = useState<ComparisonSession | null>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [round, setRound] = useState<ComparisonRound | null>(null)
  const [index, setIndex] = useState(0)
  const [review, setReview] = useState<ComparisonReview>(blank(''))
  const [selected, setSelected] = useState('')
  const [consent, setConsent] = useState(false)
  const [rating, setRating] = useState('Unrated / prefer not to say')
  const [overall, setOverall] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)
  const gameId = session?.rounds[index]?.game_id
  const onReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    if (!token) return
    let active = true
    ;(async () => {
      const definition = await surveyRequest<ComparisonManifest>(`grid/${token}`)
      if (!active) return
      setManifest(definition)
      let saved = ''
      try { saved = localStorage.getItem(`comparison-session:${token}`) || '' } catch { /* Storage can be disabled. */ }
      if (saved) {
        const previous = await surveyRequest<ComparisonSession>(`grid/${token}/session`, {}, saved)
        if (!active) return
        setSessionToken(saved); setSession(previous); setOverall(previous.feedback)
        const next = previous.rounds.findIndex(r => !previous.reviews.some(v => v.game_id === r.game_id))
        setIndex(next < 0 ? 0 : next); setFinishing(next < 0)
      }
    })().catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (!gameId || !sessionToken) return
    let active = true
    setRound(null); setReady(false); setError('')
    surveyRequest<ComparisonRound>(`grid/${token}/round/${gameId}`, {}, sessionToken).then(data => {
      if (!active) return
      setRound(data); setSelected(data.candidates[0].id)
      setReview(session?.reviews.find(r => r.game_id === gameId) || blank(gameId)); setDirty(false)
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
    // Reset only when navigating, not after saving this round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, token, sessionToken, reload])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function start() {
    setBusy(true); setError('')
    try {
      const created = await surveyRequest<ComparisonSession>(`grid/${token}/session`, { method: 'POST', body: JSON.stringify({ consent, rating }) })
      setSession(created); setSessionToken(created.token!)
      try { localStorage.setItem(`comparison-session:${token}`, created.token!) }
      catch { setNotice('Keep this tab open: browser storage is unavailable for resuming.') }
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  function edit(patch: Partial<ComparisonReview>) { setReview(r => ({ ...r, ...patch })); setDirty(true) }
  function decision(value: ComparisonDecision) {
    edit({ decision: value, ...(value !== 'ranked' ? { best: null, worst: null } : {}) })
  }
  async function persist(reviews: ComparisonReview[], completed = false) {
    const updated = await surveyRequest<ComparisonSession>(`grid/${token}/session`, { method: 'PUT', body: JSON.stringify({ version: session!.version, reviews, feedback: overall, completed }) }, sessionToken)
    setSession(updated); setDirty(false); setNotice(completed ? '' : 'Saved. You can resume with this link in the same browser.')
    return updated
  }
  async function save(skip = false, destination?: number) {
    if (!session || !gameId) return
    const answer = skip ? { ...blank(gameId), decision: 'skipped' as const } : review
    if (answer.decision === 'ranked' && (!answer.best || !answer.worst || answer.best === answer.worst || !answer.best_reason.trim() || !answer.worst_reason.trim())) {
      setError('Choose different best and worst comments and explain both choices, or select another assessment.'); return
    }
    setBusy(true); setError('')
    try {
      const updated = await persist([...session.reviews.filter(r => r.game_id !== gameId), answer])
      setReview(answer)
      if (destination !== undefined) setIndex(destination)
      else {
        const next = updated.rounds.findIndex((r, i) => i > index && !updated.reviews.some(v => v.game_id === r.game_id))
        const remaining = updated.rounds.findIndex(r => !updated.reviews.some(v => v.game_id === r.game_id))
        if (next >= 0 || remaining >= 0) setIndex(next >= 0 ? next : remaining)
        else setFinishing(true)
      }
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function submit() {
    setBusy(true); setError('')
    try { await persist(session!.reviews, true) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return <SurveyLayout title="Compare comments">
    {error && <div role="alert" className={styles.error}>{error} <button className={styles.secondary} onClick={() => window.location.reload()}>Reload saved progress</button></div>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {!manifest ? <div className={styles.card}>Loading comparison study…</div> : session?.completed ? <section className={`${styles.card} ${styles.intro}`}><h1>Thank you for your comparisons.</h1><p>Your choices and explanations are saved. You can close this page.</p></section> : !session ?
      <section className={`${styles.card} ${styles.intro}`}><span className={styles.eyebrow}>Ten rounds · Your perspective</span><h1>Which explanation helps you most?</h1>
        <p>Compare {manifest.candidate_count} anonymous comment versions in each round. All versions describe the same game and target position, at the same intended explanation level.</p>
        <ol className={styles.comparisonInstructions}><li>Explore the position and read each version.</li><li>Choose the best and worst explanation for you, and explain why.</li><li>If the comments feel similar or you cannot assess them, say so. You may also skip a round.</li></ol>
        <p>The intended levels are beginner, intermediate, and expert. They describe the writing’s intended audience, not the difficulty of the chess position. Game bands use average Lichess ratings.</p>
        <p>Comments are pre-generated by a prototype and may contain errors. Participation is voluntary. We store your choices, explanations, and optional rating band for the thesis study. No name or email is requested; please omit personal information from free text.</p>
        <label className={styles.field}>Your approximate chess rating (optional)<select value={rating} onChange={e => setRating(e.target.value)}><option>Unrated / prefer not to say</option>{manifest.rating_brackets.map(b => <option key={b}>{b}</option>)}</select></label>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I agree to participate and have my responses used for this thesis study.</label>
        <button className={styles.button} disabled={!consent || busy} onClick={() => void start()}>Start comparing →</button>
      </section> : finishing ? <section className={`${styles.card} ${styles.intro}`}><h1>Ready to submit?</h1><p>You saved all ten rounds. Your model choices remain anonymous until the researcher analyses the results.</p>
        <label className={styles.field}>Any overall feedback? (optional)<textarea rows={5} maxLength={4000} value={overall} onChange={e => { setOverall(e.target.value); setDirty(true) }} /></label>
        <div className={styles.actions}><button disabled={busy} className={styles.secondary} onClick={() => { setFinishing(false); setReady(false) }}>Review answers</button><button disabled={busy} className={styles.button} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit comparisons'}</button></div>
      </section> : <>
        <section className={styles.progressCard}><span className={styles.eyebrow}>Round {index+1} of 10</span><h1>Compare the explanations</h1><progress value={session.reviews.length} max={10} aria-label="Rounds saved" />
          <nav className={styles.gameNav} aria-label="Comparison rounds">{session.rounds.map((r, i) => <button key={r.game_id} className={i === index ? styles.current : ''} disabled={busy} aria-current={i === index ? 'step' : undefined} onClick={() => { if (i === index) return; if (dirty) void save(false, i); else setIndex(i) }}>{i+1}{session.reviews.some(v => v.game_id === r.game_id) ? ' ✓' : ''}</button>)}</nav>
        </section>
        {!round ? <div className={styles.card}>Loading the comparison… {error && <button className={styles.secondary} onClick={() => setReload(r => r+1)}>Retry</button>}</div> : <>
          <section className={styles.card}><span className={styles.eyebrow}>{round.level} explanations · Game rating {round.bracket}</span><h2>Comments on {Math.ceil(round.position.ply / 2)}{round.position.ply % 2 ? '.' : '…'} {round.position.san}</h2>
            <p>Labels are randomized for each round. Read every version before choosing. “Explore” loads that version’s saved analysis at this position.</p>
            <div className={styles.candidateGrid}>{round.candidates.map(c => <article className={`${styles.candidate} ${selected === c.id ? styles.candidateActive : ''}`} key={c.id}><h3>Comment {c.label}</h3><p>{c.comment}</p><button className={styles.secondary} aria-pressed={selected === c.id} onClick={() => { if (selected !== c.id) { setReady(false); setSelected(c.id) } }}>Explore comment {c.label}</button></article>)}</div>
          </section>
          {selected && <SurveyGame key={`${gameId}:${selected}`} token={token} gameId={gameId!} sessionToken={sessionToken} apiPath={`grid/${token}/game/${selected}`} initialMoveIndex={round.position.move_index} onReady={onReady} />}
          <section className={styles.card}><h2>Your comparison</h2><p>Judge how helpful the explanations feel to you. Consider clarity, useful detail, concision, and suitability for the stated audience.</p>
            <label className={styles.field}>Can you choose a best and worst version?<select value={review.decision} disabled={busy || !ready} onChange={e => decision(e.target.value as ComparisonDecision)}><option value="ranked">Yes — I can distinguish them</option><option value="similar">They feel too similar to rank</option><option value="cannot_judge">I cannot judge this comparison</option><option value="skipped">Skip this round</option></select></label>
            {review.decision === 'ranked' && <div className={styles.choiceColumns}>{(['best', 'worst'] as const).map(choice => <div key={choice}><label className={styles.field}>Which comment was {choice} for you?<select value={review[choice] || ''} disabled={busy || !ready} onChange={e => edit({ [choice]: e.target.value || null })}><option value="">Choose a comment</option>{round.candidates.map(c => <option key={c.id} value={c.id}>Comment {c.label}</option>)}</select></label>
              <label className={styles.field}>Why was this the {choice}?<textarea required rows={4} maxLength={1500} value={review[`${choice}_reason`]} disabled={busy || !ready} onChange={e => edit({ [`${choice}_reason`]: e.target.value })} /></label></div>)}</div>}
            <label className={styles.field}>Anything else about this comparison? (optional)<textarea rows={3} maxLength={1500} value={review.feedback} disabled={busy || !ready} onChange={e => edit({ feedback: e.target.value })} /></label>
            <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={() => void save(true)}>Skip round</button><button className={styles.button} disabled={busy || !ready} onClick={() => void save()}>{busy ? 'Saving…' : 'Save & continue →'}</button></div>
          </section>
        </>}
      </>}
  </SurveyLayout>
}
