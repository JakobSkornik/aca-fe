import React, { useEffect, useState, useMemo } from 'react'
import { CommentsProps } from '@/types/props/CommentsProps'
import { buildSentencesForMoves } from '@/helpers/buildSentencesForMoves'

const transitionDuration = 500 // ms

const Comments: React.FC<CommentsProps> = ({ moveTree, currentMoveIndex }) => {
  // Precompute all sentences for all moves
  const allSentences = useMemo(
    () => buildSentencesForMoves(moveTree),
    [moveTree]
  )

  // Pick the correct set of sentences for the current move index
  const sentences = useMemo(
    () =>
      allSentences[currentMoveIndex] ||
      allSentences[allSentences.length - 1] || [
        'No move selected.',
        'No move selected.',
        'No move selected.',
      ],
    [allSentences, currentMoveIndex]
  )

  const [index, setIndex] = useState(0)
  const [fade, setFade] = useState(true)
  const [shown, setShown] = useState<string[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    setIndex(0)
    setFade(true)
    setShown([])
    setDone(false)
  }, [sentences])

  useEffect(() => {
    if (done) return
    if (index >= sentences.length) {
      setDone(true)
      return
    }
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIndex((prev) => {
          if (prev + 1 < sentences.length) {
            setFade(true)
            return prev + 1
          } else {
            setDone(true)
            return prev
          }
        })
      }, transitionDuration)
    }, 3500)
    return () => clearInterval(interval)
  }, [sentences, index, done])

  // Track which sentences have been shown
  useEffect(() => {
    if (fade && sentences[index] && !shown.includes(sentences[index])) {
      setShown((prev) => [...prev, sentences[index]])
    }
  }, [fade, index, sentences, shown])

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
      {/* Animated/stacked sentences */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'center',
          position: 'relative',
          minHeight: 60,
        }}
      >
        {sentences.map((sentence, i) => {
          // only render up to (and including) the current index
          if (i > index) return null

          return (
            <span
              key={i}
              style={{
                opacity: 1,
                transition: `opacity ${transitionDuration}ms, transform 400ms`,
                transform: `translateY(${(index - i) * 20}px)`,
                fontSize: 18,
                color: i === index ? '#333' : '#666',
                textAlign: 'center',
                marginBottom: 2,
                position: 'relative',
                zIndex: i === index ? 2 : 1,
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
