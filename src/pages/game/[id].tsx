import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useGameState } from '@/contexts/GameStateContext'
import { jobService } from '@/services/JobService'
import MainlineChessboard from '@/components/MainlineChessboard'
import MoveList from '@/components/MoveList'
import Comments from '@/components/Comments'
import GameTopBar from '@/components/game/GameTopBar'
import GameBar from '@/components/game/GameBar'
import type { GameJson } from '@/types/GameJson'

const GamePage = () => {
  const router = useRouter()
  const { id } = router.query
  const { manager, state } = useGameState()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const exportGameJson = useCallback(async () => {
    if (!id || typeof id !== 'string') return
    try {
      let body: string
      if (id === 'offline') {
        body = sessionStorage.getItem('aca_offline_export') ?? ''
        if (!body) {
          window.alert('Nothing to export. Reload the game from the home page.')
          return
        }
      } else {
        const gameJson = await jobService.getGameJson(id)
        body = JSON.stringify(gameJson, null, 2)
      }
      const blob = new Blob([body], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = id === 'offline' ? 'game_offline.json' : `game_${id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      window.alert('Failed to export JSON')
    }
  }, [id])

  const exportGamePgn = useCallback(async () => {
    if (!id || typeof id !== 'string') return
    if (id === 'offline') {
      window.alert(
        'PGN export needs the backend; offline games can only export JSON.',
      )
      return
    }
    try {
      const pgn = await jobService.getGamePgn(id)
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `game_${id}.pgn`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      window.alert('Failed to export PGN')
    }
  }, [id])

  useEffect(() => {
    if (!id || typeof id !== 'string') return

    if (id === 'offline') {
      setLoading(true)
      setError(null)
      const raw = sessionStorage.getItem('aca_offline_json')
      if (!raw) {
        setError(
          'No offline game in session. Open the app and load a JSON file again.',
        )
        setLoading(false)
        return
      }
      try {
        const parsed = JSON.parse(raw) as GameJson
        manager.loadGameFromJson(parsed)
        sessionStorage.setItem('aca_offline_export', JSON.stringify(parsed))
        sessionStorage.removeItem('aca_offline_json')
      } catch (e) {
        console.error(e)
        setError('Invalid offline game data')
      } finally {
        setLoading(false)
      }
      return
    }

    const loadGame = async () => {
      try {
        setLoading(true)
        setError(null)
        const gameJson = await jobService.getGameJson(id)
        manager.loadGameFromJson(gameJson)
        if (!gameJson.commentary_complete) {
          manager.connectToJobCommentaryWs(id)
        }
      } catch (e) {
        console.error(e)
        setError('Failed to load game')
      } finally {
        setLoading(false)
      }
    }

    void loadGame()
  }, [id, manager])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-secondary text-text-primary">
        Loading game…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background-secondary px-4 text-center">
        <p className="text-text-danger">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-lg border border-border-secondary bg-background-primary px-4 py-2 text-sm text-text-primary hover:bg-background-secondary"
        >
          Back to home
        </button>
      </div>
    )
  }

  if (!state.isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-secondary text-text-primary">
        Initializing game state…
      </div>
    )
  }

  const jobLabel =
    typeof id === 'string'
      ? id === 'offline'
        ? 'Offline JSON'
        : `Job ${id.slice(0, 8)}…`
      : 'Job'

  return (
    <div className="app flex h-screen min-h-0 min-w-[1024px] flex-col overflow-hidden">
      <GameTopBar
        jobLabel={jobLabel}
        onHome={() => router.push('/')}
        onFlip={() => manager.flipBoard()}
        onExportPgn={() => void exportGamePgn()}
        onExportJson={() => void exportGameJson()}
      />
      <GameBar />

      {/* Split layout: board · commentary · moves. Positional-feature charts
          now live in the variation navigator inside the commentary panel. */}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="ca-split">
          <div style={{ gridArea: 'board' }}>
            <MainlineChessboard />
          </div>
          <div style={{ gridArea: 'comment', minWidth: 0 }}>
            <Comments />
          </div>
          <div style={{ gridArea: 'moves', minWidth: 0 }}>
            <MoveList />
          </div>
        </div>
      </div>
    </div>
  )
}

export default GamePage
