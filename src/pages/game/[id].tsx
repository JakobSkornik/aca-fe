import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useGameState } from '@/contexts/GameStateContext'
import { jobService } from '@/services/JobService'
import MainlineChessboard from '@/components/MainlineChessboard'
import GameSummaryPanel from '@/components/GameSummaryPanel'
import MoveList from '@/components/MoveList'
import Comments from '@/components/Comments'
import OpeningMetadataCard from '@/components/game/OpeningMetadataCard'
import EvaluationPanel from '@/components/game/EvaluationPanel'
import { TopBar } from '@/components/ui/TopBar'
import { Card } from '@/components/ui/Card'
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
          </>
        }
      />

      {/*
        xl: 3-column grid — bottom row: Moves spans board+engine columns; Commentary aligns with Game summary.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <div
          className="grid min-h-0 flex-1 gap-3
            grid-cols-1
            xl:grid-cols-[minmax(0,min(28vw,440px))_minmax(0,min(22vw,360px))_minmax(0,1fr)]
            xl:grid-rows-[minmax(300px,min(52vh,480px))_minmax(152px,1fr)]"
        >
          <div className="flex min-h-0 justify-center overflow-hidden xl:col-start-1 xl:row-start-1">
            <Card
              title="Board"
              headerClassName="!px-2.5 !py-1.5"
              titleClassName="!text-[11px]"
              className="flex w-full max-w-[440px] flex-col overflow-hidden"
              bodyClassName="flex justify-center px-1.5 pb-1.5 pt-1"
            >
              <MainlineChessboard />
            </Card>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden xl:col-start-2 xl:row-start-1">
            <div className="min-h-[140px] shrink-0">
              <OpeningMetadataCard />
            </div>
            <div className="flex min-h-[160px] min-h-0 flex-1 flex-col overflow-hidden">
              <EvaluationPanel />
            </div>
          </div>

          <div className="min-h-[200px] min-w-0 overflow-hidden xl:col-start-3 xl:row-start-1">
            <GameSummaryPanel />
          </div>

          <Card
            title="Moves"
            headerClassName="!px-2.5 !py-1.5"
            titleClassName="!text-[11px]"
            className="flex min-h-[min(17vh,220px)] shrink-0 flex-col overflow-hidden max-xl:min-h-[128px] xl:col-span-2 xl:row-start-2 xl:h-full xl:min-h-0 xl:min-w-0"
            bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
          >
            <MoveList />
          </Card>

          <Card
            title="Commentary"
            headerClassName="!px-2.5 !py-1.5"
            titleClassName="!text-[11px]"
            className="flex min-h-[128px] shrink-0 flex-col overflow-hidden xl:col-start-3 xl:row-start-2 xl:h-full xl:min-h-0 xl:min-w-0"
            bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
          >
            <Comments />
          </Card>
        </div>
      </div>
    </div>
  )
}

export default GamePage
