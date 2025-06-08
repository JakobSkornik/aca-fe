import React, { useEffect, useMemo, useState } from 'react'
import { buildComments } from '@/helpers/commentator'
import { useGameState } from '@/contexts/GameStateContext'
import { 
  analyzeMoveAgainstPVs, 
  generateNonBestMoveComments, 
  generateBestMoveComments 
} from '@/helpers/commentator/keyMoments'

const initialDelay = 1500 // Delay before starting typewriter
const typewriterSpeed = 25 // ms per character
const sentenceDelay = 500 // Delay between sentences

const Comments: React.FC = () => {
  const { gameState, updateMoveAnnotations } = useGameState()
  const {
    moves,
    movePvs,
    currentMoveIndex,
    previewMode,
    previewMoves,
    previewMovePvs,
  } = gameState

  // Use preview data if in preview mode
  const activeMoves = previewMode ? previewMoves : moves
  const activePvs = previewMode ? previewMovePvs : movePvs
  const activeIndex = currentMoveIndex

  // Prepare sentences and annotations using the sophisticated keyMoments logic
  const { allSentences, annotations } = useMemo(() => {
    const sentences = buildComments(activeMoves, activePvs)
    const moveAnnotations: Record<number, string> = {}

    // Use the sophisticated annotation logic from keyMoments
    activeMoves.forEach((move, index) => {
      if (move.isAnalyzed && move.score !== undefined && index > 0) {
        const prevMove = activeMoves[index - 1]
        const isCurrentMoveByWhite = index % 2 === 1 // Odd indices are white moves
        const prevMovePvs = activePvs[index - 1] // PVs from the previous position

        if (prevMove?.isAnalyzed && prevMove.score !== undefined && prevMovePvs) {
          // Use the sophisticated analysis from keyMoments
          const analyzedContext = analyzeMoveAgainstPVs(
            prevMove,
            move,
            isCurrentMoveByWhite,
            prevMovePvs
          )

          // Generate comments and get annotation
          let result
          if (analyzedContext.playedMoveIsConsideredBest) {
            result = generateBestMoveComments({
              currentMove: move,
              prevMove: prevMove,
              isCurrentMoveByWhite,
              analyzedContext,
            })
          } else {
            // Calculate the normalized score change for non-best moves
            const scoreBefore = prevMove.score ?? 0
            const scoreAfter = move.score ?? 0
            const normChange = isCurrentMoveByWhite 
              ? scoreAfter - scoreBefore  // White wants higher scores
              : scoreBefore - scoreAfter  // Black wants lower scores

            result = generateNonBestMoveComments({
              normChange,
              currentMove: move,
              analyzedContext,
              isCurrentMoveByWhite,
            })
          }

          // Extract annotation if present
          if (result.annotation) {
            moveAnnotations[index] = result.annotation
          }
        }
      }
    })

    return { allSentences: sentences, annotations: moveAnnotations }
  }, [activeMoves, activePvs])

  // Update annotations in the game context
  useEffect(() => {
    if (!previewMode && Object.keys(annotations).length > 0) {
      // Check if any annotations actually need to be updated
      const needsUpdate = Object.entries(annotations).some(
        ([index, annotation]) => {
          const moveIndex = parseInt(index)
          return activeMoves[moveIndex]?.annotation !== annotation
        }
      )

      if (needsUpdate) {
        // Update moves with annotations
        const updatedMoves = activeMoves.map((move, index) => ({
          ...move,
          annotation: annotations[index] || move.annotation,
        }))

        if (updateMoveAnnotations) {
          updateMoveAnnotations(updatedMoves)
        }
      }
    }
  }, [activeMoves, annotations, previewMode, updateMoveAnnotations])

  const sentences: string[] = useMemo(() => {
    // buildComments returns string[][], so we need to get the array at activeIndex
    if (activeIndex >= 0 && activeIndex < allSentences.length) {
      const commentsForMove = allSentences[activeIndex]
      return Array.isArray(commentsForMove)
        ? commentsForMove
        : ['No comments available.']
    }
    // Fallback: if index is out of bounds, show empty or default
    return ['No move selected.']
  }, [allSentences, activeIndex])

  // Typewriter animation state
  const [displayedText, setDisplayedText] = useState<string>('')
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  // Reset animation when move changes
  useEffect(() => {
    setDisplayedText('')
    setIsAnimating(false)
  }, [sentences, previewMode, activeIndex])

  // Typewriter animation effect
  useEffect(() => {
    if (sentences.length === 0) return

    const timeouts: number[] = []
    let sentenceIndex = 0
    let charIndex = 0
    let displayText = ''

    const startAnimation = () => {
      setIsAnimating(true)
      animateNextCharacter()
    }

    const animateNextCharacter = () => {
      if (sentenceIndex >= sentences.length) {
        setIsAnimating(false)
        return
      }

      const currentSentence = sentences[sentenceIndex]

      if (charIndex < currentSentence.length) {
        // Add next character
        const lines = displayText.split('\n')
        const lastLineIndex = lines.length - 1
        lines[lastLineIndex] =
          (lines[lastLineIndex] || '') + currentSentence[charIndex]
        displayText = lines.join('\n')

        setDisplayedText(displayText)

        charIndex++
        timeouts.push(window.setTimeout(animateNextCharacter, typewriterSpeed))
      } else {
        // Finished current sentence, move to next
        if (sentenceIndex + 1 < sentences.length) {
          displayText += '\n'
          setDisplayedText(displayText)
          sentenceIndex++
          charIndex = 0
          timeouts.push(window.setTimeout(animateNextCharacter, sentenceDelay))
        } else {
          setIsAnimating(false)
        }
      }
    }

    // Start animation after initial delay
    timeouts.push(window.setTimeout(startAnimation, initialDelay))

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [sentences]) // Only depend on sentences, not the index states

  return (
    <div className="min-h-10 w-full mt-6 w-full flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="text-lg text-gray-800 text-center leading-relaxed whitespace-pre-line line-wrap">
          {displayedText}
          {isAnimating && (
            <span className="animate-pulse text-gray-400">|</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default Comments
