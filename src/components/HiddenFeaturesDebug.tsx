import React from 'react'
import { useGameState } from '@/contexts/GameStateContext'

type Props = {
  visible: boolean
}

const HiddenFeaturesDebug: React.FC<Props> = ({ visible }) => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, previewMode, previewMoveIndex } = state
  const move = previewMode
    ? manager.getCurrentMove()
    : manager.getMainlineMove(currentMoveIndex)

  if (!visible) return null
  const hf = move?.hiddenFeatures as unknown as Record<string, unknown> | undefined
  return (
    <pre className="text-xs text-gray-500 whitespace-pre-wrap break-words p-2 border rounded bg-gray-50 max-h-64 overflow-auto">
      {hf ? JSON.stringify(hf, null, 2) : 'No hidden features available.'}
    </pre>
  )
}

export default HiddenFeaturesDebug


