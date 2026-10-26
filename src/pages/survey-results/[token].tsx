import { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import SurveyLayout from '@/components/survey/SurveyLayout'
import styles from '@/components/survey/survey.module.css'
import { surveyRequest } from '@/services/SurveyService'
import type { SurveyResults } from '@/types/Survey'

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  return { props: {} }
}

export default function SurveyResultsPage() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [data, setData] = useState<SurveyResults | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!token) return
    let active = true
    setLoading(true); setError('')
    surveyRequest<SurveyResults>(`results/${token}/summary`).then(value => { if (active) setData(value) })
      .catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, revision])
  async function download(kind: 'csv' | 'json') {
    try {
      const response = await fetch(`/api/surveys/results/${token}/${kind === 'csv' ? 'export.csv' : 'summary'}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Export failed. Please try again.')
      const url = URL.createObjectURL(await response.blob())
      const a = document.createElement('a'); a.href = url; a.download = `chess-survey-results.${kind}`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError((e as Error).message) }
  }
  return <SurveyLayout title="Study results">
    <section className={styles.progressCard}><span className={styles.eyebrow}>Researcher view · Keep this link private</span><h1>Participant perspectives</h1>
      <p className={styles.muted}>Descriptive ratings of the saved prototype. These scores describe perceived quality and usefulness, not measured learning gains or verified chess correctness.</p>
      <div className={styles.actions}><button className={styles.secondary} disabled={loading} onClick={() => setRevision(r => r + 1)}>{loading ? 'Refreshing…' : 'Refresh results'}</button>
        <button className={styles.button} disabled={!data} onClick={() => void download('csv')}>Download responses CSV</button>
        <button className={styles.secondary} disabled={!data} onClick={() => void download('json')}>Download full JSON</button></div>
    </section>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {data && <>
      <div className={styles.stats}>{[['Started', data.started], ['Submitted', data.completed], ['In progress', data.in_progress]].map(([label, count]) => <div className={styles.card} key={label}><span className={styles.muted}>{label}</span><strong>{count}</strong></div>)}</div>
      <p className={styles.muted}>Summaries include submitted responses only. Skipped games and “Cannot judge” answers are excluded from means. Each question shows its own sample size; scores range from 1 (strongly disagree) to 5 (strongly agree).</p>
      {data.completed === 0 && <div className={styles.card}>No submitted responses yet. Share the participant link; this page will show results once someone submits.</div>}
      <div className={styles.resultsGrid}>{data.games.map(game => <section className={styles.card} key={game.id}><span className={styles.eyebrow}>{game.id.replace('-', ' ')}</span><h2>Rating {game.bracket}</h2><p className={styles.small}>{game.skipped} skipped</p>
        {data.questions.map(question => { const metric = game.metrics[question.id]; return <div className={styles.metric} key={question.id}><p>{question.text}</p><div className={styles.metricValue}><strong>{metric.mean === null ? '—' : metric.mean.toFixed(2)}</strong><span>/ 5 · n = {metric.count} · Cannot judge: {metric.cannot_judge}</span></div>
          <div className={styles.distribution} aria-label={`Counts for scores 1 to 5: ${metric.distribution.join(', ')}`}>{metric.distribution.map((n, i) => <div key={i}><span style={{ height: `${Math.max(2, n / Math.max(1, ...metric.distribution) * 48)}px` }} /><b>{n}</b><small>{i+1}</small></div>)}</div></div> })}
        {game.feedback.length > 0 && <details><summary>Written feedback ({game.feedback.length})</summary>{game.feedback.map((text, i) => <blockquote className={styles.quote} key={i}>{text}</blockquote>)}</details>}
      </section>)}</div>
      <section className={styles.card}><h2>Overall feedback</h2>{data.feedback.length ? data.feedback.map((text, i) => <blockquote className={styles.quote} key={i}>{text}</blockquote>) : <p className={styles.muted}>No overall feedback yet.</p>}</section>
      <section className={styles.card}><details><summary>Game selection and generation record</summary><p className={styles.muted}>A fixed set of ten games; randomized presentation order per participant. One game per band cannot establish a general effect of rating on comment quality.</p><pre className={styles.provenance}>{JSON.stringify(data.provenance, null, 2)}</pre></details></section>
    </>}
  </SurveyLayout>
}
