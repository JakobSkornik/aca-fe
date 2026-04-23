import React, { useEffect, useMemo, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'

const ModelForm: React.FC = () => {
  const { manager, state } = useGameState()
  const current = state.modelParams
  const [provider, setProvider] = useState<'openai' | 'anthropic'>(current.provider)
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>(current.effort)

  useEffect(() => {
    setProvider(current.provider)
    setEffort(current.effort)
  }, [current])

  const [justSaved, setJustSaved] = useState<boolean>(false)
  const handleSave = () => {
    manager.setModelParams({ provider, effort })
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1200)
  }

  const activeGen = useMemo(() => {
    const keys = Object.keys(state.aiGeneration)
    if (keys.length === 0) return null
    const lastKey = Number(keys[keys.length - 1])
    return { moveId: lastKey, ...state.aiGeneration[lastKey] }
  }, [state.aiGeneration])

  const [now, setNow] = useState<number>(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [])

  const durationSec = activeGen ? Math.max(0, Math.round(now / 1000 - activeGen.startedAt)) : 0

  return (
    <div className="h-full w-full p-2 text-sm overflow-y-auto">
      <div className="font-bold mb-2">AI Model Settings</div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1">LLM provider</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
          <p className="mt-1 text-[10px] leading-snug text-gray-600">
            Anthropic: Haiku 4.5 for per-move, Sonnet 4.5 for digest + narrative (fixed server-side).
          </p>
        </div>

        <div>
          <label className="block text-xs mb-1">Reasoning Effort</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={effort}
            onChange={(e) => setEffort(e.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 rounded-md text-white bg-darkest-gray hvr-shadow hover:bg-dark-gray text-sm"
            onClick={handleSave}
          >
            Save
          </button>
          {justSaved && (
            <span className="text-green-600 text-sm" aria-label="Saved">✓</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="font-bold mb-1">AI Generation</div>
        {!activeGen && <div className="text-xs text-gray-600">Idle</div>}
        {activeGen && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
            <div className="text-xs text-gray-700">Move {activeGen.moveId} • {durationSec}s • {activeGen.model} • {activeGen.effort}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelForm
