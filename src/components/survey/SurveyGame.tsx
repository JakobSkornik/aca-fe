import { useEffect, useState, type ReactNode } from 'react'
import MainlineChessboard from '@/components/MainlineChessboard'
import MoveList from '@/components/MoveList'
import Comments, { CommentaryProvider, EvidencePanel } from '@/components/Comments'
import GameBar from '@/components/game/GameBar'
import { useGameState } from '@/contexts/GameStateContext'
import { surveyRequest } from '@/services/SurveyService'
import type { GameJson } from '@/types/GameJson'
import styles from './survey.module.css'

/**
 * Saved game with board, moves, variations and evidence.
 *
 * With `aside` (the comparison survey), the viewer shows the game board with the
 * variation board below it, and `aside` (comments and ratings) in a wider column.
 */
export default function SurveyGame({ token, gameId, onReady, apiPath, sessionToken, initialMoveIndex, aside, tourStep }: {
  token: string; gameId: string; onReady: () => void; apiPath?: string; sessionToken?: string; initialMoveIndex?: number
  aside?: ReactNode
  /** Step of the first-round guide (1 board, 2 evidence, 3 comments, 4 ratings); null when off. */
  tourStep?: number | null
}) {
  const { manager, state } = useGameState()
  const [status, setStatus] = useState('Loading the saved game…')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setStatus('Loading the saved game…')
    surveyRequest<GameJson>(apiPath || `${token}/games/${gameId}`, {}, sessionToken).then(game => {
      if (!active) return
      if (!game.commentary_complete) throw new Error('This game is not ready for the survey.')
      manager.loadGameFromJson(game)
      const first = initialMoveIndex ?? game.moves.findIndex(m => m.comment_kind === 'llm' && m.comment)
      if (first >= 0) manager.goToMove(first)
      setStatus('')
      onReady()
    }).catch(error => { if (active) setStatus(error.message) })
    return () => { active = false }
  }, [token, gameId, manager, attempt, onReady, apiPath, sessionToken, initialMoveIndex])

  if (status) return <div className={styles.card} role="status"><p>{status}</p>
    {!status.startsWith('Loading') && <button className={styles.button} onClick={() => setAttempt(a => a + 1)}>Retry loading</button>}</div>
  if (!state.isLoaded) return null
  if (aside) return <CommentaryProvider>
    <div className={`analysis-workspace ${styles.roundGrid}`} data-tour={tourStep ?? undefined}>
      {/* No move list or game info here: the board's own controls step through the game. */}
      {/* One column: the game board, then the variation board below it (no rule evidence). */}
      <div className="analysis-centre">
        <div className={styles.boardRegion} data-tour-region="1"><MainlineChessboard maxSize={250} compact /></div>
        <div className={styles.variations} data-tour-region="2"><EvidencePanel variationsOnly /></div>
      </div>
      <div className={styles.roundAside} data-tour-region="3">{aside}</div>
    </div>
  </CommentaryProvider>
  return <div className={styles.viewer}>
    <div className={styles.viewerTools}><span>Explore the moves and their comments before answering.</span>
      <button className={styles.secondary} onClick={() => manager.flipBoard()}>Flip board</button>
    </div>
    <CommentaryProvider>
      <div className={`analysis-workspace ${styles.workspace}`}>
        <div className="ca-split">
          <aside className="analysis-moves" aria-label="Game moves"><GameBar /><div className="min-h-0 flex-1"><MoveList /></div></aside>
          <div className="analysis-centre"><MainlineChessboard /><div className="analysis-commentary"><Comments /></div></div>
          <EvidencePanel />
        </div>
      </div>
    </CommentaryProvider>
  </div>
}
