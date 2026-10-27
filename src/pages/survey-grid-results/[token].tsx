import { useEffect, useMemo, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import SurveyLayout from '@/components/survey/SurveyLayout'
import styles from '@/components/survey/survey.module.css'
import { surveyRequest } from '@/services/SurveyService'
import type { ComparisonCell, ComparisonResults } from '@/types/ComparisonSurvey'

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  return { props: {} }
}

/** Pool cells: per criterion, n-weighted mean and summed 1-5 distribution. */
function aggregate(cells: ComparisonCell[], criterion: string) {
  const distribution = [0, 0, 0, 0, 0]
  let n = 0, total = 0, rated = 0, skipped = 0
  for (const c of cells) {
    rated += c.rated; skipped += c.skipped
    const s = c.criteria[criterion]
    if (!s) continue
    s.distribution.forEach((count, i) => { distribution[i] += count; total += count * (i + 1) })
    n += s.n
  }
  return { n, mean: n ? total / n : null, distribution, rated, skipped }
}
const fmt = (mean: number | null) => mean == null ? '—' : mean.toFixed(2)

export default function ComparisonResultsPage() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [data, setData] = useState<ComparisonResults | null>(null)
  const [game, setGame] = useState('all')
  const [level, setLevel] = useState('all')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!token) return
    let active = true
    setBusy(true); setError('')
    surveyRequest<ComparisonResults>(`grid/results/${token}/summary`).then(result => { if (active) setData(result) })
      .catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [token, revision])
  const cells = useMemo(() => (data?.cells || []).filter(c => (game === 'all' || c.game_id === game) && (level === 'all' || c.level === level)), [data, game, level])
  const notes = (data?.notes || []).filter(r => (game === 'all' || r.game_id === game) && (level === 'all' || r.level === level))
  const [criterion, setCriterion] = useState('useful')
  async function download(kind: 'csv' | 'json') {
    try {
      const response = await fetch(`/api/surveys/grid/results/${token}/${kind === 'csv' ? 'export.csv' : 'summary'}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Export failed. Please try again.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = `commentary-grid-responses.${kind}`; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError((e as Error).message) }
  }
  return <SurveyLayout title="Comparison results">
    <section className={styles.progressCard}><span className={styles.eyebrow}>Researcher view · Keep this link private</span><h1>How do readers rate the comments?</h1>
      <p>Mean 1–5 ratings per model, game-rating band and intended explanation level. These are readers’ judgements, not verified chess correctness or learning gains.</p>
      <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={() => setRevision(v => v+1)}>{busy ? 'Refreshing…' : 'Refresh'}</button><button className={styles.button} disabled={!data} onClick={() => void download('csv')}>Download comparison CSV</button><button className={styles.secondary} disabled={!data} onClick={() => void download('json')}>Download full JSON</button></div>
    </section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {data && <>
      <div className={styles.stats}>{[['Started',data.started],['Submitted',data.completed],['In progress',data.in_progress]].map(([label,count]) => <div className={styles.card} key={label}><span className={styles.muted}>{label}</span><strong>{count}</strong></div>)}</div>
      <section className={styles.card}><h2>Filter comparisons</h2><div className={styles.filterRow}>
        <label className={styles.field}>Game rating band<select value={game} onChange={e => setGame(e.target.value)}><option value="all">All ten bands</option>{data.games.map(g => <option key={g.id} value={g.id}>{g.bracket}</option>)}</select></label>
        <label className={styles.field}>Explanation level<select value={level} onChange={e => setLevel(e.target.value)}><option value="all">All levels</option>{data.levels.map(l => <option key={l}>{l}</option>)}</select></label>
      </div><p className={styles.small}>Only submitted responses contribute. Means use rated rounds; skipped rounds are counted separately. Sample sizes count ratings, not independent participants.{data.legacy_reviews ? ` ${data.legacy_reviews} answers from the earlier best/worst questionnaire are excluded.` : ''}</p></section>
      <section className={styles.card}><h2>Mean ratings by model</h2>{!data.completed && <p>No responses yet. Charts will populate from real submissions.</p>}
        {data.models.map(m => <div key={m.id} className={styles.chartRow}><div><strong>{m.label}</strong><div className={styles.small}>{aggregate(cells.filter(c => c.model === m.id), data.criteria[0].id).rated} rated · {aggregate(cells.filter(c => c.model === m.id), data.criteria[0].id).skipped} skipped</div></div>
          <div className={styles.voteBars}>{data.criteria.map(q => { const v = aggregate(cells.filter(c => c.model === m.id), q.id); return <div key={q.id}>
            <span>{q.label}: <strong>{fmt(v.mean)}</strong> <small className={styles.muted}>n = {v.n} · distribution 1–5: {v.distribution.join(' / ')}</small></span>
            <div className={styles.voteTrack}><span className={styles.voteFill} style={{ width: `${v.mean == null ? 0 : 100 * (v.mean - 1) / 4}%` }} /></div></div> })}</div></div>)}
      </section>
      <section className={styles.card}><h2>Model × explanation level</h2>
        <label className={styles.field}>Question<select value={criterion} onChange={e => setCriterion(e.target.value)}>{data.criteria.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}</select></label>
        <div className={styles.matrixScroll}><table className={styles.matrix}><thead><tr><th scope="col">Model</th>{data.levels.map(l => <th scope="col" key={l}>{l}</th>)}</tr></thead><tbody>{data.models.map(m => <tr key={m.id}><th scope="row">{m.label}</th>{data.levels.map(l => { const v = aggregate(data.cells.filter(c => c.model === m.id && c.level === l && (game === 'all' || c.game_id === game)), criterion); return <td key={l} style={v.mean != null ? { backgroundColor: `rgba(122,193,148,${0.06 + 0.3 * (v.mean - 1) / 4})` } : undefined}>{fmt(v.mean)}<small>n = {v.n}</small></td> })}</tr>)}</tbody></table></div>
        <p className={styles.small}>There is one source game per rating band and one selected comparison position per game. Differences between bands are descriptive and cannot establish a general rating effect.</p></section>
      <section className={styles.card}><h2>Round notes</h2>
        {notes.length ? notes.map((r, i) => <blockquote className={styles.quote} key={i}><strong>{r.level} · {data.games.find(g => g.id === r.game_id)?.bracket}</strong><p>{r.text}</p></blockquote>) : <p>No round notes in this selection yet.</p>}
      </section>
      <section className={styles.card}><h2>Overall feedback</h2>{data.feedback.length ? data.feedback.map((text,i) => <blockquote key={i} className={styles.quote}>{text}</blockquote>) : <p>No overall feedback yet.</p>}</section>
      <section className={styles.card}><details><summary>Frozen architecture, sampling and generation record</summary><pre className={styles.provenance}>{JSON.stringify(data.provenance,null,2)}</pre></details></section>
    </>}
  </SurveyLayout>
}
