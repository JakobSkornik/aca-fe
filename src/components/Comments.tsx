import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { Move } from '@/types/chess/Move'
import CommentItem from './CommentItem'

const initialDelay = 500 // Delay before starting typewriter
const typewriterSpeed = 25 // ms per character

// Piece mapper for move display
const pieceMapper = {
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔'
}

interface CommentHistoryItem {
  id: string
  moveId: number
  title: string
  text: string
  isMainline: boolean
  isComplete: boolean
  displayedText: string
  isAnimating: boolean
  timestamp: number
}

const Comments: React.FC = () => {
  const { state, manager } = useGameState()
  const { currentMoveIndex, previewMode, previewMoveIndex, previewMoves, commentsMainline, commentsPreview } = state
  const containerRef = useRef<HTMLDivElement>(null)
  const uniqueSeqRef = useRef<number>(0)

  // Comment history state
  const [commentHistory, setCommentHistory] = useState<CommentHistoryItem[]>([])
  // Removed unused lastProcessedMoveKey and currentMoveKey

  // Format move with piece symbol (e.g., "♟f4")
  const formatMoveWithPiece = useCallback((move: Move): string => {
    if (!move.move || !move.piece) return move.move || ''

    const piece = move.piece.toLowerCase()
    const pieceSymbol = pieceMapper[piece as keyof typeof pieceMapper] || piece
    const destination = move.move.slice(2) // Extract destination from move string

    return `${pieceSymbol}${destination}`
  }, [])

  // Generate title for a move
  const generateMoveTitle = useCallback((moveIndex: number, move: Move): string => {
    const moveNumber = Math.floor(moveIndex / 2) + 1
    const isWhite = moveIndex % 2 === 0

    if (isWhite) {
      return `${moveNumber}. ${formatMoveWithPiece(move)}`
    } else {
      return `${moveNumber}... ${formatMoveWithPiece(move)}`
    }
  }, [formatMoveWithPiece])

  // Sync backend comments into local animated history
  useEffect(() => {
    const backendComments = previewMode ? commentsPreview : commentsMainline
    if (!backendComments) return

    setCommentHistory(prev => {
      const seenMoveIds = new Set(prev.map(p => p.moveId))
      const seenInThisBatch = new Set<number>()
      const additions: CommentHistoryItem[] = []

      backendComments.forEach(item => {
        if (seenMoveIds.has(item.moveId) || seenInThisBatch.has(item.moveId)) {
          return
        }
        const move: Move | null = previewMode
          ? previewMoves.getMoveAtIndex(item.moveIndex)
          : manager.getMainlineMove(item.moveIndex)
        if (!move) return
        const timestamp = Date.now()
        uniqueSeqRef.current += 1
        additions.push({
          id: `${item.moveId}-${timestamp}-${uniqueSeqRef.current}`,
          moveId: item.moveId,
          title: generateMoveTitle(item.moveIndex, move),
          text: item.text,
          isMainline: !previewMode,
          isComplete: false,
          displayedText: '',
          isAnimating: false,
          timestamp
        })
        seenInThisBatch.add(item.moveId)
      })

      return additions.length > 0 ? [...prev, ...additions] : prev
    })
  }, [commentsMainline, commentsPreview, previewMode, manager, previewMoves, generateMoveTitle])

  // Remove component-level animation (moved into CommentItem)

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [commentHistory])

  // Initial load behavior handled by backend comments syncing

  // Filter comments based on preview mode
  const displayedComments = previewMode
    ? commentHistory.filter(item => !item.isMainline)
    : commentHistory.filter(item => item.isMainline)

  // Determine which comment corresponds to the current move
  const getCurrentCommentIndex = () => {
    if (displayedComments.length === 0) return -1

    // Find the comment that matches the current move
    // We need to match based on the move index in the title
    const currentMoveNumber = previewMode ? previewMoveIndex : currentMoveIndex

    for (let i = 0; i < displayedComments.length; i++) {
      const comment = displayedComments[i]
      const title = comment.title.toLowerCase()

      // Check if this comment corresponds to the current move
      // Look for move numbers in the title (e.g., "1. e4", "2... Nf6")
      const moveMatch = title.match(/(\d+)\.?\s*\.\.\.?\s*[a-h]?[1-8]?[x]?[a-h][1-8]/)
      if (moveMatch) {
        const moveNumber = parseInt(moveMatch[1])
        if (moveNumber === currentMoveNumber + 1) {
          return i
        }
      }
    }

    // If no exact match, return the last comment as fallback
    return displayedComments.length - 1
  }

  const currentCommentIndex = getCurrentCommentIndex()

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        className="text-sm text-gray-700 whitespace-pre-wrap flex-1 overflow-y-auto p-4"
      >
        {displayedComments.map((item, index) => {
          const isSelected = index === currentCommentIndex
          return (
            <CommentItem
              key={item.id}
              id={item.id}
              title={item.title}
              text={item.text}
              highlighted={isSelected}
              initialDelay={initialDelay}
              typewriterSpeed={typewriterSpeed}
              finalizeIfNotHighlighted={true}
              className={`mb-2 pb-2 transition-all duration-200 rounded-md ${index < displayedComments.length - 1 ? 'border-b border-gray-200' : ''
                } ${!item.isMainline ? 'bg-gray-100 p-2 rounded' : ''
                } ${isSelected ? 'selected-shadow p-4' : ''
                }`}
              titleClassName={`${isSelected ? 'font-bold mb-1 text-base' : 'font-bold mb-1 text-gray-800'}`}
              textClassName={`${isSelected ? 'text-base' : 'text-gray-700'}`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default Comments
