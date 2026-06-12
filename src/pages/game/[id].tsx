import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useGameState } from '@/contexts/GameStateContext'
import { jobService } from '@/services/JobService'
import MainlineChessboard from '@/components/MainlineChessboard'
import MoveList from '@/components/MoveList'
import Comments from '@/components/Comments'
import EvalBar from '@/components/game/EvalBar'
import GameInfoPanel from '@/components/game/GameInfoPanel'
import SummaryPanel from '@/components/game/SummaryPanel'
import LinesPanel from '@/components/game/LinesPanel'
import { VariationPlayerProvider } from '@/contexts/VariationPlayerContext'
import { TopBar } from '@/components/ui/TopBar'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
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
      window.alert('PGN export needs the backend; offline games can only export JSON.')
      return
    }
    try {
      const pgn = await jobService.getGamePgn(id, true)
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
        setError('No offline game in session. Open the app and load a JSON file again.')
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
        if (gameJson.game_narrative == null) {
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

  const subtitle =
    typeof id === 'string' ? (id === 'offline' ? 'Offline JSON' : `Job ${id.slice(0, 8)}…`) : undefined

  return (
    <div className="flex h-screen min-h-0 min-w-[1024px] flex-col overflow-hidden bg-background-secondary">
      <TopBar
        subtitle={subtitle}
        onLogoClick={() => router.push('/')}
        right={
          <>
            <button
              type="button"
              onClick={() => manager.flipBoard()}
              className="rounded-md border border-border-secondary bg-background-primary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-background-secondary"
            >
              Flip board
            </button>
            <button
              type="button"
              onClick={() => void exportGameJson()}
              className="rounded-md border border-border-secondary bg-background-primary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-background-secondary"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => void exportGamePgn()}
              className="rounded-md border border-border-secondary bg-background-primary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-background-secondary"
            >
              Export PGN
            </button>
          </>
        }
      />

      <VariationPlayerProvider>
        <div className="flex min-h-0 flex-1 flex-row gap-3 overflow-hidden p-3">
          {/* Column 1: board + tabs underneath */}
          <div className="flex min-h-0 w-[min(36vw,500px)] shrink-0 flex-col gap-3">
            <Card
              title="Board"
              headerClassName="!px-2.5 !py-1.5"
              titleClassName="!text-[11px]"
              className="flex w-full shrink-0 flex-col overflow-hidden"
              bodyClassName="flex flex-col items-center gap-1.5 px-1.5 pb-1.5 pt-1"
            >
              <MainlineChessboard />
              <div className="w-full max-w-[460px] px-1">
                <EvalBar />
              </div>
            </Card>

            <Card
              showHeader={false}
              className="flex min-h-[160px] min-h-0 flex-1 flex-col overflow-hidden"
              bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
            >
              <Tabs
                className="h-full"
                tabs={[
                  { key: 'info', label: 'Game info', content: <GameInfoPanel /> },
                  { key: 'summary', label: 'Summary', content: <SummaryPanel /> },
                  { key: 'lines', label: 'Lines', content: <LinesPanel /> },
                ]}
              />
            </Card>
          </div>

          {/* Column 2: move list, full height */}
          <Card
            title="Moves"
            headerClassName="!px-2.5 !py-1.5"
            titleClassName="!text-[11px]"
            className="flex min-h-0 w-[min(24vw,340px)] shrink-0 flex-col overflow-hidden"
            bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
          >
            <MoveList />
          </Card>

          {/* Column 3: commentary (narrower by construction) */}
          <Card
            title="Commentary"
            headerClassName="!px-2.5 !py-1.5"
            titleClassName="!text-[11px]"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
          >
            <Comments />
          </Card>
        </div>
      </VariationPlayerProvider>
    </div>
  )
}

export default GamePage
