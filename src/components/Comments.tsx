import React, { useEffect, useState, useRef } from 'react'
import { useGameState } from '@/contexts/GameStateContext'
import { generateComments, Comment } from '@/helpers/commentator/commentGenerator'
import { Move } from '@/types/chess/Move'

const initialDelay = 500 // Delay before starting typewriter
const typewriterSpeed = 25 // ms per character
const sentenceDelay = 500 // Delay between sentences

// Piece mapper for move display
const pieceMapper = {
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔'
}

interface CommentHistoryItem {
  id: string
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
  const { currentMoveIndex, previewMode, previewMoveIndex, previewMoves, isLoaded } = state
  const containerRef = useRef<HTMLDivElement>(null)

  // Comment history state
  const [commentHistory, setCommentHistory] = useState<CommentHistoryItem[]>([])
  const [lastProcessedMoveKey, setLastProcessedMoveKey] = useState<string>('')

  // Create a key to track when moves change
  const currentMoveKey = `${currentMoveIndex}-${previewMode}-${previewMoveIndex}`

  // Format move with piece symbol (e.g., "♟f4")
  const formatMoveWithPiece = (move: any): string => {
    if (!move.move || !move.piece) return move.move || ''
    
    const piece = move.piece.toLowerCase()
    const pieceSymbol = pieceMapper[piece as keyof typeof pieceMapper] || piece
    const destination = move.move.slice(2) // Extract destination from move string
    
    return `${pieceSymbol}${destination}`
  }

  // Generate title for a move
  const generateMoveTitle = (moveIndex: number, move: any): string => {
    const moveNumber = Math.floor(moveIndex / 2) + 1
    const isWhite = moveIndex % 2 === 0
    
    if (isWhite) {
      return `${moveNumber}. ${formatMoveWithPiece(move)}`
    } else {
      return `${moveNumber}... ${formatMoveWithPiece(move)}`
    }
  }

  // Process new comments when move changes
  useEffect(() => {
    if (currentMoveKey === lastProcessedMoveKey) return

    const currentMove = manager.getCurrentMove()
    if (!currentMove) return

    // Check if we already have a comment for this move key
    const existingComment = commentHistory.find(item => 
      item.id.startsWith(currentMoveKey.split('-')[0]) // Match the move key part (without timestamp)
    )

    if (existingComment) {      
      // Mark the comment as complete if it wasn't already
      if (!existingComment.isComplete) {
        setCommentHistory(prev => 
          prev.map(item => 
            item.id === existingComment.id 
              ? { ...item, isComplete: true, displayedText: item.text, isAnimating: false }
              : item
          )
        )
      }
      
      setLastProcessedMoveKey(currentMoveKey)
      return
    }

    // Get previous move based on mode
    let previousMove: Move | null = null
    if (previewMode) {
      // In preview mode, previous move is the mainline move at currentMoveIndex
      previousMove = manager.getMainlineMove(currentMoveIndex)
    } else {
      // In normal mode, previous move is the mainline move at currentMoveIndex - 1
      previousMove = currentMoveIndex > 0 ? manager.getMainlineMove(currentMoveIndex - 1) : null
    }

    // Get PV moves based on mode
    let pv1Moves: Move[] = []
    let pv2Moves: Move[] = []
    
    if (previewMode) {
      // In preview mode, get PV moves from preview moves
      pv1Moves = previewMoves.getPv1(previewMoveIndex) || []
      pv2Moves = previewMoves.getPv2(previewMoveIndex) || []
    } else {
      // In normal mode, get PV moves from mainline moves
      pv1Moves = manager.getPv1(currentMoveIndex) || []
      pv2Moves = manager.getPv2(currentMoveIndex) || []
    }

    // Determine if this is a white move
    const isWhiteMove = currentMoveIndex % 2 === 0

    // Generate comments
    const commentContext = {
      currentMove,
      previousMove,
      moveIndex: currentMoveIndex,
      pv1Moves,
      pv2Moves,
      isWhiteMove
    }

    const comments: Comment[] = generateComments(commentContext)
    const commentTexts = comments.map(comment => comment.text)

    if (commentTexts.length === 0) return

    // Create new comment history item with unique timestamp-based ID
    const timestamp = Date.now()
    const newCommentItem: CommentHistoryItem = {
      id: `${currentMoveKey}-${timestamp}`,
      title: generateMoveTitle(currentMoveIndex, currentMove),
      text: commentTexts.join('\n'),
      isMainline: !previewMode,
      isComplete: false,
      displayedText: '',
      isAnimating: false,
      timestamp
    }

    // Add to history
    setCommentHistory(prev => [...prev, newCommentItem])
    setLastProcessedMoveKey(currentMoveKey)
  }, [currentMoveKey, lastProcessedMoveKey, manager, currentMoveIndex, previewMode, previewMoveIndex, commentHistory])

  // Animate the latest comment
  useEffect(() => {
    if (commentHistory.length === 0) return

    const latestComment = commentHistory[commentHistory.length - 1]
    if (latestComment.isComplete) return

    const timeouts: number[] = []
    let charIndex = 0
    let displayText = ''

    const startAnimation = () => {
      setCommentHistory(prev => 
        prev.map(item => 
          item.id === latestComment.id 
            ? { ...item, isAnimating: true }
            : item
        )
      )
      animateNextCharacter()
    }

    const animateNextCharacter = () => {
      if (charIndex >= latestComment.text.length) {
        setCommentHistory(prev => 
          prev.map(item => 
            item.id === latestComment.id 
              ? { ...item, isComplete: true, isAnimating: false }
              : item
          )
        )
        return
      }

      displayText += latestComment.text[charIndex]
      
      setCommentHistory(prev => 
        prev.map(item => 
          item.id === latestComment.id 
            ? { ...item, displayedText: displayText }
            : item
        )
      )

      charIndex++
      timeouts.push(window.setTimeout(animateNextCharacter, typewriterSpeed))
    }

    // Start animation after initial delay
    timeouts.push(window.setTimeout(startAnimation, initialDelay))

    // Cleanup timeouts on unmount or dependency change
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [commentHistory.length])

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [commentHistory])

  // Trigger comment generation when game is first loaded
  useEffect(() => {
    if (isLoaded && currentMoveIndex === 0 && commentHistory.length === 0) {
      // Force a comment generation for the first move
      setLastProcessedMoveKey('') // Reset to trigger comment generation
    }
  }, [isLoaded, currentMoveIndex, commentHistory.length])

  // Filter comments based on preview mode
  const displayedComments = previewMode 
    ? commentHistory 
    : commentHistory.filter(item => item.isMainline)

  return (
    <div className="p-4 border-t z-10">
      <div 
        ref={containerRef}
        className="text-sm text-gray-700 whitespace-pre-wrap min-h-[60px] max-h-[200px] overflow-y-auto"
      >
        {displayedComments.map((item, index) => (
          <div 
            key={item.id}
            className={`mb-2 pb-2 ${index < displayedComments.length - 1 ? 'border-b border-gray-200' : ''} ${
              !item.isMainline ? 'bg-gray-100 p-2 rounded' : ''
            }`}
          >
            <div className="font-bold text-gray-800 mb-1">
              {item.title}
            </div>
            <div className="text-gray-700">
              {item.displayedText}
              {item.isAnimating && <span className="animate-pulse">|</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Comments
