import React, { useEffect, useMemo, useState } from 'react'
import { useGameState } from '@/contexts/GameStateContext'

const ModelForm: React.FC = () => {
  const { manager, state } = useGameState()
  const current = state.modelParams
  const [model, setModel] = useState<'gpt-5-mini' | 'gpt-5'>(current.model)
  const [effort, setEffort] = useState<'low' | 'medium' | 'high'>(current.effort)
  const [temperature, setTemperature] = useState<number>(current.temperature ?? 0.2)
  const [maxTokens, setMaxTokens] = useState<number>(current.maxTokens ?? 120)

  useEffect(() => {
    setModel(current.model)
    setEffort(current.effort)
    setTemperature(current.temperature ?? 0.2)
    setMaxTokens(current.maxTokens ?? 120)
  }, [current])

  const [justSaved, setJustSaved] = useState<boolean>(false)
  const handleSave = () => {
    manager.setModelParams({ model, effort, temperature, maxTokens })
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1200)
  }

  const activeGen = useMemo(() => {
    // Show the latest active generation timer if any
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
          <label className="block text-xs mb-1">Model</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={model}
            onChange={(e) => setModel(e.target.value as 'gpt-5-mini' | 'gpt-5')}
          >
            <option value="gpt-5-mini">gpt-5-mini</option>
            <option value="gpt-5">gpt-5</option>
          </select>
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

        <div>
          <label className="block text-xs mb-1">Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            className="w-full border rounded px-2 py-1"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Max Tokens</label>
          <input
            type="number"
            min="1"
            className="w-full border rounded px-2 py-1"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
          />
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


