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

function aggregate(cells: ComparisonCell[]) {
  return cells.reduce((sum, c) => ({ ranked: sum.ranked+c.ranked, best: sum.best+c.best, worst: sum.worst+c.worst,
    similar: sum.similar+c.similar, cannot_judge: sum.cannot_judge+c.cannot_judge, skipped: sum.skipped+c.skipped }),
  { ranked: 0, best: 0, worst: 0, similar: 0, cannot_judge: 0, skipped: 0 })
}
const percent = (count: number, total: number) => total ? `${(100*count/total).toFixed(1)}%` : '—'

export default function ComparisonResultsPage() {
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [data, setData] = useState<ComparisonResults | null>(null)
  const [game, setGame] = useState('all')
  const [level, setLevel] = useState('all')
  const [model, setModel] = useState('all')
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
  const reasons = (data?.reasons || []).filter(r => (game === 'all' || r.game_id === game) && (level === 'all' || r.level === level) && (model === 'all' || r.model === model))
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
    <section className={styles.progressCard}><span className={styles.eyebrow}>Researcher view · Keep this link private</span><h1>Which comments do readers prefer?</h1>
      <p>Compare subjective best/worst choices across models, game-rating bands, and intended explanation levels. These are preferences, not verified chess correctness or learning gains.</p>
      <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={() => setRevision(v => v+1)}>{busy ? 'Refreshing…' : 'Refresh'}</button><button className={styles.button} disabled={!data} onClick={() => void download('csv')}>Download comparison CSV</button><button className={styles.secondary} disabled={!data} onClick={() => void download('json')}>Download full JSON</button></div>
    </section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {data && <>
      <div className={styles.stats}>{[['Started',data.started],['Submitted',data.completed],['In progress',data.in_progress]].map(([label,count]) => <div className={styles.card} key={label}><span className={styles.muted}>{label}</span><strong>{count}</strong></div>)}</div>
      <section className={styles.card}><h2>Filter comparisons</h2><div className={styles.filterRow}>
        <label className={styles.field}>Game rating band<select value={game} onChange={e => setGame(e.target.value)}><option value="all">All ten bands</option>{data.games.map(g => <option key={g.id} value={g.id}>{g.bracket}</option>)}</select></label>
        <label className={styles.field}>Explanation level<select value={level} onChange={e => setLevel(e.target.value)}><option value="all">All levels</option>{data.levels.map(l => <option key={l}>{l}</option>)}</select></label>
      </div><p className={styles.small}>Only submitted responses contribute. Percentages use rounds where a participant selected distinct best and worst comments. Similar, unjudged, and skipped rounds are counted separately. Sample sizes count judgments, not independent participants.</p></section>
      <section className={styles.card}><h2>Best and worst choice rates</h2>{!data.completed && <p>No responses yet. Charts will populate from real submissions.</p>}
        {data.models.map(m => { const values = aggregate(cells.filter(c => c.model === m.id)); return <div key={m.id} className={styles.chartRow}><div><strong>{m.label}</strong><div className={styles.small}>n = {values.ranked} ranked rounds</div></div><div className={styles.voteBars}>
          <span>Best: {percent(values.best, values.ranked)} ({values.best})</span><div className={styles.voteTrack}><span className={styles.voteFill} style={{ width: `${values.ranked ? 100*values.best/values.ranked : 0}%` }} /></div>
          <span>Worst: {percent(values.worst, values.ranked)} ({values.worst})</span><div className={styles.voteTrack}><span className={`${styles.voteFill} ${styles.voteWorst}`} style={{ width: `${values.ranked ? 100*values.worst/values.ranked : 0}%` }} /></div>
          <small className={styles.muted}>{values.similar} similar · {values.cannot_judge} cannot judge · {values.skipped} skipped</small>
        </div></div> })}
      </section>
      <section className={styles.card}><h2>Model × explanation level</h2><p className={styles.muted}>Best-choice rates for the selected game-rating band. This matrix always shows all three levels.</p><div className={styles.matrixScroll}><table className={styles.matrix}><thead><tr><th scope="col">Model</th>{data.levels.map(l => <th scope="col" key={l}>{l}</th>)}</tr></thead><tbody>{data.models.map(m => <tr key={m.id}><th scope="row">{m.label}</th>{data.levels.map(l => { const v=aggregate(data.cells.filter(c => c.model===m.id && c.level===l && (game==='all' || c.game_id===game))); return <td key={l} style={v.ranked ? { backgroundColor: `rgba(122,193,148,${0.06+0.3*v.best/v.ranked})` } : undefined}>{percent(v.best,v.ranked)} best<small>{percent(v.worst,v.ranked)} worst · n = {v.ranked}</small></td> })}</tr>)}</tbody></table></div>
        <p className={styles.small}>There is one source game per rating band and one selected comparison position per game. Differences between bands are descriptive and cannot establish a general rating effect.</p></section>
      <section className={styles.card}><h2>Why readers chose each comment</h2><label className={styles.field}>Filter explanations by model<select value={model} onChange={e => setModel(e.target.value)}><option value="all">All models</option>{data.models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        {reasons.length ? reasons.map((r,i) => <blockquote className={styles.quote} key={i}><strong>{data.models.find(m => m.id===r.model)?.label} · {r.choice} · {r.level} · {data.games.find(g => g.id===r.game_id)?.bracket}</strong><p>{r.text}</p></blockquote>) : <p>No written choices in this selection yet.</p>}
      </section>
      <section className={styles.card}><h2>Overall feedback</h2>{data.feedback.length ? data.feedback.map((text,i) => <blockquote key={i} className={styles.quote}>{text}</blockquote>) : <p>No overall feedback yet.</p>}</section>
      <section className={styles.card}><details><summary>Frozen architecture, sampling and generation record</summary><pre className={styles.provenance}>{JSON.stringify(data.provenance,null,2)}</pre></details></section>
    </>}
  </SurveyLayout>
}
