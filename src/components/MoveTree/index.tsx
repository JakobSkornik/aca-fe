import React, { useCallback, useState } from 'react'
import Chart from './Chart'
import PosInfo from './PosInfo'
import DepthControls from './DepthControls'
import { MoveTreeProps } from '@/types/props/MoveTreeProps'
import { MoveAnalysisNode } from '@/types/ws'

const MoveTree: React.FC<MoveTreeProps> = ({ moveTree, onClose }) => {
  const [maxDepth, setMaxDepth] = useState(10)
  const [mainNode, setMainNode] = useState<MoveAnalysisNode | null>(null)
  const [compareNode, setCompareNode] = useState<MoveAnalysisNode | null>(null)

  const handleClickNode = (node: MoveAnalysisNode | null) => {
    if (!node) {
      return
    } else if (!mainNode) {
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

  const handleClose = useCallback(() => {
    setMainNode(null)
    setCompareNode(null)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          width: '95vw',
          height: '90vh',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            overflow: 'visible',
            alignItems: 'center',
          }}
        >
          <button
            className="hvr-shadow"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--dark-gray)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              margin: '0 auto',
            }}
          >
            Move Tree
          </h2>
        </div>
        <div className="flex flex-row gap-2 min-h-0 h-full">
          {/* Chart (80%) */}
          <div className="w-3/4 h-fill overflow-hidden hvr-shadow">
            <Chart
              moveTree={moveTree}
              maxDepth={maxDepth}
              onClickNode={handleClickNode}
              mainNode={mainNode}
              compareNode={compareNode}
            />
            <DepthControls maxDepth={maxDepth} setMaxDepth={setMaxDepth} />
          </div>

          {/* PosInfo (20%) */}
          <div className="w-1/4 h-full">
            {mainNode && (
              <PosInfo
                node={mainNode}
                tree={moveTree}
                compareNode={compareNode}
                onClose={handleClose}
                highlight
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MoveTree
