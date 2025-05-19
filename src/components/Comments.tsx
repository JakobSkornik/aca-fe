import React, { useEffect, useState } from 'react'
import { CommentsProps } from '@/types/props/CommentsProps'
import { buildComments } from '@/helpers/commentator'

const transitionDuration = 500 // ms
const revealInterval = 2300 // ms between each comment reveal

const Comments: React.FC<CommentsProps> = ({moveTree, currentMoveIndex }) => {
  // Prepare sentences
  const allSentences = React.useMemo(() => buildComments(moveTree), [moveTree])
  const sentences: string[] = React.useMemo(() => {
    return (
      allSentences[currentMoveIndex] ||
      allSentences[allSentences.length - 1] || ['No move selected.']
    )
  }, [allSentences, currentMoveIndex])

  // Animation state for each sentence
  const [shown, setShown] = useState<boolean[]>([])

  // Reset on move change
  useEffect(() => {
    setShown([])
  }, [sentences])

  // Sequentially reveal each comment
  useEffect(() => {
    if (sentences.length === 0) return
    let curr = 1 // Start at 1, because first is revealed immediately
    const timeouts: number[] = []

    // Show the first sentence instantly
    setShown(
      Array(sentences.length)
        .fill(false)
        .map((_, i) => i === 0)
    )

    const showNext = () => {
      setShown((prev) => {
        const copy = prev.slice()
        copy[curr] = true
        return copy
      })
      curr++
      if (curr < sentences.length) {
        timeouts.push(window.setTimeout(showNext, revealInterval))
      }
    }

    if (sentences.length > 1) {
      // Only set timeout if more than one sentence
      timeouts.push(window.setTimeout(showNext, revealInterval))
    }

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [sentences])

  return (
    <div
      style={{
        minHeight: 40,
        marginTop: 24,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Container for stacking sentences */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'center',
          position: 'relative',
          minHeight: 60,
          width: '100%',
          overflow: 'visible',
        }}
      >
        {sentences.map((sentence, i) => {
          const isVisible = shown[i]
          const aboveCount = sentences.length - 1 - i
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                  ? `translateY(${aboveCount * 32}px)`
                  : `translateY(0px)`,
                transition: `opacity ${transitionDuration}ms, transform ${transitionDuration}ms`,
                fontSize: 18,
                color: '#333',
                textAlign: 'center',
                marginBottom: 2,
                zIndex: 10 - i,
                pointerEvents: 'none',
                // Stack sentences downward
              }}
            >
              {sentence}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default Comments
