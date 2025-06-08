import React, { useState, useCallback } from 'react'
import Chart from './Chart'
import PosInfo from './PosInfo'
import DepthControls from './DepthControls'

import { MoveTreeProps } from '@/types/props/MoveTreeProps'
import { Move } from '@/types/chess/Move'

const MoveTree: React.FC<MoveTreeProps> = ({ onClose }) => {
  const [maxDepth, setMaxDepth] = useState(10)
  const [mainNode, setMainNode] = useState<Move | null>(null)
  const [compareNode, setCompareNode] = useState<Move | null>(null)

  const handleClickNode = (node: Move) => {
    if (!mainNode) {
      setMainNode(node)
    } else if (node.id === mainNode.id) {
      setMainNode(null)
      setCompareNode(null)
    } else if (!compareNode) {
      setCompareNode(node)
    } else if (node.id === compareNode.id) {
      setCompareNode(null)
    } else {
      setCompareNode(node)
    }
  }

  const handleCloseAndReset = useCallback(() => {
    setMainNode(null)
    setCompareNode(null)
    onClose()
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Header with controls and close button */}
      <div className="p-2.5 bg-white w-[90%] flex justify-between items-center">
        <button
          className="hvr-shadow rounded-full bg-light-gray px-2"
          onClick={handleCloseAndReset}
        >
          Close Tree
        </button>
      </div>

      {/* Chart and PosInfo container */}
      <div className="flex w-[90%] h-[80%] bg-white overflow-hidden">
        <div className="flex-[3] border-r border-gray-300 overflow-hidden w-[60%]">
          <Chart
            maxDepth={maxDepth}
            onClickNode={handleClickNode}
            mainNode={mainNode}
            compareNode={compareNode}
          />
          <DepthControls maxDepth={maxDepth} setMaxDepth={setMaxDepth} />
        </div>
        <div className="flex-1 p-2.5 overflow-y-auto w-[40%]">
          <PosInfo
            mainNode={mainNode}
            compareNode={compareNode}
            onClose={handleCloseAndReset}
          />
        </div>
      </div>
    </div>
  )
}

export default MoveTree
