import React, { useRef, useEffect } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import CommentItem from './CommentItem'

const Comments: React.FC = () => {
  const { state, manager } = useGameState()
  const { commentsMainline, commentsPreview, previewMode, previewMoves, currentMoveIndex, previewMoveIndex } = state
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Ref for the current comment element to scroll to
  const activeCommentRef = useRef<HTMLDivElement>(null)

  // Current move ID for highlighting
  const currentMove = previewMode ? previewMoves.getMoveAtIndex(previewMoveIndex) : manager.getMainlineMove(currentMoveIndex)
  const currentMoveId = currentMove?.id

  // Auto-scroll to active comment when move changes
  useEffect(() => {
    if (activeCommentRef.current && containerRef.current) {
      // Use scrollIntoView with smooth behavior and centered block for better context
      activeCommentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start', // Changed from 'nearest' to 'start' to show from beginning
      })
    }
  }, [currentMoveId])

  // Get comments to display
  const displayedComments = previewMode ? commentsPreview : commentsMainline

  return (
    <div className="flex flex-col h-full bg-lightest-gray">
      <div className="p-2 bg-light-gray border-b border-gray-300 font-semibold text-darkest-gray flex justify-between items-center shadow-sm z-10">
        <span>Analysis Commentary</span>
        <span className="text-xs font-normal text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
          {displayedComments.length} comments
        </span>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {displayedComments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 italic">
            <span className="text-4xl mb-2">💬</span>
            <p>No commentary available for this game.</p>
          </div>
        ) : (
          displayedComments.map((item) => {
            const isActive = item.moveId === currentMoveId
            
            // Get move notation for header
            let moveNotation = ''
            if (previewMode) {
               const move = previewMoves.moves.find(m => m.move?.id === item.moveId)?.move
               moveNotation = move?.move || ''
            } else {
               // Use helper function directly if method is not exposed yet
               const moveIdx = manager.findMoveIndexById(item.moveId)
               const move = manager.getMainlineMove(moveIdx)
               moveNotation = move?.move || ''
            }

            return (
              <div 
                key={`${item.moveId}-${item.moveIndex}`}
                ref={isActive ? activeCommentRef : null}
                className={`transition-all duration-300 ${isActive ? 'scale-[1.02] transform origin-left' : ''}`}
              >
                <CommentItem
                  title={`Move ${Math.floor(item.moveIndex / 2) + 1}${item.moveIndex % 2 === 0 ? '.' : '...'} ${moveNotation}`}
                  text={item.text}
                  isActive={isActive}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Comments